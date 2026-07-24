// earth-report.mjs — sample the whole ocean and report what the player will
// actually meet. The point of the exaggeration constants in earth.js is to
// stop three quarters of the world being empty blue water; this is how that
// gets checked instead of guessed at.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import { biomeAt } from '../src/world/biomes.js';
import { lonLatAt, worldAt, isLand, coastDistance, WORLD_W, WORLD_H } from '../src/world/earth.js';
import { Noise } from '../src/core/noise.js';

const noise = new Noise('report');
const STEP = 0.5;                       // degrees
const counts = {};
let ocean = 0, land = 0;

for (let lat = -89; lat <= 89; lat += STEP) {
  for (let lon = -180; lon < 180; lon += STEP) {
    if (isLand(lon, lat)) { land += Math.cos(lat * Math.PI / 180); continue; }
    const { x, z } = worldAt(lon, lat);
    const { biome } = biomeAt(noise, x, z);
    // moi o luoi lon/lat co dien tich that ti le voi cos(lat)
    const a = Math.cos(lat * Math.PI / 180);
    counts[biome] = (counts[biome] || 0) + a;
    ocean += a;
  }
}

console.log(`The gioi game: ${(WORLD_W / 1000).toFixed(0)} x ${(WORLD_H / 1000).toFixed(0)} km`);
console.log(`Mau (trong so theo dien tich that): ${ocean.toFixed(0)} dai duong, ${land.toFixed(0)} dat\n`);
console.log('Biome           o mau      %');
console.log('-'.repeat(34));
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  const pct = (v / ocean) * 100;
  const bar = '#'.repeat(Math.round(pct / 2));
  console.log(`${k.padEnd(14)} ${v.toFixed(0).padStart(6)}  ${pct.toFixed(1).padStart(5)}%  ${bar}`);
}
const empty = (counts.deep_sea || 0) + (counts.open_ocean || 0) + (counts.polar || 0);
console.log('-'.repeat(34));
console.log(`Nuoc trong (sau + khoi + cuc): ${(empty / ocean * 100).toFixed(1)}%`);

// vai vi tri co that de kiem tra bang mat
console.log('\nKiem tra vai dia diem that:');
const spots = [
  ['Ran Great Barrier (Uc)', 146.8, -18.3],
  ['Bien Do', 38.0, 22.0],
  ['Vinh California (vaquita)', -114.5, 31.0],
  ['Belize (Great Blue Hole)', -87.5, 17.3],
  ['Bac Bang Duong', 0.0, 85.0],
  ['Giua Thai Binh Duong', -150.0, -10.0],
  ['Rung ngap man Ca Mau', 105.0, 8.7],
];
for (const [name, lon, lat] of spots) {
  const { x, z } = worldAt(lon, lat);
  const b = isLand(lon, lat) ? 'DAT' : biomeAt(noise, x, z).biome;
  console.log(`  ${name.padEnd(26)} ${b.padEnd(12)} (cach bo ${coastDistance(lon, lat).toFixed(1)} do)`);
}
