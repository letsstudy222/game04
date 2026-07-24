// earth-map.mjs — ve ban do the gioi tu CHINH code game (biomeAt), de kiem
// chung rang thu nguoi choi gap dung voi thu bao cao noi.
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { biomeAt, BIOME_DEF, BLUE_HOLES } from '../src/world/biomes.js';
import { worldAt, isLand, WORLD_W, WORLD_H } from '../src/world/earth.js';
import { Noise } from '../src/core/noise.js';

const noise = new Noise('blue-planet-01');
const W = 1440, H = 720;
const img = Buffer.alloc(W * H * 3);
const COL = {
  coral_reef: [242, 205, 120], kelp_forest: [46, 120, 82], open_ocean: [38, 92, 158],
  polar: [206, 222, 235], deep_sea: [10, 26, 58], mangrove: [116, 88, 52],
  seagrass: [124, 182, 118], blue_hole: [16, 52, 116], land: [58, 54, 48],
};
for (let py = 0; py < H; py++) {
  // dong dien tich: hang anh <-> sin(vi do)
  const s = 1 - (py + 0.5) / H * 2;
  const lat = Math.asin(s) * 180 / Math.PI;
  for (let px = 0; px < W; px++) {
    const lon = -180 + (px + 0.5) / W * 360;
    let c;
    if (isLand(lon, lat)) c = COL.land;
    else {
      const { x, z } = worldAt(lon, lat);
      c = COL[biomeAt(noise, x, z).biome] || [255, 0, 255];
    }
    const i = (py * W + px) * 3;
    img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2];
  }
}
// danh dau ho xanh
for (const h of BLUE_HOLES) {
  const px = Math.round((h.lon + 180) / 360 * W);
  const py = Math.round((1 - Math.sin(h.lat * Math.PI / 180)) / 2 * H);
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    if (Math.hypot(dx, dy) > 4 || Math.hypot(dx, dy) < 2.5) continue;
    const x = px + dx, y = py + dy;
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    const i = (y * W + x) * 3;
    img[i] = 255; img[i + 1] = 60; img[i + 2] = 60;
  }
}
fs.writeFileSync('/tmp/worldmap.raw', img);
console.log(`ve xong ${W}x${H}, the gioi ${(WORLD_W/1000).toFixed(0)}x${(WORLD_H/1000).toFixed(0)} km`);
