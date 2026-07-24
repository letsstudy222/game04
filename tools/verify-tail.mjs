// verify_tail.mjs — sample the ray's actual vertex cloud in slices along Z and
// report the vertical extent at each slice. The ventral fin fold must show up
// as depth BELOW the tail core that persists all the way to the tip.
import * as THREE from 'three';
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { SPECIES } from '../src/data/species.js';
import { buildCreature } from '../src/entities/fishMesh.js';

const sp = SPECIES.bluespotted_ray;
const root = buildCreature(sp, 0.5, 'high');
root.updateMatrixWorld(true);

const pts = [];
const v = new THREE.Vector3();
root.traverse((o) => {
  if (!o.isMesh || !o.geometry) return;
  const p = o.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
    pts.push([v.x, v.y, v.z]);
  }
});

const discRear = (0.5 - 1.0) * sp.morph.discLen * sp.length;
const tailLen = sp.morph.tailLen * sp.length;
console.log(`disc rear edge z = ${discRear.toFixed(3)} m,  tail length = ${tailLen.toFixed(3)} m\n`);
console.log(' along tail   z(m)     top(m)    bottom(m)   total(m)   width(m)');

for (let k = 0; k <= 1.0001; k += 0.1) {
  const z = discRear - k * tailLen;
  const band = pts.filter((p) => Math.abs(p[2] - z) < tailLen * 0.025);
  if (!band.length) { console.log(`   ${(k * 100).toFixed(0).padStart(3)} %   ${z.toFixed(3)}   (no geometry)`); continue; }
  const ys = band.map((p) => p[1]);
  const xs = band.map((p) => Math.abs(p[0]));
  const top = Math.max(...ys), bot = Math.min(...ys);
  console.log(`   ${(k * 100).toFixed(0).padStart(3)} %   ${z.toFixed(3)}   ${top.toFixed(4).padStart(7)}   ${bot.toFixed(4).padStart(8)}   ${(top - bot).toFixed(4).padStart(7)}   ${(Math.max(...xs) * 2).toFixed(4).padStart(7)}`);
}
