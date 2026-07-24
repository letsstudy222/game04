// baitball.js — A feeding frenzy: thousands of small fish balled up, and the
// predators tearing through them.
//
// This is the most spectacular thing that happens in the open ocean and it
// reads from a long way off — a dark churning sphere with shapes cutting
// through it. You are a spectator; nothing here can hurt you.
//
// The behaviour that makes it look right is not the swirling, it is the
// REACTION. Bait fish do not orbit placidly while something eats them: the ball
// opens a cavity around each attacker and closes again behind it. That single
// rule is what turns a rotating sphere of fish into a feeding frenzy.
//
// Cost is two draw calls no matter the numbers, by reusing the instancing the
// migrating shoals are built on.

import * as THREE from 'three';
import { bakeSpecies, tickSchoolClock } from './school.js';

const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _Z = new THREE.Vector3(0, 0, 1);

/**
 * A bait fish, at the only fidelity that matters here.
 *
 * A ball of 520 fish built from the real reef-fry mesh came to 183k triangles —
 * as much as the entire rest of the scene — to draw bodies that are a few
 * pixels across. What actually reads at that range is a glinting sliver with a
 * forked tail, so that is all this is: ten triangles, countershaded through
 * vertex colours so the ball still catches the light from above.
 */
function baitGeometry() {
  const L = 0.5, H = 0.13, W = 0.05;
  const v = [
     0,    0,    L,      // snout
     W,    0,    0,      // right flank
    -W,    0,    0,      // left flank
     0,    H,   -0.05,   // dorsal
     0,   -H * 0.8, -0.05, // ventral
     0,    H * 1.5, -L,  // upper tail lobe
     0,   -H * 1.5, -L,  // lower tail lobe
     0,    0,   -L * 0.45, // tail root
  ];
  const idx = [
    0, 1, 3, 0, 3, 2, 0, 2, 4, 0, 4, 1,   // head cone
    1, 7, 3, 3, 7, 2, 2, 7, 4, 4, 7, 1,   // body to tail root
    7, 5, 3, 7, 6, 4,                     // tail lobes
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  const col = new Float32Array((v.length / 3) * 3);
  const top = new THREE.Color(0x2e4a5e), belly = new THREE.Color(0xcfe4ee);
  const c = new THREE.Color();
  for (let i = 0; i < v.length / 3; i++) {
    const k = THREE.MathUtils.clamp(v[i * 3 + 1] / H * 0.5 + 0.5, 0, 1);
    c.copy(belly).lerp(top, k);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

let _baitGeo = null;

function instancedBait(count, scale) {
  if (!_baitGeo) _baitGeo = baitGeometry();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.42, metalness: 0.22,
  });
  const mesh = new THREE.InstancedMesh(_baitGeo, mat, count);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return { mesh, scale, tris: _baitGeo.index.count / 3 };
}

function instanced(speciesId, count, scale) {
  const baked = bakeSpecies(speciesId);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.55, metalness: 0.08,
  });
  const mesh = new THREE.InstancedMesh(baked.geo, mat, count);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return { mesh, scale, tris: baked.tris };
}

export class BaitBall {
  /**
   * @param {THREE.Vector3} center where the frenzy sits
   * @param {number} baitCount fish in the ball
   * @param {number} predCount attackers circling it
   */
  constructor(center, baitCount = 520, predCount = 6, predSpecies = 'bluefin_tuna') {
    this.center = center.clone();
    this.baitCount = baitCount;
    this.predCount = predCount;
    this.radius = 7.5;
    this.age = 0;
    this.life = 150 + Math.random() * 90;

    // Bait fish are reef fry geometry blown up to sardine size — a 5 cm fish
    // would be invisible at the range this is meant to be seen from.
    this.bait = instancedBait(baitCount, 1.6);
    this.pred = instanced(predSpecies, predCount, 1.0);

    // Each bait fish keeps a fixed place on the shell and drifts around it, so
    // the ball holds its shape instead of dissolving.
    this.fish = [];
    for (let i = 0; i < baitCount; i++) {
      // even-ish distribution over a sphere
      const u = (i + 0.5) / baitCount;
      const phi = Math.acos(1 - 2 * u);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      this.fish.push({
        phi, theta,
        r: 0.55 + Math.random() * 0.45,        // fraction of the ball radius
        spin: 0.35 + Math.random() * 0.35,
        wob: Math.random() * Math.PI * 2,
        push: new THREE.Vector3(),             // displacement from attackers
      });
    }

    // Predators run at the ball, punch through, and loop back out.
    this.preds = [];
    for (let i = 0; i < predCount; i++) {
      this.preds.push({
        t: Math.random(),
        period: 7 + Math.random() * 5,
        axis: new THREE.Vector3(
          Math.random() - 0.5, (Math.random() - 0.5) * 0.5, Math.random() - 0.5).normalize(),
        pos: new THREE.Vector3(),
        prev: new THREE.Vector3(),
      });
    }
    this.update(0, 0);
  }

  get meshes() { return [this.bait.mesh, this.pred.mesh]; }

  update(dt, time) {
    this.age += dt;
    tickSchoolClock(time);

    // The ball tightens while it is being hit and relaxes between passes.
    const pulse = 1 + Math.sin(time * 0.9) * 0.06;
    const R = this.radius * pulse;

    // --- predators: out, through the middle, out the other side ---
    for (const p of this.preds) {
      p.prev.copy(p.pos);
      p.t += dt / p.period;
      const a = p.t * Math.PI * 2;
      // a lobe that passes through the centre rather than orbiting it
      const along = Math.sin(a) * R * 2.6;
      const side = Math.cos(a) * R * 1.15;
      const perp = _v.copy(p.axis).cross(_Z).normalize();
      p.pos.copy(this.center)
        .addScaledVector(p.axis, along)
        .addScaledVector(perp, side);
    }

    // --- bait fish: hold the shell, flee from anything close ---
    for (let i = 0; i < this.baitCount; i++) {
      const f = this.fish[i];
      const th = f.theta + time * f.spin * 0.5;
      const ph = f.phi + Math.sin(time * 0.6 + f.wob) * 0.08;
      const sp = Math.sin(ph);
      _v.set(sp * Math.cos(th), Math.cos(ph), sp * Math.sin(th)).multiplyScalar(R * f.r);

      // open a cavity around each attacker, and let it close again
      f.push.multiplyScalar(1 - Math.min(1, dt * 2.4));
      for (const p of this.preds) {
        const dx = this.center.x + _v.x - p.pos.x;
        const dy = this.center.y + _v.y - p.pos.y;
        const dz = this.center.z + _v.z - p.pos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > 36) continue;                       // 6 m of influence
        const d = Math.sqrt(d2) || 0.001;
        const k = (1 - d / 6) * 3.6;
        f.push.x += (dx / d) * k * dt * 8;
        f.push.y += (dy / d) * k * dt * 8;
        f.push.z += (dz / d) * k * dt * 8;
      }
      if (f.push.lengthSq() > 64) f.push.setLength(8);

      const px = this.center.x + _v.x + f.push.x;
      const py = this.center.y + _v.y + f.push.y;
      const pz = this.center.z + _v.z + f.push.z;

      // face along the direction of travel around the shell
      _fwd.set(-sp * Math.sin(th), 0, sp * Math.cos(th));
      if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, 1); else _fwd.normalize();
      _q.setFromUnitVectors(_Z, _fwd);
      _s.setScalar(this.bait.scale);
      _m.compose(_v.set(px, py, pz), _q, _s);
      this.bait.mesh.setMatrixAt(i, _m);
    }
    this.bait.mesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.predCount; i++) {
      const p = this.preds[i];
      _fwd.copy(p.pos).sub(p.prev);
      if (_fwd.lengthSq() < 1e-8) _fwd.copy(_Z); else _fwd.normalize();
      _q.setFromUnitVectors(_Z, _fwd);
      _s.setScalar(this.pred.scale);
      _m.compose(p.pos, _q, _s);
      this.pred.mesh.setMatrixAt(i, _m);
    }
    this.pred.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.bait.mesh.material.dispose();
    this.pred.mesh.material.dispose();
  }
}

/** Keeps at most one frenzy alive near the player. */
export class FrenzyManager {
  constructor(scene, onSighting) {
    this.scene = scene;
    this.onSighting = onSighting;
    this.active = null;
    this.timer = 25;
  }

  update(dt, time, playerPos, biome) {
    if (this.active) {
      this.active.update(dt, time);
      const d = playerPos.distanceTo(this.active.center);
      if (d > 520 || this.active.age > this.active.life) {
        for (const m of this.active.meshes) this.scene.remove(m);
        this.active.dispose();
        this.active = null;
        this.timer = 60;
      }
      return;
    }

    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 30;

    // Frenzies belong in productive water, not the abyss and not under ice.
    if (biome === 'deep_sea' || biome === 'polar') return;
    if (playerPos.y < -140) return;

    const a = Math.random() * Math.PI * 2;
    const dist = 160 + Math.random() * 120;
    const center = new THREE.Vector3(
      playerPos.x + Math.cos(a) * dist,
      Math.max(-90, Math.min(-14, playerPos.y + (Math.random() - 0.5) * 30)),
      playerPos.z + Math.sin(a) * dist,
    );
    const ball = new BaitBall(center);
    for (const m of ball.meshes) this.scene.add(m);
    this.active = ball;
    this.onSighting?.();
  }

  clear() {
    if (!this.active) return;
    for (const m of this.active.meshes) this.scene.remove(m);
    this.active.dispose();
    this.active = null;
  }
}
