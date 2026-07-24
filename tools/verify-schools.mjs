// verify-schools.mjs — mot dan phai la MOT lenh ve, va phai re. Kiem tra bang
// so vi khong mo duoc trinh duyet o day.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import * as THREE from 'three';
import { bakeSpecies, School, SchoolManager, MIGRATIONS } from '../src/entities/school.js';
import { worldAt, isLand, lonLatAt } from '../src/world/earth.js';

let fail = 0;
console.log('  loai            tris/con  bo qua   lenh ve');
const seen = new Set();
for (const m of MIGRATIONS) {
  if (seen.has(m.id)) continue; seen.add(m.id);
  const b = bakeSpecies(m.id);
  const s = new School(m.id, m.count, new THREE.Vector3(), 0, m.spread);
  let dc = 0; s.mesh.traverse((o) => { if (o.isMesh) dc++; });
  const ok = dc === 1 && b.tris < 1200;
  if (!ok) fail++;
  console.log(`  ${m.id.padEnd(14)}${String(b.tris).padStart(9)}${String(b.dropped).padStart(8)}${String(dc).padStart(10)}  ${ok ? '' : '<-- QUA DAT'}`);
}

// moi diem tren tuyen phai la nuoc, khong phai dat
console.log('\n  Kiem tra tuyen di cu nam tren nuoc:');
for (const m of MIGRATIONS) {
  for (const [lon, lat] of m.via) {
    if (isLand(lon, lat)) { console.log(`    LOI: ${m.name} co diem (${lon}, ${lat}) nam tren DAT`); fail++; }
  }
}
if (!fail) console.log('    moi diem deu tren nuoc');

// quan ly phai sinh ra roi thu don
const scene = new THREE.Scene();
const mgr = new SchoolManager(scene, worldAt, () => {});
const p0 = worldAt(...MIGRATIONS[0].via[1]);
const pos = new THREE.Vector3(p0.x, -40, p0.z);
for (let i = 0; i < 600; i++) mgr.update(1 / 30, i / 30, pos);
const spawned = mgr.active.length;
const far = worldAt(0, 0);
for (let i = 0; i < 2000; i++) mgr.update(1 / 30, i / 30, new THREE.Vector3(far.x, -40, far.z));
console.log(`\n  Gan tuyen: ${spawned} dan song. Sau khi roi xa: ${mgr.active.length} (phai la 0)`);
if (mgr.active.length !== 0) fail++;
process.exit(fail ? 1 : 0);
