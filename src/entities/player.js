// player.js — The fish you control + a smooth 3rd-person follow camera.

import * as THREE from 'three';
import { CONFIG, cruiseFor } from '../config.js';
import { buildCreature, animateCreature } from './fishMesh.js';

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

    this.yaw = 0;         // heading (radians)
    this.pitch = 0;       // up/down look
    this.roll = 0;        // visual bank
    this.vel = new THREE.Vector3();

    // per-species tuning
    this.cruise = cruiseFor(species) * 1.3;   // player slightly faster than NPCs
    // camera frames the fish proportionally to its real size (tiny fish -> close)
    this.camDist = species.length * 3 + 0.5;
    this.camHigh = species.length * 1.1 + 0.2;

    // place camera immediately
    this._updateCamera(1, true);
  }

  update(dt, getFloorY) {
    const inp = this.input;

    // --- look ---
    const [mdx, mdy] = inp.consumeMouse();
    const lookRate = 0.0022;
    this.yaw -= mdx * lookRate;
    this.pitch -= mdy * lookRate;
    // keyboard turning (works without pointer lock)
    const turn = CONFIG.player.turnSpeed * dt;
    if (inp.down('KeyA') || inp.down('ArrowLeft')) this.yaw += turn;
    if (inp.down('KeyD') || inp.down('ArrowRight')) this.yaw -= turn;
    if (inp.down('ArrowUp')) this.pitch += turn * 0.7;
    if (inp.down('ArrowDown')) this.pitch -= turn * 0.7;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.35, 1.35);

    // heading direction from yaw/pitch
    _dir.set(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    // --- thrust ---
    let speed = 0;
    const boost = inp.down('ShiftLeft') || inp.down('ShiftRight') ? CONFIG.player.boostMultiplier : 1;
    if (inp.down('KeyW')) speed = this.cruise * boost;
    else if (inp.down('KeyS')) speed = -this.cruise * 0.4;

    const desiredVel = _dir.clone().multiplyScalar(speed);
    // vertical assist
    if (inp.down('Space')) desiredVel.y += this.cruise * 0.6;
    if (inp.down('ControlLeft') || inp.down('KeyC')) desiredVel.y -= this.cruise * 0.6;

    // smooth accelerate + water drag
    this.vel.lerp(desiredVel, Math.min(1, dt * 2.2));
    this.vel.multiplyScalar(1 - Math.min(0.9, dt * 0.8)); // drag when idle

    this.mesh.position.addScaledVector(this.vel, dt);

    // --- keep within water column ---
    const floor = getFloorY(this.mesh.position.x, this.mesh.position.z);
    const minY = floor + this.species.length * 0.7;
    if (this.mesh.position.y < minY) { this.mesh.position.y = minY; if (this.vel.y < 0) this.vel.y = 0; }
    const maxY = -this.species.length * 0.4;
    if (this.mesh.position.y > maxY) { this.mesh.position.y = maxY; if (this.vel.y > 0) this.vel.y = 0; }

    // --- orient mesh to heading with bank ---
    const targetRoll = THREE.MathUtils.clamp((mdx || 0) * -0.02, -0.5, 0.5);
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 4);
    _e.set(this.pitch, this.yaw, this.roll, 'YXZ');
    _q.setFromEuler(_e);
    this.mesh.quaternion.slerp(_q, Math.min(1, dt * 6));

    // swim animation scales with speed
    const speed01 = THREE.MathUtils.clamp(this.vel.length() / this.cruise, 0.15, 1);
    animateCreature(this.mesh, dt, speed01);

    this._updateCamera(dt, false);
  }

  _updateCamera(dt, instant) {
    // camera sits behind & above the fish along its heading
    const back = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      -Math.sin(this.pitch) * 0.5 + 0.25,
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
    _desiredCamPos.copy(this.mesh.position)
      .addScaledVector(back, this.camDist)
      .add(new THREE.Vector3(0, this.camHigh, 0));

    if (instant) this.camera.position.copy(_desiredCamPos);
    else this.camera.position.lerp(_desiredCamPos, Math.min(1, dt * 3.5));

    _camTarget.copy(this.mesh.position).addScaledVector(_dir.set(
      Math.sin(this.yaw), Math.sin(this.pitch) * 0.4, Math.cos(this.yaw)
    ), this.species.length * 1.5 + 2);
    this.camera.lookAt(_camTarget);
  }

  // Gentle idle swim animation without input (used by photo mode).
  idleAnimate(dt) {
    animateCreature(this.mesh, dt, 0.25);
  }

  get position() { return this.mesh.position; }
}
