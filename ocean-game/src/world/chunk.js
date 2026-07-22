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
function makeCoral(accent) {
  const g = new THREE.Group();
  const palette = [accent, 0xff9aa2, 0xffb7b2, 0xb5ead7, 0xc7ceea];
  const n = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const col = palette[Math.floor(Math.random() * palette.length)];
    const m = new THREE.MeshStandardMaterial({ color: col, flatShading: true, roughness: 0.9 });
    const h = 0.6 + Math.random() * 1.8;
    const branch = new THREE.Mesh(new THREE.ConeGeometry(0.12 + Math.random() * 0.15, h, 5), m);
    branch.position.set((Math.random() - 0.5) * 0.9, h / 2, (Math.random() - 0.5) * 0.9);
    branch.rotation.z = (Math.random() - 0.5) * 0.5;
    g.add(branch);
    if (Math.random() > 0.5) {
      const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18 + Math.random() * 0.2, 0), m);
      bulb.position.copy(branch.position).y = h * 0.9;
      g.add(bulb);
    }
  }
  return g;
}

function makeKelp() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, flatShading: true, roughness: 0.9, side: THREE.DoubleSide });
  const strands = 2 + Math.floor(Math.random() * 3);
  for (let s = 0; s < strands; s++) {
    const h = 4 + Math.random() * 8;
    const geo = new THREE.PlaneGeometry(0.4, h, 1, 6);
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
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a6068, flatShading: true, roughness: 1 });
  const r = 0.8 + Math.random() * 2.2;
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
  rock.scale.set(1, 0.6 + Math.random() * 0.5, 1);
  rock.position.y = r * 0.3;
  g.add(rock);
  return g;
}

function makeIce() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xdfeefb, flatShading: true, roughness: 0.4, metalness: 0.1, transparent: true, opacity: 0.9 });
  const r = 1.5 + Math.random() * 3;
  const berg = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), mat);
  berg.scale.set(1, 1.4, 1);
  berg.position.y = r * 0.4;
  berg.rotation.y = Math.random() * Math.PI;
  g.add(berg);
  return g;
}

function makeVent() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x25201e, flatShading: true, roughness: 1 });
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
    roughness: 0.4, flatShading: true, side: THREE.DoubleSide,
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

function makeWreck() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x3d3229, flatShading: true, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a231d, flatShading: true, roughness: 1 });
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
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
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
