// school.js — Migrating shoals: hundreds of animals crossing your path.
//
// The world is geographically honest, which means about half of any swim is
// open water. Measured on real paths, the median empty stretch ran two and a
// half minutes with nothing in it. Schools are what goes in that gap: a dark
// ribbon resolving out of the blue, sweeping past, and thinning away again.
//
// The hard constraint is cost. A normal creature is a Group of a dozen meshes
// with its own textures, so three hundred of them would be thousands of draw
// calls — impossible on a frame budget that is already tight. So each species
// is baked ONCE into a single geometry with its colours moved into vertex
// attributes, and the whole shoal is drawn as one InstancedMesh: one draw call
// whatever the count. The swim motion happens in the vertex shader, with a
// per-instance phase so the fish are not all flexing in lockstep.

import * as THREE from 'three';
import { buildCreature } from './fishMesh.js';
import { SPECIES } from '../data/species.js';

const _bakeCache = new Map();

/** Sample a DataTexture at a uv, returning linear colour components. */
function sampleTexture(tex, u, v) {
  const img = tex.image;
  if (!img || !img.data) return null;
  const w = img.width, h = img.height;
  let x = Math.floor((((u % 1) + 1) % 1) * w);
  let y = Math.floor(Math.min(0.999, Math.max(0, v)) * h);
  x = Math.min(w - 1, Math.max(0, x));
  y = Math.min(h - 1, Math.max(0, y));
  const i = (y * w + x) * 4;
  return [img.data[i] / 255, img.data[i + 1] / 255, img.data[i + 2] / 255];
}

/**
 * Flatten a species into one geometry with one material.
 * Skin textures are read into vertex colours so the whole animal — body, fins,
 * eyes — can share a single vertexColors material and therefore merge.
 */
export function bakeSpecies(id) {
  if (_bakeCache.has(id)) return _bakeCache.get(id);
  const sp = SPECIES[id];
  const root = buildCreature(sp, 0.5, 'tiny');
  root.updateMatrixWorld(true);

  // Drop anything too small to read at shoal distance. Eyes are the expensive
  // culprit: a sunken eyeball, an iris ring and a wet highlight come to about
  // 850 triangles EACH, so two eyes outweighed the entire body. At the range a
  // school is seen from, they are sub-pixel.
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  const minSpan = sp.length * 0.06;

  const parts = [];
  let vTotal = 0, iTotal = 0, dropped = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    box.setFromObject(o); box.getSize(size);
    if (Math.max(size.x, size.y, size.z) < minSpan) { dropped++; return; }
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    parts.push({ mesh: o, mat });
    vTotal += o.geometry.attributes.position.count;
    iTotal += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
  });

  const pos = new Float32Array(vTotal * 3);
  const nrm = new Float32Array(vTotal * 3);
  const col = new Float32Array(vTotal * 3);
  const idx = vTotal > 65535 ? new Uint32Array(iTotal) : new Uint16Array(iTotal);
  const v = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  const base = new THREE.Color();
  let vo = 0, io = 0;

  for (const { mesh, mat } of parts) {
    const g = mesh.geometry;
    const p = g.attributes.position, n = g.attributes.normal;
    const uvA = g.attributes.uv, cA = g.attributes.color;
    const map = mat?.map || null;
    if (mat?.color) base.copy(mat.color); else base.setRGB(1, 1, 1);
    nm.getNormalMatrix(mesh.matrixWorld);

    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
      if (n) {
        v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
        nrm[(vo + i) * 3] = v.x; nrm[(vo + i) * 3 + 1] = v.y; nrm[(vo + i) * 3 + 2] = v.z;
      }
      let c = null;
      if (map && uvA) c = sampleTexture(map, uvA.getX(i), uvA.getY(i));
      if (!c && cA) c = [cA.getX(i), cA.getY(i), cA.getZ(i)];
      if (!c) c = [base.r, base.g, base.b];
      else if (map) { c = [c[0] * base.r, c[1] * base.g, c[2] * base.b]; }
      col[(vo + i) * 3] = c[0]; col[(vo + i) * 3 + 1] = c[1]; col[(vo + i) * 3 + 2] = c[2];
    }
    if (g.index) {
      const gi = g.index.array;
      for (let i = 0; i < gi.length; i++) idx[io + i] = vo + gi[i];
      io += gi.length;
    } else {
      for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
      io += p.count;
    }
    vo += p.count;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();

  const out = { geo, length: sp.length, dropped, tris: idx.length / 3 };
  _bakeCache.set(id, out);
  return out;
}

/** Shared clock for every school's vertex animation. */
const _uTime = { value: 0 };

function schoolMaterial(bodyLength) {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.6, metalness: 0.05,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = _uTime;
    shader.uniforms.uLen = { value: bodyLength };
    shader.vertexShader = `
      attribute float aPhase;
      uniform float uTime;
      uniform float uLen;
    ` + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       // Swim wave, done here rather than on the CPU: with a few hundred
       // instances sharing one geometry there is nothing per-fish to deform.
       // t runs 0 at the snout to 1 at the tail; amplitude grows towards the
       // tail so the head stays steady, the way a real fish swims.
       float tBody = clamp(0.5 - transformed.z / max(uLen, 0.001), 0.0, 1.0);
       float amp = uLen * 0.055 * tBody * tBody;
       transformed.x += sin(tBody * 5.5 - uTime * 6.0 + aPhase) * amp;
      `
    );
  };
  return mat;
}

/**
 * One migrating shoal. Individuals hold loose formation around a leader point
 * that travels along a heading; the shoal is recycled once it is far behind.
 */
export class School {
  constructor(speciesId, count, origin, heading, spread) {
    const baked = bakeSpecies(speciesId);
    this.speciesId = speciesId;
    this.count = count;
    this.speed = 3.2 + Math.random() * 1.6;
    this.heading = heading;
    this.center = origin.clone();
    this.spread = spread;

    this.mesh = new THREE.InstancedMesh(baked.geo, schoolMaterial(baked.length), count);
    this.mesh.frustumCulled = false;      // the shoal is wider than its geometry
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const phase = new Float32Array(count);
    this.offsets = [];
    for (let i = 0; i < count; i++) {
      phase[i] = Math.random() * Math.PI * 2;
      this.offsets.push(new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.35,
        (Math.random() - 0.5) * spread * 1.6,
      ));
    }
    baked.geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3(1, 1, 1);
    this._p = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._fwd = new THREE.Vector3();
    this.age = 0;
    this.update(0, 0);
  }

  update(dt, time) {
    this.age += dt;
    this._fwd.set(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.center.addScaledVector(this._fwd, this.speed * dt);
    this._q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), this._fwd);

    for (let i = 0; i < this.count; i++) {
      const o = this.offsets[i];
      // gentle individual drift so the formation breathes instead of locking
      const w = time * 0.6 + i * 0.7;
      this._p.set(
        this.center.x + o.x + Math.sin(w) * 1.2,
        this.center.y + o.y + Math.sin(w * 0.7) * 0.8,
        this.center.z + o.z + Math.cos(w * 0.8) * 1.2,
      );
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.material.dispose();
    // geometry is shared through the bake cache; leave it alone
  }
}

export function tickSchoolClock(time) { _uTime.value = time; }

/* --------------------------------------------------------- real migrations */

// Routes taken from where these animals actually travel. A shoal of bluefin
// belongs in the North Atlantic and a sardine run belongs off the Agulhas
// coast; scattering them evenly would throw away the point of building the
// world on real geography in the first place.
export const MIGRATIONS = [
  { id: 'bluefin_tuna', name: 'Đàn cá ngừ vây xanh', count: 220, spread: 55,
    via: [[-70, 40], [-45, 42], [-20, 40], [-9, 36]] },              // Labrador -> Gibraltar
  { id: 'bluefin_tuna', name: 'Đàn cá ngừ vây xanh', count: 180, spread: 50,
    via: [[5, 60], [-8, 48], [-14, 32], [-17, 28]] },                // Norway -> Canaries
  { id: 'reef_fry', name: 'Đàn cá mòi khổng lồ', count: 340, spread: 42,
    via: [[26, -34], [30, -31], [32.5, -28]] },                        // sardine run, Agulhas
  { id: 'sea_turtle', name: 'Đàn rùa biển di cư', count: 22, spread: 70,
    via: [[-35, -8], [-25, -8], [-14, -8]] },                        // Brazil -> Ascension
  { id: 'dolphin', name: 'Đàn cá heo', count: 34, spread: 60,
    via: [[-118, 30], [-125, 27], [-132, 24]] },                     // eastern Pacific
  { id: 'sea_turtle', name: 'Đàn rùa biển di cư', count: 20, spread: 65,
    via: [[146, -18], [152, -20], [158, -22]] },                     // Coral Sea
];

/**
 * Keeps at most `maxActive` shoals alive near the player and recycles them.
 * A school is a big object, so it is spawned just out of sight and allowed to
 * sweep through rather than popping in at close range.
 */
export class SchoolManager {
  constructor(scene, worldAt, onSighting, maxActive = 2) {
    this.scene = scene;
    this.worldAt = worldAt;
    this.onSighting = onSighting;
    this.maxActive = maxActive;
    this.active = [];
    this.timer = 4;
    this.routes = MIGRATIONS.map((m) => {
      const pts = m.via.map(([lon, lat]) => worldAt(lon, lat));
      return { ...m, pts };
    });
  }

  // Closest point on the route's polyline, and the heading along it there.
  _nearest(route, pos) {
    let best = null;
    for (let i = 0; i < route.pts.length - 1; i++) {
      const a = route.pts[i], b = route.pts[i + 1];
      const abx = b.x - a.x, abz = b.z - a.z;
      const len2 = abx * abx + abz * abz || 1;
      let t = ((pos.x - a.x) * abx + (pos.z - a.z) * abz) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + abx * t, pz = a.z + abz * t;
      const d = Math.hypot(pos.x - px, pos.z - pz);
      if (!best || d < best.d) best = { d, x: px, z: pz, heading: Math.atan2(abx, abz) };
    }
    return best;
  }

  update(dt, time, playerPos) {
    tickSchoolClock(time);

    for (let i = this.active.length - 1; i >= 0; i--) {
      const s = this.active[i];
      s.update(dt, time);
      const d = Math.hypot(s.center.x - playerPos.x, s.center.z - playerPos.z);
      if (d > 900 || s.age > 260) {
        this.scene.remove(s.mesh);
        s.dispose();
        this.active.splice(i, 1);
      }
    }

    this.timer -= dt;
    if (this.timer > 0 || this.active.length >= this.maxActive) return;
    this.timer = 12;

    for (const route of this.routes) {
      const n = this._nearest(route, playerPos);
      if (!n || n.d > 700) continue;
      // enter from ahead-and-to-one-side so the shoal sweeps across the view
      const side = Math.random() < 0.5 ? 1 : -1;
      const origin = new THREE.Vector3(
        n.x - Math.sin(n.heading) * 320 + Math.cos(n.heading) * 90 * side,
        playerPos.y + (Math.random() - 0.5) * 24,
        n.z - Math.cos(n.heading) * 320 - Math.sin(n.heading) * 90 * side,
      );
      const s = new School(route.id, route.count, origin, n.heading, route.spread);
      this.scene.add(s.mesh);
      this.active.push(s);
      this.onSighting?.(route.name, route.count);
      this.timer = 45;
      return;
    }
  }

  clear() {
    for (const s of this.active) { this.scene.remove(s.mesh); s.dispose(); }
    this.active = [];
  }
}
