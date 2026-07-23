// player.js — ABZÛ-style swimming. Designed against motion sickness:
//   1. Roll comes from TURN RATE, not raw mouse delta, and always self-levels.
//   2. Pitch is clamped to ±60° so "up" never becomes ambiguous.
//   3. The camera lags behind the fish (spring damping) instead of snapping.
//   4. Camera pitch is softened (60% of body pitch) to keep a stable horizon.
//   5. Low drag + quick acceleration so the fish feels responsive, not soupy.

import { CONFIG, cruiseFor } from '../config.js';
import { buildCreature, animateCreature } from './fishMesh.js';
import * as THREE from 'three';

const MAX_PITCH = Math.PI / 3;          // 60°
const _dir = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

export class Player {
  constructor(species, camera, input, startPos) {
    this.species = species;
    this.camera = camera;
    this.input = input;

    this.mesh = buildCreature(species, Math.random(), 'high');
    this.mesh._lod = 0;                 // the one you are looking at is never reduced
    this.mesh.position.copy(startPos);

    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.vel = new THREE.Vector3();

    // smoothed look input — removes mouse jitter, the #1 nausea source
    this._yawVel = 0;
    this._pitchVel = 0;

    // camera state (lags the body)
    this.camYaw = 0;
    this.camPitch = 0;

    this.cruise = cruiseFor(species) * 1.3;

    // --- Mass-based handling -------------------------------------------
    // A 28 m whale should not pivot like a 9 cm clownfish. Three quantities
    // scale with body length so large animals feel like they carry momentum:
    //   agility  — how quickly turn input is taken up and shed (inertia)
    //   maxTurn  — hard ceiling on angular velocity
    //   thrustLag— how slowly speed builds and bleeds off
    const L = species.length;
    this.agility = THREE.MathUtils.clamp(14 / Math.pow(L, 0.55), 2.0, 14);
    this.maxTurn = THREE.MathUtils.clamp(3.4 / Math.pow(L, 0.34), 0.55, 6.0);
    this.thrustLag = THREE.MathUtils.clamp(7.5 / Math.pow(L, 0.42), 1.1, 7.5);
    this.bankAmount = THREE.MathUtils.clamp(0.28 + L * 0.02, 0.28, 0.62);
    // Sub-linear camera pull-back (length^0.72). Large animals deliberately
    // overflow the frame — that overflow IS the feeling of size. Linear
    // scaling would give every species an identical screen footprint.
    this.camDist = 2.05 * Math.pow(species.length, 0.72) + 1.15;
    this.camHigh = 0.42 * Math.pow(species.length, 0.72) + 0.28;
    this.baseFov = camera.fov;
    // Scroll-wheel zoom multiplier on the follow distance, and an eye-level
    // first-person mode. Both are remembered per species instance.
    this.camZoom = 1;
    this.firstPerson = false;

    this._updateCamera(1, true);
  }

  toggleFirstPerson() {
    this.firstPerson = !this.firstPerson;
    // Hide the body: from inside the head you would otherwise see back faces.
    this.mesh.visible = !this.firstPerson;
    this._updateCamera(1, true);
    return this.firstPerson;
  }

  update(dt, getFloorY) {
    const inp = this.input;

    // --- scroll wheel pulls the camera in and out ---
    const wh = inp.consumeWheel ? inp.consumeWheel() : 0;
    if (wh) {
      this.camZoom = THREE.MathUtils.clamp(
        this.camZoom * Math.exp(wh * 0.0011), 0.25, 3.0);
    }

    // ---- look input: mouse + keys, both fed through the same smoother ----
    const [mdx, mdy] = inp.consumeMouse();
    const sens = 0.0016;
    let yawInput = -mdx * sens / Math.max(dt, 0.001) * 0.016;
    let pitchInput = -mdy * sens / Math.max(dt, 0.001) * 0.016;

    const kTurn = CONFIG.player.turnSpeed;
    if (inp.down('KeyA') || inp.down('ArrowLeft')) yawInput += kTurn * dt;
    if (inp.down('KeyD') || inp.down('ArrowRight')) yawInput -= kTurn * dt;
    if (inp.down('ArrowUp')) pitchInput += kTurn * dt * 0.7;
    if (inp.down('ArrowDown')) pitchInput -= kTurn * dt * 0.7;

    // Critically-damped smoothing. The rate is the animal's agility, so a
    // whale takes roughly a second to commit to a turn and just as long to
    // come out of it, while a small fish responds almost instantly.
    const smooth = 1 - Math.exp(-this.agility * dt);
    this._yawVel += (yawInput - this._yawVel) * smooth;
    this._pitchVel += (pitchInput - this._pitchVel) * smooth;

    // cap angular velocity — big bodies simply cannot rotate quickly
    const cap = this.maxTurn * dt;
    this._yawVel = THREE.MathUtils.clamp(this._yawVel, -cap, cap);
    this._pitchVel = THREE.MathUtils.clamp(this._pitchVel, -cap * 0.7, cap * 0.7);

    this.yaw += this._yawVel;
    this.pitch = THREE.MathUtils.clamp(this.pitch + this._pitchVel, -MAX_PITCH, MAX_PITCH);

    // heading vector
    _dir.set(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    // ---- thrust ----
    const boost = (inp.down('ShiftLeft') || inp.down('ShiftRight')) ? CONFIG.player.boostMultiplier : 1;
    let speed = 0;
    if (inp.down('KeyW')) speed = this.cruise * boost;
    else if (inp.down('KeyS')) speed = -this.cruise * 0.45;

    const desiredVel = _dir.clone().multiplyScalar(speed);
    if (inp.down('Space')) desiredVel.y += this.cruise * 0.65;
    if (inp.down('ControlLeft') || inp.down('KeyC')) desiredVel.y -= this.cruise * 0.65;

    // Acceleration and coasting scale with mass: a whale takes time to get
    // going and then glides a long way; a clownfish starts and stops at once.
    const accel = 1 - Math.exp(-this.thrustLag * dt);
    this.vel.lerp(desiredVel, accel);
    if (speed === 0 && !inp.down('Space') && !inp.down('KeyC')) {
      const drag = 0.7 * Math.min(1, 2.4 / Math.pow(this.species.length, 0.4));
      this.vel.multiplyScalar(1 - Math.min(0.6, dt * drag));
    }

    this.mesh.position.addScaledVector(this.vel, dt);

    // ---- water column limits (soft, no hard stop) ----
    const floor = getFloorY(this.mesh.position.x, this.mesh.position.z);
    const minY = floor + this.species.length * 0.7;
    if (this.mesh.position.y < minY) {
      this.mesh.position.y += (minY - this.mesh.position.y) * Math.min(1, dt * 8);
      if (this.vel.y < 0) this.vel.y *= 0.3;
    }
    // Surface: a whale, dolphin or turtle must be able to reach the top and
    // break the water, so the old hard ceiling at -0.4 body lengths is gone.
    // The body may rise until its back is just proud of the surface; drag
    // increases sharply in the last body-depth so it feels like breaking out.
    const backY = this.species.length * 0.12;      // half body depth, roughly
    const maxY = backY * 0.55;                     // back clears the waterline
    if (this.mesh.position.y > -backY) {
      const over = (this.mesh.position.y + backY) / (maxY + backY);
      if (this.vel.y > 0) this.vel.y *= (1 - Math.min(0.85, over * 0.9));
    }
    if (this.mesh.position.y > maxY) {
      // Firm ceiling. A soft pull alone lost the race against upward thrust,
      // letting the body climb past the limit it was meant to hold.
      this.mesh.position.y = maxY;
      if (this.vel.y > 0) this.vel.y = 0;
    }
    this.atSurface = this.mesh.position.y > -backY * 1.6;

    // ---- banking: driven by TURN RATE, auto-levels to 0 ----
    const rollGain = 9 * (this.bankAmount / 0.45);
    const targetRoll = THREE.MathUtils.clamp(this._yawVel * rollGain, -this.bankAmount, this.bankAmount);
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * (1.2 + this.agility * 0.2));

    _e.set(this.pitch, this.yaw, this.roll, 'YXZ');
    _q.setFromEuler(_e);
    this.mesh.quaternion.slerp(_q, Math.min(1, dt * (2.5 + this.agility * 0.5)));

    const speed01 = THREE.MathUtils.clamp(this.vel.length() / this.cruise, 0.15, 1);
    animateCreature(this.mesh, dt, speed01);

    // Speed-reactive FOV: subtle, but it sells momentum on big animals.
    const targetFov = this.baseFov + speed01 * 7;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 2.5);
      this.camera.updateProjectionMatrix();
    }

    this._updateCamera(dt, false);
  }

  _updateCamera(dt, instant) {
    if (this.firstPerson) {
      // Sit at the animal's eye, looking where it looks.
      const L = this.species.length;
      const fwd = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch)
      ).normalize();
      this.camera.position.copy(this.mesh.position)
        .addScaledVector(fwd, L * 0.46)
        .add(new THREE.Vector3(0, L * 0.04, 0));
      _camTarget.copy(this.camera.position).addScaledVector(fwd, L * 4 + 10);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(_camTarget);
      return;
    }

    // Camera angles chase the body with a lag -> stable horizon, no whip.
    const chase = instant ? 1 : 1 - Math.exp(-5 * dt);
    let dYaw = this.yaw - this.camYaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    this.camYaw += dYaw * chase;
    // only 60% of body pitch -> horizon stays much steadier
    this.camPitch += (this.pitch * 0.6 - this.camPitch) * chase;

    const back = new THREE.Vector3(
      -Math.sin(this.camYaw) * Math.cos(this.camPitch),
      -Math.sin(this.camPitch) + 0.28,
      -Math.cos(this.camYaw) * Math.cos(this.camPitch)
    ).normalize();

    _desiredCamPos.copy(this.mesh.position)
      .addScaledVector(back, this.camDist * this.camZoom)
      .add(new THREE.Vector3(0, this.camHigh * this.camZoom, 0));

    if (instant) this.camera.position.copy(_desiredCamPos);
    else this.camera.position.lerp(_desiredCamPos, 1 - Math.exp(-7 * dt));

    // look slightly ahead of the fish
    _camTarget.copy(this.mesh.position).addScaledVector(
      _dir.set(Math.sin(this.yaw), Math.sin(this.pitch) * 0.5, Math.cos(this.yaw)),
      this.species.length * 1.6 + 2.5
    );
    this.camera.up.set(0, 1, 0);          // never roll the camera -> no nausea
    this.camera.lookAt(_camTarget);
  }

  idleAnimate(dt) { animateCreature(this.mesh, dt, 0.25); }

  get position() { return this.mesh.position; }
}
