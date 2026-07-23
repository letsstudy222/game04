// chunkManager.js — Minecraft-style streaming. Loads chunks around the player,
// unloads far ones, and manages the creatures living inside each chunk.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { Noise } from '../core/noise.js';
import { buildChunk } from './chunk.js';
import { floorHeightAt, biomeAt } from './biomes.js';
import { Creature, Flock } from '../entities/creature.js';
import { SPECIES } from '../data/species.js';
import { assignLOD } from '../core/lod.js';

export class ChunkManager {
  constructor(scene) {
    this.scene = scene;
    this.noise = new Noise(CONFIG.seed);
    this.loaded = new Map();       // key "cx,cz" -> record
    this.creatureCount = 0;
    this._swayables = [];          // {group} with kelp to animate
    this._jellies = [];            // drifting jellyfish to animate
    this._wrecks = [];             // { node, pos } shipwrecks (for discovery)
    this._lastChunk = null;
  }

  key(cx, cz) { return cx + ',' + cz; }

  getFloorY(x, z) { return floorHeightAt(this.noise, x, z); }
  getBiome(x, z) { return biomeAt(this.noise, x, z).biome; }

  worldToChunk(x, z) {
    const s = CONFIG.chunk.size;
    return [Math.floor(x / s + 0.5), Math.floor(z / s + 0.5)];
  }

  _load(cx, cz) {
    const key = this.key(cx, cz);
    if (this.loaded.has(key)) return;

    const built = buildChunk(this.noise, cx, cz);
    this.scene.add(built.terrain);
    this.scene.add(built.decor);

    // collect animated decor (kelp sway, jellyfish drift) + wreck positions
    built.decor.children.forEach((d) => {
      if (d.userData.sway) this._swayables.push(d);
      if (d.userData.jelly) this._jellies.push(d);
      if (d.userData.wreck) {
        this._wrecks.push({
          node: d,
          pos: new THREE.Vector3(
            built.decor.position.x + d.position.x,
            d.position.y,
            built.decor.position.z + d.position.z
          ),
        });
      }
    });

    // spawn creatures (respect global cap)
    const creatures = [];
    const flocks = [];
    for (const sp of built.spawns) {
      if (this.creatureCount >= CONFIG.perf.maxCreatures) break;
      const center = new THREE.Vector3(sp.x, sp.y, sp.z);
      if (sp.count > 1) {
        const remaining = CONFIG.perf.maxCreatures - this.creatureCount;
        const n = Math.min(sp.count, remaining);
        const flock = new Flock(sp.speciesId, center, n);
        flock.all.forEach((c) => this.scene.add(c.mesh));
        flocks.push(flock);
        this.creatureCount += n;
      } else {
        const c = new Creature(SPECIES[sp.speciesId], center);
        this.scene.add(c.mesh);
        creatures.push(c);
        this.creatureCount += 1;
      }
    }

    this.loaded.set(key, { ...built, creatures, flocks });
  }

  _unload(key) {
    const rec = this.loaded.get(key);
    if (!rec) return;
    this.scene.remove(rec.terrain);
    this.scene.remove(rec.decor);
    rec.terrain.geometry.dispose();
    rec.decor.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    // remove animated decor belonging to this chunk
    this._swayables = this._swayables.filter((d) => d.parent !== rec.decor);
    this._jellies = this._jellies.filter((d) => d.parent !== rec.decor);
    this._wrecks = this._wrecks.filter((w) => w.node.parent !== rec.decor);

    for (const c of rec.creatures) { this.scene.remove(c.mesh); this.creatureCount--; }
    for (const f of rec.flocks) {
      f.all.forEach((c) => this.scene.remove(c.mesh));
      this.creatureCount -= f.all.length;
    }
    this.loaded.delete(key);
  }

  update(dt, time, playerPos, playerInfo = null) {
    const [pcx, pcz] = this.worldToChunk(playerPos.x, playerPos.z);
    const r = CONFIG.chunk.renderRadius;

    // load ring around player
    if (!this._lastChunk || this._lastChunk[0] !== pcx || this._lastChunk[1] !== pcz) {
      const need = new Set();
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = pcx + dx, cz = pcz + dz;
          need.add(this.key(cx, cz));
          this._load(cx, cz);
        }
      }
      // unload anything outside the ring
      for (const key of [...this.loaded.keys()]) {
        if (!need.has(key)) this._unload(key);
      }
      this._lastChunk = [pcx, pcz];
    }

    // Rank every creature by distance and hand out detail tiers before the
    // per-creature updates run. Without this each animal pays the full
    // deform + normal cost no matter how far away it is.
    const meshes = [];
    for (const c of this.allCreatures()) meshes.push(c.mesh);
    this.liveCreatures = assignLOD(meshes, playerPos, CONFIG.perf.fullDetailCreatures);

    // update creatures in loaded chunks
    const floorFn = (x, z) => this.getFloorY(x, z);
    for (const rec of this.loaded.values()) {
      for (const c of rec.creatures) c.update(dt, floorFn, playerInfo);
      for (const f of rec.flocks) f.update(dt, floorFn, playerInfo);
    }

    // jellyfish: bell pulse + slow vertical drift
    for (const j of this._jellies) {
      const jd = j.userData.jelly;
      const p = time * 1.6 + jd.phase;
      const pulse = 1 + Math.sin(p) * 0.12;
      jd.bell.scale.set(pulse, 1.55 - pulse * 0.5, pulse);
      j.position.y = jd.baseY + Math.sin(time * 0.5 + jd.phase) * 2.5;
      j.rotation.y = time * 0.05 + jd.phase;
    }

    // sway kelp
    for (const g of this._swayables) {
      g.children.forEach((blade) => {
        const ph = blade.userData.swayPhase || 0;
        const amp = blade.userData.swayAmp || 0.1;
        blade.rotation.x = Math.sin(time * 1.2 + ph) * amp;
        blade.rotation.z = Math.cos(time * 0.9 + ph) * amp * 0.6;
      });
    }
  }

  // Iterate every live creature (solitary + in flocks) across loaded chunks.
  *allCreatures() {
    for (const rec of this.loaded.values()) {
      yield* rec.creatures;
      for (const f of rec.flocks) yield* f.all;
    }
  }

  // Unload everything (used when returning to menu / switching species).
  clearAll() {
    for (const key of [...this.loaded.keys()]) this._unload(key);
    this._swayables = [];
    this._jellies = [];
    this._wrecks = [];
    this._lastChunk = null;
    this.creatureCount = 0;
  }

  // Rebuild the world from a different seed (all chunks must be cleared first).
  setSeed(seed) {
    this.clearAll();
    this.noise = new Noise(seed);
  }

  get wrecks() { return this._wrecks; }

  // Ensure the starting area exists immediately (before first frame).
  primeAround(playerPos) {
    const [pcx, pcz] = this.worldToChunk(playerPos.x, playerPos.z);
    const r = CONFIG.chunk.renderRadius;
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) this._load(pcx + dx, pcz + dz);
    this._lastChunk = [pcx, pcz];
  }
}
