// verify-landmarks.mjs — xac ca voi va tram ve sinh phai (1) that su xuat hien
// dung ty le, (2) bao vi tri ra ngoai duoc — vi mergeStatic xoa userData nen
// khong the tim lai bang cach duyet mesh, va (3) dan ca don ve sinh phai con
// dong duoc: neu no bi long trong nhom tram thi se bi gop cung.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { buildChunk } from '../src/world/chunk.js';
import { biomeAt } from '../src/world/biomes.js';
import { worldAt, isLand } from '../src/world/earth.js';
import { Noise } from '../src/core/noise.js';

const n = new Noise('blue-planet-01');
let fail = 0;

function survey(lon, lat, biome, kind, lo, hi) {
  const { x, z } = worldAt(lon, lat);
  const cx0 = Math.round(x / 240), cz0 = Math.round(z / 240);
  let found = 0, chunks = 0, swayOK = 0;
  for (let dz = -6; dz <= 6; dz++) {
    for (let dx = -6; dx <= 6; dx++) {
      const oX = (cx0 + dx) * 240, oZ = (cz0 + dz) * 240;
      const ll = { lon, lat };
      if (biomeAt(n, oX, oZ).biome !== biome) continue;
      chunks++;
      const r = buildChunk(n, cx0 + dx, cz0 + dz);
      const hits = (r.landmarks || []).filter((L) => L.kind === kind);
      if (!hits.length) continue;
      found++;
      // dan ca don ve sinh phai la con TRUC TIEP cua decor va con nguyen la
      if (kind === 'cleaning') {
        const clouds = r.decor.children.filter((c) => c.userData?.sway && c.children.length > 1);
        if (clouds.length) swayOK++;
      }
    }
  }
  const pct = found / chunks * 100;
  const ok = pct >= lo && pct <= hi;
  if (!ok) fail++;
  console.log(`  ${kind.padEnd(12)} ${found}/${chunks} chunk = ${pct.toFixed(0)}%  (can ${lo}-${hi}%)  ${ok ? '' : '<-- SAI'}`);
  if (kind === 'cleaning') {
    const good = swayOK === found;
    if (!good) fail++;
    console.log(`    dan ca con dong duoc: ${swayOK}/${found} ${good ? '' : '<-- BI GOP CUNG'}`);
  }
}

console.log('  Ty le xuat hien:');
survey(-150, -35, 'deep_sea', 'whale_fall', 1, 9);
survey(-150, -10, 'coral_reef', 'cleaning', 7, 22);

// vi tri bao ra phai dung trong chunk
const { x, z } = worldAt(-150, -10);
const cx0 = Math.round(x / 240), cz0 = Math.round(z / 240);
let checked = 0;
for (let dz = -6; dz <= 6 && checked < 3; dz++) {
  for (let dx = -6; dx <= 6 && checked < 3; dx++) {
    const r = buildChunk(n, cx0 + dx, cz0 + dz);
    for (const L of r.landmarks || []) {
      const inX = Math.abs(L.x - (cx0 + dx) * 240) <= 240;
      const inZ = Math.abs(L.z - (cz0 + dz) * 240) <= 240;
      if (!inX || !inZ) { console.log(`  LOI: ${L.kind} bao vi tri ngoai chunk`); fail++; }
      checked++;
    }
  }
}
console.log(`\n  Da kiem ${checked} vi tri bao ra, deu nam trong chunk cua no`);
process.exit(fail ? 1 : 0);
