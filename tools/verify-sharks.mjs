// verify_sharks.mjs — measure the three field marks numerically, since visual
// review is unavailable. Each shark must differ where the literature says it
// differs, and match where it should match.
import * as THREE from 'three';
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { SPECIES } from '../src/data/species.js';
import { buildCreature } from '../src/entities/fishMesh.js';

const b = new THREE.Box3(), sz = new THREE.Vector3(), ctr = new THREE.Vector3();

function parts(id) {
  const sp = SPECIES[id];
  const root = buildCreature(sp, 0.5, 'high');
  root.updateMatrixWorld(true);
  const list = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    b.setFromObject(o); b.getSize(sz); b.getCenter(ctr);
    list.push({ sx: sz.x, sy: sz.y, sz: sz.z, cx: ctr.x, cy: ctr.y, cz: ctr.z });
  });
  return { sp, list };
}

// body is the largest mesh; fins identified by centre position along Z
for (const id of ['great_white', 'lemon_shark', 'reef_shark']) {
  const { sp, list } = parts(id);
  const L = sp.length;
  const body = list.reduce((a, c) => (c.sz > a.sz ? c : a));
  // dorsal fins: above the midline (cy>0), on the body axis (|cx| small)
  const dorsals = list.filter((m) => m.cy > 0.02 * L && Math.abs(m.cx) < 0.02 * L
    && m.cz > -0.45 * L && m !== body).sort((a, c) => c.cz - a.cz);
  const d1 = dorsals[0], d2 = dorsals[1];
  // caudal: the rearmost mesh
  const caud = list.reduce((a, c) => (c.cz < a.cz ? c : a));

  console.log(`\n=== ${id}  (${sp.scientific}, ${L} m) ===`);
  console.log(`  body depth / length      : ${(body.sy / body.sz * 100).toFixed(1)} %`);
  console.log(`  1st dorsal height        : ${(d1.sy / L * 100).toFixed(2)} % of TL`);
  console.log(`  2nd dorsal height        : ${(d2.sy / L * 100).toFixed(2)} % of TL`);
  console.log(`  2nd/1st dorsal ratio     : ${(d2.sy / d1.sy).toFixed(2)}   <-- lemon shark must approach 1.0`);
  console.log(`  caudal vertical span     : ${(caud.sy / L * 100).toFixed(1)} % of TL`);
  console.log(`  caudal lower/upper lobe  : ${(sp.morph.caudalLower).toFixed(2)}`);
  console.log(`  interdorsal ridge        : ${sp.morph.interdorsal ? 'YES' : 'no'}`);
}
