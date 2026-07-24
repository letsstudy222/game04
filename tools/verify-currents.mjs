// verify-currents.mjs — dong chay phai nam dung cho, du rong de gap, va phai
// thuc su day nguoi choi di.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { currentAt, currentFactorAtDepth, CURRENTS } from '../src/world/currents.js';
import { worldAt, lonLatAt, isLand, WORLD_W, WORLD_H } from '../src/world/earth.js';

let fail = 0;
console.log('  Kiem tra moi diem tuyen deu nam tren nuoc:');
for (const c of CURRENTS) {
  for (const [lon, lat] of c.via) {
    if (isLand(lon, lat)) { console.log(`    LOI: ${c.name} co diem (${lon}, ${lat}) tren DAT`); fail++; }
  }
}
if (!fail) console.log('    tat ca deu tren nuoc');

console.log('\n  Dong chay tai vi tri that:');
for (const [nm, lon, lat, want] of [
  ['Ngoai khoi Florida', -79, 27, 'Gulf Stream'],
  ['Ngoai khoi Nhat Ban', 140, 35, 'Kuroshio'],
  ['Vong Nam Cuc', -30, -56, 'Vòng Nam Cực'],
  ['Bien Do', 38, 22, null],
]) {
  const { x, z } = worldAt(lon, lat);
  const c = currentAt(x, z);
  const ok = want ? (c.name && c.name.includes(want)) : !c.name;
  if (!ok) fail++;
  console.log(`    ${nm.padEnd(22)}${(c.name || '(khong co)').padEnd(28)}${ok ? '' : '<-- SAI'}`);
}

let hit = 0, tot = 0;
for (let i = 0; i < 60000; i++) {
  const x = (Math.random() - 0.5) * WORLD_W, z = (Math.random() - 0.5) * WORLD_H;
  const { lon, lat } = lonLatAt(x, z);
  if (isLand(lon, lat)) continue;
  tot++; if (currentAt(x, z).strength > 0.08) hit++;
}
const pct = hit / tot * 100;
console.log(`\n  Do phu: ${pct.toFixed(1)}% mat bien (can 20-45% de vua gap vua dac biet)`);
if (pct < 20 || pct > 45) fail++;

// day nguoi choi bao xa trong mot phut khi tha troi
const { x, z } = worldAt(-45, 44);
const c = currentAt(x, z);
const perMin = Math.hypot(c.vx, c.vz) * 60;
console.log(`  Tha troi giua Gulf Stream: ${perMin.toFixed(0)} m/phut (boi thuong 840 m/phut)`);
console.log(`  Suy giam do sau: 0m=${(currentFactorAtDepth(0)*100).toFixed(0)}%  120m=${(currentFactorAtDepth(-120)*100).toFixed(0)}%  250m=${(currentFactorAtDepth(-250)*100).toFixed(0)}%`);
process.exit(fail ? 1 : 0);
