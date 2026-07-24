// render-globe.mjs — draw the world map's globe outside the browser.
//
// worldmap.js needs a canvas and a document, so it cannot be imported here.
// This repeats its projection and its grid build against the same biomeAt(),
// which is what makes the output worth looking at: if the shapes are wrong
// here, they are wrong in game.
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

import { biomeAt, BIOME_DEF, BLUE_HOLES } from '../src/world/biomes.js';
import { worldAt, isLand } from '../src/world/earth.js';
import { seaAt } from '../src/world/seas.js';

const GRID_RES = 1, GW = 360, GH = 180, LAND = 0xff;
const keys = Object.keys(BIOME_DEF);
const idx = {}; keys.forEach((k, i) => { idx[k] = i; });

const t0 = Date.now();
const grid = new Uint8Array(GW * GH);
for (let gy = 0; gy < GH; gy++) {
  const lat = 90 - (gy + 0.5) * GRID_RES;
  for (let gx = 0; gx < GW; gx++) {
    const lon = -180 + (gx + 0.5) * GRID_RES;
    if (isLand(lon, lat)) { grid[gy * GW + gx] = LAND; continue; }
    const { x, z } = worldAt(lon, lat);
    grid[gy * GW + gx] = idx[biomeAt(null, x, z).biome] ?? 0;
  }
}
console.log(`Dung luoi tra cuu ${GW}x${GH}: ${Date.now() - t0} ms (chi chay mot lan khi mo ban do)`);

const MAP_COL = {
  coral_reef: [242, 205, 120], kelp_forest: [46, 120, 82], open_ocean: [38, 92, 158],
  polar: [214, 228, 240], deep_sea: [12, 30, 62], mangrove: [116, 88, 52],
  seagrass: [124, 182, 118], blue_hole: [18, 56, 122],
};
const sample = (lon, lat) => {
  let gx = Math.floor((lon + 180) / GRID_RES), gy = Math.floor((90 - lat) / GRID_RES);
  gx = ((gx % GW) + GW) % GW; gy = Math.max(0, Math.min(GH - 1, gy));
  return grid[gy * GW + gx];
};

const rad = Math.PI / 180;
function globe(lon0, lat0, S, explored) {
  const R = S * 0.46, cx = S / 2, cy = S / 2;
  const img = Buffer.alloc(S * S * 3);
  const sinLat0 = Math.sin(lat0 * rad), cosLat0 = Math.cos(lat0 * rad);
  for (let py = 0; py < S; py++) {
    const y = (py + 0.5 - cy) / R;
    for (let px = 0; px < S; px++) {
      const x = (px + 0.5 - cx) / R;
      const rho2 = x * x + y * y, o = (py * S + px) * 3;
      if (rho2 > 1) { img[o] = 5; img[o + 1] = 12; img[o + 2] = 22; continue; }
      const rho = Math.sqrt(rho2), c = Math.asin(Math.min(1, rho));
      const sinC = Math.sin(c), cosC = Math.cos(c);
      const lat = Math.asin(cosC * sinLat0 + (rho ? (-y * sinC * cosLat0) / rho : 0)) / rad;
      const lon = lon0 + Math.atan2(x * sinC, rho * cosLat0 * cosC + y * sinLat0 * sinC) / rad;
      const lonW = ((lon + 180) % 360 + 360) % 360 - 180;
      const v = sample(lonW, lat);
      const col = v === LAND ? [64, 60, 54] : (MAP_COL[keys[v]] || [40, 80, 140]);
      let sh = (v !== LAND && explored && !explored(lonW, lat)) ? 0.42 : 1;
      sh *= 0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - rho2));
      img[o] = col[0] * sh; img[o + 1] = col[1] * sh; img[o + 2] = col[2] * sh;
    }
  }
  return img;
}

// Two views: everything charted, and a partly-explored one showing the dimming.
const S = 420;
const seen = new Set(['7,4', '7,3', '6,4', '8,4', '7,5', '6,3']);   // 5-degree cells
const explored = (lon, lat) => seen.has(`${Math.floor(lon / 5)},${Math.floor(lat / 5)}`);

for (const [name, lon0, lat0, mask] of [
  ['bien-do', 38, 22, null],
  ['bien-do-chua-kham-pha', 38, 22, explored],
  ['thai-binh-duong', -150, -10, null],
  ['ran-great-barrier', 146, -18, null],
]) {
  fs.writeFileSync(`/tmp/globe-${name}.raw`, globe(lon0, lat0, S, mask));
  console.log(`  ${name.padEnd(24)} tam tai ${seaAt(lon0, lat0).vi}`);
}
console.log(`\nKich thuoc anh: ${S}x${S}`);
