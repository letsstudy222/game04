// chunk.js — Builds ONE chunk: seafloor mesh + biome decorations + spawn points.
// Deterministic from world coords, so re-entering a region rebuilds it identically.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { floorHeightAt, biomeAt, BIOME_DEF } from './biomes.js';
import { SPECIES, speciesForBiome } from '../data/species.js';

function seededRand(x, z) {
  // cheap deterministic pseudo-random per world point
  let h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

// ---- Decoration builders (low-poly) ----
// Five coral growth forms. A reef built from one shape reads as wallpaper;
// mixing branching, brain, table, fan and tube corals gives it structure.
function makeCoral(accent) {
  const g = new THREE.Group();
  const palette = [accent, 0xff9aa2, 0xffb7b2, 0xb5ead7, 0xc7ceea,
                   0xf6c453, 0xa06cd5, 0x63d2b2];
  const pick = () => palette[Math.floor(Math.random() * palette.length)];
  const mat = (col, rough = 0.9) => new THREE.MeshStandardMaterial(
    { color: col, roughness: rough, flatShading: false });
  const form = Math.floor(Math.random() * 5);

  if (form === 0) {                          // branching staghorn
    const m = mat(pick());
    const n = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const h = 0.7 + Math.random() * 1.9;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.13, h, 6), m);
      b.position.set((Math.random() - 0.5) * 0.9, h / 2, (Math.random() - 0.5) * 0.9);
      b.rotation.z = (Math.random() - 0.5) * 0.55;
      b.rotation.x = (Math.random() - 0.5) * 0.55;
      g.add(b);
      for (let k = 0; k < 2; k++) {          // side branches
        const bh = h * (0.3 + Math.random() * 0.3);
        const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, bh, 5), m);
        s2.position.copy(b.position);
        s2.position.y += h * 0.25;
        s2.position.x += (Math.random() - 0.5) * 0.3;
        s2.rotation.z = (Math.random() - 0.5) * 1.5;
        g.add(s2);
      }
    }
  } else if (form === 1) {                   // brain coral
    const m = mat(pick(), 0.95);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.7 + Math.random() * 0.5, 16, 12), m);
    b.scale.set(1, 0.62, 1);
    b.position.y = 0.3;
    g.add(b);
    const ridge = mat(pick(), 1);
    for (let i = 0; i < 9; i++) {            // meandering ridges
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.30 + i * 0.055, 0.035, 6, 16), ridge);
      r.rotation.x = Math.PI / 2;
      r.position.y = 0.36 + Math.sin(i) * 0.08;
      r.scale.y = 0.6;
      g.add(r);
    }
  } else if (form === 2) {                   // table coral
    const m = mat(pick());
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.7, 8), m);
    stem.position.y = 0.35; g.add(stem);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.85, 0.11, 14), m);
    top.position.y = 0.74; g.add(top);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const nub = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 5), m);
      nub.position.set(Math.cos(a) * 0.75, 0.85, Math.sin(a) * 0.75);
      g.add(nub);
    }
  } else if (form === 3) {                   // sea fan
    const m = mat(pick(), 0.85);
    m.side = THREE.DoubleSide;
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.95, 14, 0, Math.PI), m);
    fan.position.y = 0.05; fan.rotation.y = Math.random() * Math.PI;
    g.add(fan);
    const rib = mat(pick(), 1);
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI;
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.9, 5), rib);
      r.position.set(Math.cos(a) * 0.42, 0.45 + Math.sin(a) * 0.1, 0);
      r.rotation.z = Math.PI / 2 - a;
      r.rotation.y = fan.rotation.y;
      g.add(r);
    }
  } else {                                   // tube / barrel sponge cluster
    const m = mat(pick(), 0.95);
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const h = 0.6 + Math.random() * 1.1;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, h, 12, 1, true), m);
      t.material.side = THREE.DoubleSide;
      t.position.set((Math.random() - 0.5) * 0.7, h / 2, (Math.random() - 0.5) * 0.7);
      t.rotation.z = (Math.random() - 0.5) * 0.25;
      g.add(t);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 14), m);
      lip.rotation.x = Math.PI / 2;
      lip.position.copy(t.position); lip.position.y += h / 2;
      g.add(lip);
    }
  }
  g.scale.setScalar(0.8 + Math.random() * 0.7);
  return g;
}

function makeKelp() {
  const g = new THREE.Group();
  const tone = Math.random();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.24 + tone * 0.09, 0.42 + tone * 0.2, 0.22 + tone * 0.14),
    flatShading: false, roughness: 0.9, side: THREE.DoubleSide });
  const strands = 2 + Math.floor(Math.random() * 3);
  for (let s = 0; s < strands; s++) {
    const h = 4 + Math.random() * 8;
    const geo = new THREE.PlaneGeometry(0.28 + Math.random() * 0.32, h, 1, 6);
    geo.translate(0, h / 2, 0);
    const blade = new THREE.Mesh(geo, mat);
    blade.position.set((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);
    blade.rotation.y = Math.random() * Math.PI;
    blade.userData.swayPhase = Math.random() * Math.PI * 2;
    blade.userData.swayAmp = 0.12 + Math.random() * 0.12;
    g.add(blade);
  }
  g.userData.sway = true;
  return g;
}

function makeRock() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a6068, flatShading: false, roughness: 1 });
  const r = 0.8 + Math.random() * 2.2;
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
  rock.scale.set(1, 0.6 + Math.random() * 0.5, 1);
  rock.position.y = r * 0.3;
  g.add(rock);
  return g;
}

function makeIce() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xdfeefb, flatShading: false, roughness: 0.4, metalness: 0.1, transparent: true, opacity: 0.9 });
  const r = 1.5 + Math.random() * 3;
  const berg = new THREE.Mesh(new THREE.OctahedronGeometry(r, 1), mat);
  berg.scale.set(1, 1.4, 1);
  berg.position.y = r * 0.4;
  berg.rotation.y = Math.random() * Math.PI;
  g.add(berg);
  return g;
}

function makeVent() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x25201e, flatShading: false, roughness: 1 });
  const h = 2 + Math.random() * 3;
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, h, 6), mat);
  chimney.position.y = h / 2;
  g.add(chimney);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.5 });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), glowMat);
  glow.position.y = h; g.add(glow);
  return g;
}

function makeJelly() {
  const g = new THREE.Group();
  const bellMat = new THREE.MeshStandardMaterial({
    color: 0x7fe8ff, transparent: true, opacity: 0.5,
    emissive: 0x2fb6c9, emissiveIntensity: 1.1,
    roughness: 0.4, flatShading: false, side: THREE.DoubleSide,
  });
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), bellMat);
  g.add(bell);
  const tMat = new THREE.MeshBasicMaterial({ color: 0x9ff0ff, transparent: true, opacity: 0.3 });
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 4), tMat);
    const a = (i / 5) * Math.PI * 2;
    t.position.set(Math.cos(a) * 0.3, -0.7, Math.sin(a) * 0.3);
    g.add(t);
  }
  g.userData.jelly = { phase: Math.random() * Math.PI * 2, bell, baseY: 0 };
  return g;
}

// Tall rock spire — a landmark you can navigate by.
function makeSpire() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x4a5560, flatShading: false, roughness: 1 });
  const h = 22 + Math.random() * 30;
  const seg = 4 + Math.floor(Math.random() * 3);
  let y = 0, r = 3.2 + Math.random() * 1.8;
  for (let i = 0; i < seg; i++) {
    const sh = h / seg;
    const chunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r, sh, 7), m);
    chunk.position.set((Math.random() - 0.5) * 1.2, y + sh / 2, (Math.random() - 0.5) * 1.2);
    chunk.rotation.y = Math.random() * Math.PI;
    g.add(chunk);
    y += sh * 0.94;
    r *= 0.66;
  }
  // a few ledges
  for (let i = 0; i < 3; i++) {
    const ledge = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + Math.random(), 1), m);
    ledge.scale.set(1.5, 0.4, 1.5);
    ledge.position.set((Math.random() - 0.5) * 4, h * (0.25 + Math.random() * 0.6), (Math.random() - 0.5) * 4);
    g.add(ledge);
  }
  return g;
}

// Rock arch / cave mouth you can swim through.
function makeArch() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x44505c, flatShading: false, roughness: 1 });
  const span = 12 + Math.random() * 10;
  const height = 9 + Math.random() * 7;
  // two legs
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, height, 7), m);
    leg.position.set(s * span / 2, height / 2, 0);
    leg.rotation.z = -s * 0.09;
    g.add(leg);
  }
  // curved top made of blocks
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = Math.PI * t;
    const block = new THREE.Mesh(new THREE.BoxGeometry(span / steps * 1.5, 2.6, 5.2), m);
    block.position.set(
      -Math.cos(a) * span / 2,
      height + Math.sin(a) * 3.4,
      0
    );
    block.rotation.z = -Math.cos(a) * 0.5;
    g.add(block);
  }
  return g;
}

function makeWreck() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x3d3229, flatShading: false, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a231d, flatShading: false, roughness: 1 });
  // hull: tapered box lying tilted on the seafloor
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3, 14), wood);
  hull.position.y = 1.2;
  g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4, 4), wood);
  bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4;
  bow.position.set(0, 1.2, 8.5);
  g.add(bow);
  // broken masts
  for (const [x, z, lean, h] of [[0, 2, 0.5, 9], [0, -3.5, -0.8, 6]]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, h, 5), dark);
    mast.position.set(x, 1.2 + h / 2 - 0.5, z);
    mast.rotation.z = lean * 0.4; mast.rotation.x = lean * 0.3;
    g.add(mast);
  }
  // hull breach: dark gash
  const hole = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 3), dark);
  hole.position.set(2, 0.9, -2); hole.rotation.y = 0.2;
  g.add(hole);
  g.rotation.z = 0.28;                     // listing to one side
  g.userData.wreck = true;
  return g;
}

function decorFor(type, accent) {
  switch (type) {
    case 'coral': return makeCoral(accent);
    case 'kelp': return makeKelp();
    case 'sparse_rock': return makeRock();
    case 'ice': return makeIce();
    case 'vent': return makeVent();
    default: return makeRock();
  }
}

// Build a chunk. cx,cz = integer chunk coords. Returns { terrain, decor, spawns, bounds }.
export function buildChunk(noise, cx, cz) {
  const size = CONFIG.chunk.size;
  const seg = CONFIG.chunk.segments;
  const originX = cx * size;
  const originZ = cz * size;

  // --- Terrain mesh with vertex colors for smooth biome blending ---
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const wx = originX + lx;
    const wz = originZ + lz;
    const y = floorHeightAt(noise, wx, wz);
    pos.setY(i, y);
    const { biome } = biomeAt(noise, wx, wz);
    col.set(BIOME_DEF[biome].floorColor);
    // darken with depth for a touch of realism
    const dark = THREE.MathUtils.clamp(1 + y / 900, 0.35, 1);
    colors[i * 3] = col.r * dark;
    colors[i * 3 + 1] = col.g * dark;
    colors[i * 3 + 2] = col.b * dark;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.95 });
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.position.set(originX, 0, originZ);

  // --- Decorations ---
  const decor = new THREE.Group();
  decor.position.set(originX, 0, originZ);
  const centerBiome = biomeAt(noise, originX, originZ).biome;
  const def = BIOME_DEF[centerBiome];
  const count = Math.round(10 * (def.decorDensity || 0.5));
  for (let i = 0; i < count; i++) {
    const rx = (seededRand(originX + i * 13.7, originZ) - 0.5) * size;
    const rz = (seededRand(originX, originZ + i * 9.1) - 0.5) * size;
    const wx = originX + rx, wz = originZ + rz;
    const b = biomeAt(noise, wx, wz).biome;
    const d = decorFor(BIOME_DEF[b].decor, BIOME_DEF[b].accentColor);
    d.position.set(rx, floorHeightAt(noise, wx, wz), rz);
    d.rotation.y = seededRand(wx, wz) * Math.PI * 2;
    const s = 0.7 + seededRand(wz, wx) * 0.8;
    d.scale.setScalar(s);
    decor.add(d);
  }

  // Landmarks: rock spires (~12%) and swim-through arches (~8%).
  // These give the open water a sense of place and scale.
  {
    const rSpire = seededRand(originX * 0.31 + 3, originZ * 0.77 - 8);
    if (rSpire < 0.12 && centerBiome !== 'polar') {
      const rx = (seededRand(originX + 41, originZ + 17) - 0.5) * size * 0.6;
      const rz = (seededRand(originX - 23, originZ + 61) - 0.5) * size * 0.6;
      const sp = makeSpire();
      sp.position.set(rx, floorHeightAt(noise, originX + rx, originZ + rz), rz);
      sp.rotation.y = seededRand(rx, rz) * Math.PI * 2;
      decor.add(sp);
    }
    const rArch = seededRand(originX * 0.53 - 19, originZ * 0.29 + 7);
    if (rArch < 0.08 && (centerBiome === 'coral_reef' || centerBiome === 'kelp_forest' || centerBiome === 'open_ocean')) {
      const rx = (seededRand(originX + 88, originZ - 44) - 0.5) * size * 0.5;
      const rz = (seededRand(originX - 66, originZ + 22) - 0.5) * size * 0.5;
      const ar = makeArch();
      ar.position.set(rx, floorHeightAt(noise, originX + rx, originZ + rz), rz);
      ar.rotation.y = seededRand(rz, rx) * Math.PI * 2;
      decor.add(ar);
    }
  }

  // Rare shipwreck resting on the open/deep seafloor (~6% of chunks there).
  if ((centerBiome === 'open_ocean' || centerBiome === 'deep_sea')
      && seededRand(originX * 1.7 + 11, originZ * 2.3 - 5) < 0.06) {
    const rx = (seededRand(originX + 77, originZ - 31) - 0.5) * size * 0.5;
    const rz = (seededRand(originX - 13, originZ + 57) - 0.5) * size * 0.5;
    const wx = originX + rx, wz = originZ + rz;
    const wreck = makeWreck();
    wreck.position.set(rx, floorHeightAt(noise, wx, wz) + 0.4, rz);
    wreck.rotation.y = seededRand(wx + 9, wz + 9) * Math.PI * 2;
    wreck.scale.setScalar(1.6 + seededRand(wz + 4, wx + 4) * 1.2);
    decor.add(wreck);
  }

  // Bioluminescent jellies drift in the dark biomes (deep_sea would be empty otherwise).
  if (centerBiome === 'deep_sea' || centerBiome === 'polar') {
    const nJ = 2 + Math.floor(seededRand(originX * 0.7, originZ * 1.3) * 4);
    for (let i = 0; i < nJ; i++) {
      const rx = (seededRand(originX + i * 21.3, originZ - 7) - 0.5) * size;
      const rz = (seededRand(originX - 3, originZ + i * 17.7) - 0.5) * size;
      const wx = originX + rx, wz = originZ + rz;
      const j = makeJelly();
      const floor = floorHeightAt(noise, wx, wz);
      const baseY = floor + 8 + seededRand(wx + 1, wz + 1) * 36;
      j.position.set(rx, baseY, rz);
      j.userData.jelly.baseY = baseY;
      j.scale.setScalar(0.6 + seededRand(wz + 2, wx + 2) * 1.6);
      decor.add(j);
    }
  }

  // --- Spawn descriptors (creatures) ---
  const spawns = [];
  const candidates = speciesForBiome(centerBiome);
  if (candidates.length) {
    // spawn a modest number of groups per chunk
    const groups = 1 + Math.floor(seededRand(originZ, originX) * 2);
    for (let gI = 0; gI < groups; gI++) {
      const id = candidates[Math.floor(seededRand(originX + gI, originZ + gI) * candidates.length)];
      const sp = SPECIES[id];
      const rx = (seededRand(originX + gI * 4.2, originZ + 2) - 0.5) * size;
      const rz = (seededRand(originX + 3, originZ + gI * 5.5) - 0.5) * size;
      const wx = originX + rx, wz = originZ + rz;
      const floor = floorHeightAt(noise, wx, wz);
      // pick a y within the species depth range but above the floor
      const [dTop, dBot] = sp.depth; // negatives, dTop shallower
      let y = dTop + (dBot - dTop) * seededRand(wz, wx);
      y = Math.max(floor + sp.length * 1.5, Math.min(dTop, y));
      const groupN = sp.schooling ? (sp.schoolSize[0] + Math.floor(seededRand(wx, wz) * (sp.schoolSize[1] - sp.schoolSize[0]))) : 1;
      spawns.push({ speciesId: id, x: wx, y, z: wz, count: groupN });
    }
  }

  return {
    terrain,
    decor,
    spawns,
    bounds: { originX, originZ, size },
  };
}
