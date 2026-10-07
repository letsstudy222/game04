// Swimming controller: angular speeds use radians/second, while mouse input
// remains a displacement. Small physics steps keep terrain contact stable.
import { CONFIG, cruiseFor } from '../config.js';
import { buildCreature, animateCreature } from './fishMesh.js';
import { currentAt, currentFactorAtDepth } from '../world/currents.js';
import * as THREE from 'three';

const MAX_PITCH = Math.PI / 3;
const PHYSICS_STEP = 1 / 120;
const _dir = new THREE.Vector3();
const _desiredVel = new THREE.Vector3();
const _previousVel = new THREE.Vector3();
const _displacement = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _back = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const damp = (rate, dt) => -Math.expm1(-rate * dt);
const axis = (positive, negative) => Number(positive) - Number(negative);

export class Player {
  constructor(species, camera, input, startPos) {
    this.species = species;
    this.camera = camera;
    this.input = input;
    this.mesh = buildCreature(species, Math.random(), 'high');
    this.mesh._lod = 0;
    this.mesh.position.copy(startPos);
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.vel = new THREE.Vector3();
    this._flow = new THREE.Vector3();
    this._yawVel = 0;
    this._pitchVel = 0;
    this.camLock = false;
    this.camLockYaw = 0;
    this.camLockPitch = 0;
    this.camYaw = 0;
    this.camPitch = 0;
    this.cruise = cruiseFor(species) * 1.3;
    const L = species.length;
    this.agility = THREE.MathUtils.clamp(14 / Math.pow(L, 0.55), 2.8, 14);
    this.maxTurn = THREE.MathUtils.clamp(3.4 / Math.pow(L, 0.34), 0.55, 6);
    this.thrustLag = THREE.MathUtils.clamp(7.5 / Math.pow(L, 0.42), 1.8, 7.5);
    this.coastDrag = THREE.MathUtils.clamp(1.1 / Math.pow(L, 0.22), 0.45, 1.4);
    this.bankAmount = THREE.MathUtils.clamp(0.28 + L * 0.02, 0.28, 0.62);
    this.clearance = Math.max(0.12, L * 0.18);
    this.camDist = 2.05 * Math.pow(L, 0.72) + 1.15;
    this.camHigh = 0.42 * Math.pow(L, 0.72) + 0.28;
    this.baseFov = camera.fov;
    this.camZoom = 1;
    this._zoomTarget = 1;
    this.firstPerson = false;
    this._cameraTarget = startPos.clone();
    this._getFloorY = null;
    this._updateCamera(1, true);
  }

  toggleFirstPerson() {
    this.firstPerson = !this.firstPerson;
    this.mesh.visible = !this.firstPerson;
    this._updateCamera(1, true);
    return this.firstPerson;
  }

  update(dt, getFloorY) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // A suspended tab cannot deliver a giant catch-up step.
    dt = Math.min(dt, 0.1);
    this._getFloorY = getFloorY;
    const inp = this.input;
    const wh = inp.consumeWheel?.() || 0;
    this._zoomTarget = THREE.MathUtils.clamp(this._zoomTarget * Math.exp(wh * 0.0011), 0.25, 3);
    this.camZoom += (this._zoomTarget - this.camZoom) * damp(9, dt);

    const [mdx, mdy] = inp.consumeMouse();
    const yawKeys = axis(inp.down('KeyA') || inp.down('ArrowLeft'), inp.down('KeyD') || inp.down('ArrowRight'));
    const pitchKeys = axis(inp.down('ArrowUp'), inp.down('ArrowDown'));
    const yawRate = THREE.MathUtils.clamp(yawKeys * CONFIG.player.turnSpeed - mdx * 0.0016 / dt, -this.maxTurn, this.maxTurn);
    const pitchRate = THREE.MathUtils.clamp(pitchKeys * CONFIG.player.turnSpeed * 0.7 - mdy * 0.0016 / dt, -this.maxTurn * 0.7, this.maxTurn * 0.7);
    const forward = axis(inp.down('KeyW'), inp.down('KeyS'));
    const vertical = axis(inp.down('Space'), inp.down('ControlLeft') || inp.down('ControlRight') || inp.down('KeyC'));
    const boost = forward > 0 && (inp.down('ShiftLeft') || inp.down('ShiftRight')) ? CONFIG.player.boostMultiplier : 1;
    const steps = Math.max(1, Math.ceil(dt / PHYSICS_STEP - 1e-9));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) this._move(step, yawRate, pitchRate, forward, vertical, boost, getFloorY);

    const speed01 = THREE.MathUtils.clamp(this.vel.length() / this.cruise, 0, 1);
    // Three's +X rotation points a +Z-facing body down; swimming pitch is up.
    _e.set(-this.pitch, this.yaw, this.roll, 'YXZ');
    _q.setFromEuler(_e);
    this.mesh.quaternion.slerp(_q, damp(5 + this.agility * 0.5, dt));
    animateCreature(this.mesh, dt, Math.max(0.15, speed01));
    const targetFov = this.baseFov + speed01 * 5;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov += (targetFov - this.camera.fov) * damp(2.5, dt);
      this.camera.updateProjectionMatrix();
    }
    this._updateCamera(dt, false);
  }

  _move(dt, yawRate, pitchRate, forward, vertical, boost, getFloorY) {
    const turn = damp(this.agility, dt);
    // Integrate the exponentially smoothed rate exactly, including release.
    this.yaw += yawRate * dt + (this._yawVel - yawRate) * turn / this.agility;
    this.pitch += pitchRate * dt + (this._pitchVel - pitchRate) * turn / this.agility;
    this._yawVel += (yawRate - this._yawVel) * turn;
    this._pitchVel += (pitchRate - this._pitchVel) * turn;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -MAX_PITCH, MAX_PITCH);
    if ((this.pitch >= MAX_PITCH && this._pitchVel > 0) || (this.pitch <= -MAX_PITCH && this._pitchVel < 0)) this._pitchVel = 0;
    _dir.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));

    let rate = this.coastDrag;
    _desiredVel.set(0, 0, 0);
    if (forward || vertical) {
      // S first brakes forward momentum, then engages a slower reverse.
      const braking = forward < 0 && this.vel.dot(_dir) > this.cruise * 0.08;
      const thrust = braking ? 0 : forward * (forward < 0 ? 0.4 : 1);
      _desiredVel.copy(_dir).multiplyScalar(thrust);
      _desiredVel.y += vertical * 0.65;
      // W + Space cannot exceed the intended swim speed diagonally.
      if (_desiredVel.lengthSq() > 1) _desiredVel.normalize();
      _desiredVel.multiplyScalar(this.cruise * boost);
      rate = this.thrustLag * (braking ? 2.8 : 1);
    }

    const pos = this.mesh.position;
    const backY = this.species.length * 0.12;
    const maxY = backY * 0.55;
    const floor = getFloorY(pos.x, pos.z);
    // Look ahead along travel and gently lift over rising seafloor. Explicit
    // descent remains under the player's control until actual floor contact.
    if (forward > 0 && vertical >= 0) {
      const lookTime = 0.35;
      const aheadFloor = getFloorY(pos.x + _desiredVel.x * lookTime, pos.z + _desiredVel.z * lookTime);
      if (aheadFloor > floor && aheadFloor + this.clearance < maxY) {
        const lift = (aheadFloor + this.clearance + this.cruise * 0.08 - pos.y) / lookTime;
        _desiredVel.y = Math.max(_desiredVel.y, Math.min(this.cruise * 0.55, lift));
        _desiredVel.clampLength(0, this.cruise * boost);
      }
    }
    // Buoyancy resistance eases in near the waterline, using a rate rather
    // than a fixed multiplier per frame (the old surface drag depended on FPS).
    if (_desiredVel.y > 0 && pos.y > -backY) {
      const immersion = THREE.MathUtils.clamp((maxY - pos.y) / Math.max(backY + maxY, 0.01), 0, 1);
      _desiredVel.y *= immersion;
    }
    _previousVel.copy(this.vel);
    const accel = damp(rate, dt);
    this.vel.lerp(_desiredVel, accel);
    // Exact displacement during acceleration/coasting rather than end-speed Euler.
    _displacement.copy(_previousVel).sub(_desiredVel).multiplyScalar(accel / rate).addScaledVector(_desiredVel, dt);

    const cur = currentAt(pos.x, pos.z);
    this.current = cur.strength > 0.02 ? cur.name : null;
    this.currentStrength = cur.strength;
    const f = currentFactorAtDepth(pos.y);
    _desiredVel.set(cur.vx * f, 0, cur.vz * f);
    this._flow.lerp(_desiredVel, damp(3, dt));
    this.currentVec = this._flow.lengthSq() > 0.0001 ? { x: this._flow.x, z: this._flow.z } : null;
    _displacement.addScaledVector(this._flow, dt);

    const nextX = pos.x + _displacement.x, nextZ = pos.z + _displacement.z;
    const nextFloor = getFloorY(nextX, nextZ);
    if (nextFloor + this.clearance <= maxY) {
      pos.x = nextX;
      pos.z = nextZ;
    } else {
      // At shore, slide along an available axis instead of climbing onto land.
      if (getFloorY(nextX, pos.z) + this.clearance <= maxY) pos.x = nextX;
      else this.vel.x = 0;
      if (getFloorY(pos.x, nextZ) + this.clearance <= maxY) pos.z = nextZ;
      else this.vel.z = 0;
    }
    pos.y += _displacement.y;
    const minY = Math.min(maxY, getFloorY(pos.x, pos.z) + this.clearance);
    if (pos.y < minY) { pos.y = minY; this.vel.y = Math.max(0, this.vel.y); }
    if (pos.y > maxY) { pos.y = maxY; this.vel.y = Math.min(0, this.vel.y); }
    this.atSurface = pos.y > -backY * 1.6;
    // Integrate banking with physics, so low FPS does not exaggerate lean.
    const speed01 = Math.min(1, this.vel.length() / this.cruise);
    const targetRoll = -THREE.MathUtils.clamp(this._yawVel / this.maxTurn, -1, 1)
      * this.bankAmount * Math.min(1, speed01 * 1.5);
    this.roll += (targetRoll - this.roll) * damp(3 + this.agility * 0.25, dt);
  }

  _updateCamera(dt, instant) {
    const pos = this.mesh.position;
    const L = this.species.length;
    if (this.firstPerson) {
      _dir.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
      this.camera.position.copy(pos).addScaledVector(_dir, L * 0.46);
      this.camera.position.y += L * 0.04;
      if (this._getFloorY) this.camera.position.y = Math.max(this.camera.position.y,
        this._getFloorY(this.camera.position.x, this.camera.position.z) + 0.12);
      _camTarget.copy(this.camera.position).addScaledVector(_dir, L * 4 + 10);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(_camTarget);
      return;
    }
    const chase = instant ? 1 : damp(6, dt);
    if (this.camLock) {
      this.camYaw = this.camLockYaw;
      this.camPitch = this.camLockPitch;
    } else {
      const dYaw = Math.atan2(Math.sin(this.yaw - this.camYaw), Math.cos(this.yaw - this.camYaw));
      this.camYaw += dYaw * chase;
      this.camPitch += (this.pitch * 0.6 - this.camPitch) * chase;
    }
    _back.set(-Math.sin(this.camYaw) * Math.cos(this.camPitch),
      -Math.sin(this.camPitch) + 0.28, -Math.cos(this.camYaw) * Math.cos(this.camPitch)).normalize();
    _desiredCamPos.copy(pos).addScaledVector(_back, this.camDist * this.camZoom);
    _desiredCamPos.y += this.camHigh * this.camZoom;
    // Predict a little of travel to reduce camera drag without jerking on boost.
    _desiredCamPos.addScaledVector(this.vel, 0.12);
    if (this._getFloorY) {
      const cameraClearance = Math.max(0.18, L * 0.025);
      // Shorten the boom when the seafloor occludes the fish.
      for (let i = 1; i <= 8; i++) {
        _probe.copy(pos).lerp(_desiredCamPos, i / 8);
        if (_probe.y < this._getFloorY(_probe.x, _probe.z) + cameraClearance) {
          _desiredCamPos.copy(pos).lerp(_desiredCamPos, (i - 1) / 8);
          break;
        }
      }
    }
    if (instant) this.camera.position.copy(_desiredCamPos);
    else this.camera.position.lerp(_desiredCamPos, damp(8, dt));
    if (this._getFloorY) this.camera.position.y = Math.max(this.camera.position.y,
      this._getFloorY(this.camera.position.x, this.camera.position.z) + Math.max(0.18, L * 0.025));
    _camTarget.copy(pos);
    if (!this.camLock) {
      _dir.set(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
      _camTarget.addScaledVector(_dir, Math.min(L * 0.6 + 0.8, this.camDist * 0.7));
      _camTarget.addScaledVector(this.vel, 0.16);
    }
    if (instant) this._cameraTarget.copy(_camTarget);
    else this._cameraTarget.lerp(_camTarget, damp(10, dt));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this._cameraTarget);
  }

  toggleCamLock() {
    this.camLock = !this.camLock;
    if (this.camLock) { this.camLockYaw = this.camYaw; this.camLockPitch = this.camPitch; }
    return this.camLock;
  }

  idleAnimate(dt) { animateCreature(this.mesh, dt, 0.25); }
  get position() { return this.mesh.position; }
}
