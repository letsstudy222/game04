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

    this.mesh = buildCreature(species);
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
    // Sub-linear camera pull-back (length^0.72). Large animals deliberately
    // overflow the frame — that overflow IS the feeling of size. Linear
    // scaling would give every species an identical screen footprint.
    this.camDist = 2.05 * Math.pow(species.length, 0.72) + 1.15;
    this.camHigh = 0.42 * Math.pow(species.length, 0.72) + 0.28;
    this.baseFov = camera.fov;

    this._updateCamera(1, true);
  }

  update(dt, getFloorY) {
    const inp = this.input;

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

    // critically-damped smoothing: sharp response, no jitter, no overshoot
    const smooth = 1 - Math.exp(-12 * dt);
    this._yawVel += (yawInput - this._yawVel) * smooth;
    this._pitchVel += (pitchInput - this._pitchVel) * smooth;

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

    // snappy acceleration, gentle glide when you let go (no "molasses" feel)
    const accel = 1 - Math.exp(-6 * dt);
    this.vel.lerp(desiredVel, accel);
    if (speed === 0 && !inp.down('Space') && !inp.down('KeyC')) {
      this.vel.multiplyScalar(1 - Math.min(0.6, dt * 0.7));   // slow coast
    }

    this.mesh.position.addScaledVector(this.vel, dt);

    // ---- water column limits (soft, no hard stop) ----
    const floor = getFloorY(this.mesh.position.x, this.mesh.position.z);
    const minY = floor + this.species.length * 0.7;
    if (this.mesh.position.y < minY) {
      this.mesh.position.y += (minY - this.mesh.position.y) * Math.min(1, dt * 8);
      if (this.vel.y < 0) this.vel.y *= 0.3;
    }
    const maxY = -this.species.length * 0.4;
    if (this.mesh.position.y > maxY) {
      this.mesh.position.y += (maxY - this.mesh.position.y) * Math.min(1, dt * 8);
      if (this.vel.y > 0) this.vel.y *= 0.3;
    }

    // ---- banking: driven by TURN RATE, auto-levels to 0 ----
    const targetRoll = THREE.MathUtils.clamp(this._yawVel * 9, -0.45, 0.45);
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 3.5);

    _e.set(this.pitch, this.yaw, this.roll, 'YXZ');
    _q.setFromEuler(_e);
    this.mesh.quaternion.slerp(_q, Math.min(1, dt * 9));

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
      .addScaledVector(back, this.camDist)
      .add(new THREE.Vector3(0, this.camHigh, 0));

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
