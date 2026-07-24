// scene-cost.mjs — dem draw call va tam giac cho mot vung 5x5 chunk.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { Noise } from '../src/core/noise.js';
import { worldAt } from '../src/world/earth.js';
import { buildChunk } from '../src/world/chunk.js';

const n = new Noise('blue-planet-01');
console.log('  vung                 draw call     tris    ms');
for (const [nm, lo, la] of [['Ven bo (Bien Do)', 38, 22], ['Ran (giua TBD)', -150, -10],
                            ['Bien khoi', -40, 20], ['Vung cuc', 0, 85]]) {
  const { x, z } = worldAt(lo, la);
  const cx0 = Math.round(x / 240), cz0 = Math.round(z / 240);
  let dc = 0, tris = 0;
  const t = process.hrtime.bigint();
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const r = buildChunk(n, cx0 + dx, cz0 + dz);
    for (const g of [r.terrain, r.decor]) g.traverse((o) => {
      if (o.isMesh && o.geometry) {
        dc++;
        tris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;
      }
    });
  }
  const ms = Number(process.hrtime.bigint() - t) / 1e6;
  console.log(`  ${nm.padEnd(20)} ${String(dc).padStart(7)} ${String(Math.round(tris/1000)).padStart(8)}k ${ms.toFixed(0).padStart(6)}`);
}
