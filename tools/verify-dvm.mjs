// verify-dvm.mjs — cung mot con vat, cung mot cho, phai o do sau khac nhau
// giua trua va nua dem. Day la thu bien "cung mot vung bien" thanh hai canh
// khac nhau, nen no phai thuc su xay ra chu khong chi co trong du lieu.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import * as THREE from 'three';
import { SPECIES } from '../src/data/species.js';
import { preferredDepth, dslDepth, DSL_DAY, DSL_NIGHT } from '../src/world/dsl.js';
import { Creature } from '../src/entities/creature.js';

let fail = 0;
console.log(`  Tang tan xa: trua ${dslDepth(1).toFixed(0)} m  ->  nua dem ${dslDepth(0).toFixed(0)} m`);
if (Math.abs(dslDepth(1) - DSL_DAY) > 1 || Math.abs(dslDepth(0) - DSL_NIGHT) > 1) fail++;

console.log('\n  Do sau ua thich cua tung loai:');
console.log('  loai            dvm     trua      dem     chenh');
for (const id of Object.keys(SPECIES)) {
  const sp = SPECIES[id];
  if (!sp.dvm) continue;
  const day = preferredDepth(sp, 1), night = preferredDepth(sp, 0);
  const delta = Math.abs(night - day);
  console.log(`  ${id.padEnd(14)}${String(sp.dvm).padStart(5)}${day.toFixed(0).padStart(9)}${night.toFixed(0).padStart(9)}${delta.toFixed(0).padStart(8)} m`);
  // phai nam trong dai do sau cua chinh loai do
  if (day > sp.depth[0] || day < sp.depth[1] || night > sp.depth[0] || night < sp.depth[1]) {
    console.log(`    LOI: ra ngoai dai ${JSON.stringify(sp.depth)}`); fail++;
  }
  if (delta < 20) { console.log('    LOI: gan nhu khong di chuyen'); fail++; }
}
for (const id of ['clownfish', 'reef_fry', 'starfish']) {
  if (preferredDepth(SPECIES[id], 0) !== null) {
    console.log(`  LOI: ${id} khong nen di cu thang dung`); fail++;
  }
}

// mo phong that: tha ca ngu o -400 m roi cho troi qua dem
const sp = SPECIES.bluefin_tuna;
const floorY = () => -900;
const c = new Creature(sp, new THREE.Vector3(0, -400, 0));
Creature.daylight = 0;                       // nua dem
for (let i = 0; i < 60 * 240; i++) c.update(1 / 60, floorY, null);
const nightY = c.mesh.position.y;
Creature.daylight = 1;                       // giua trua
for (let i = 0; i < 60 * 240; i++) c.update(1 / 60, floorY, null);
const dayY = c.mesh.position.y;
console.log(`\n  Mo phong 4 phut moi pha, ca ngu bat dau o -400 m:`);
console.log(`    sau mot dem : ${nightY.toFixed(0)} m`);
console.log(`    sau mot ngay: ${dayY.toFixed(0)} m`);
if (!(nightY > dayY + 40)) { console.log('    LOI: khong troi len vao ban dem'); fail++; }
else console.log('    -> dem noi len, ngay lan xuong: dung');
process.exit(fail ? 1 : 0);
