// verify-gameloop.mjs — chay dung chuoi cap nhat cua main.js ma khong can
// trinh duyet. Mot exception nem ra moi khung se giet vong lap render: man
// hinh dung, khong di chuyen, bam phim khong co gi. Do la loai loi khong the
// tim bang doc code, nen no duoc chay that o day.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import * as THREE from 'three';

import { SPECIES, SPECIES_ORDER } from '../src/data/species.js';
import { ChunkManager } from '../src/world/chunkManager.js';
import { Player } from '../src/entities/player.js';
import { Creature } from '../src/entities/creature.js';
import { SchoolManager } from '../src/entities/school.js';
import { FrenzyManager } from '../src/entities/baitball.js';
import { ScatteringLayer } from '../src/world/dsl.js';
import { worldAt, lonLatAt } from '../src/world/earth.js';
import { seaAt } from '../src/world/seas.js';
import { currentAt } from '../src/world/currents.js';

let fail = 0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1.6, 0.1, 4000);

// Input is read by Player every frame; give it the shape main.js provides.
const input = {
  keys: new Set(),
  down() { return false; },
  consumeWheel() { return 0; },
  consumeMouse() { return [0, 0]; },
};

const chunks = new ChunkManager(scene, 'blue-planet-01');
const schools = new SchoolManager(scene, worldAt, () => {});
const frenzy = new FrenzyManager(scene, () => {});
const scattering = new ScatteringLayer(scene);

function runOne(id, frames) {
  const species = SPECIES[id];
  const start = new THREE.Vector3(0, Math.max(-40, species.depth[0]), 0);
  chunks.clearAll();
  chunks.primeAround(start);
  const player = new Player(species, camera, input, start);
  scene.add(player.mesh);

  let time = 0;
  for (let f = 0; f < frames; f++) {
    const dt = 1 / 60;
    time += dt;
    const daylight = 0.5 + 0.5 * Math.cos(time * 0.05);
    Creature.daylight = daylight;

    player.update(dt, (x, z) => chunks.getFloorY(x, z));
    const pos = player.position;
    const biome = chunks.getBiome(pos.x, pos.z);
    const playerInfo = { pos, length: player.species.length, id: player.species.id };
    chunks.update(dt, time, pos, playerInfo);
    schools.update(dt, time, pos);
    frenzy.update(dt, time, pos, biome);
    scattering.update(dt, time, pos, daylight);

    // the readouts main.js pulls each frame
    const { lon, lat } = lonLatAt(pos.x, pos.z);
    seaAt(lon, lat);
    currentAt(pos.x, pos.z);
    void player.current; void player.currentStrength; void player.currentVec;
    for (const L of chunks.landmarks) void L.kind;
    for (const c of chunks.allCreatures()) void c.species.id;
    for (const w of chunks.wrecks) void w.pos;

    if (!isFinite(pos.x) || !isFinite(pos.y) || !isFinite(pos.z)) {
      throw new Error(`vi tri nguoi choi thanh NaN o khung ${f}`);
    }
  }
  scene.remove(player.mesh);
  return player.position.clone();
}

console.log('  Chay 180 khung cho tung loai choi duoc:\n');
console.log('  loai              ket qua');
for (const id of SPECIES_ORDER) {
  try {
    const p = runOne(id, 180);
    console.log(`  ${id.padEnd(16)} OK   (ket thuc o ${p.y.toFixed(0)} m)`);
  } catch (e) {
    console.log(`  ${id.padEnd(16)} NEM LOI: ${e.message}`);
    if (e.stack) console.log('      ' + e.stack.split('\n')[1].trim());
    fail++;
  }
}

frenzy.clear();
schools.clear();
console.log(fail ? `\n  ${fail} loai lam vo vong lap` : '\n  Moi loai deu chay duoc 180 khung');
process.exit(fail ? 1 : 0);
