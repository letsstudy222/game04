// verify_crabs.mjs — count the parts that actually distinguish the two crabs.
// three.js keeps the constructor arguments on geometry.parameters, so each
// appendage can be identified by what it was built from rather than guessed at.
import * as THREE from 'three';
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { SPECIES } from '../src/data/species.js';
import { buildCreature } from '../src/entities/fishMesh.js';

const near = (a, b) => Math.abs(a - b) < 1e-4;

for (const id of ['crab', 'mud_crab']) {
  const sp = SPECIES[id];
  const m = sp.morph;
  const root = buildCreature(sp, 0.5, 'high');
  root.updateMatrixWorld(true);

  let teeth = 0, front = 0, carpal = 0, paddles = 0, bands = 0, walkClaws = 0;
  let flattest = 1;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry, p = g.parameters || {};
    if (g.type === 'ConeGeometry') {
      if (near(p.radius, 0.016)) teeth++;
      else if (near(p.radius, 0.011)) front++;
      else if (near(p.radius, 0.014)) carpal++;
      else if (near(p.radius, 0.012)) walkClaws++;
    }
    if (g.type === 'SphereGeometry') {
      if (near(p.radius, 0.028)) bands++;
      if (near(p.radius, 0.080)) {
        paddles++;
        const s = o.scale;
        const mn = Math.min(s.x, s.y, s.z), mx = Math.max(s.x, s.y, s.z);
        flattest = Math.min(flattest, mn / mx);
      }
    }
  });

  console.log(`\n=== ${id}  (${sp.scientific}) ===`);
  console.log(`  anterolateral teeth   : ${teeth}   (${teeth / 2} per side; morph says ${m.teeth})`);
  console.log(`  front spines (eyes)   : ${front}   (morph says ${m.frontSpines})`);
  console.log(`  carpal / wrist spines : ${carpal}  (${carpal / 2} per claw; morph says ${m.carpalSpines})`);
  console.log(`  swimming paddles      : ${paddles} ${paddles ? `(flatness ${flattest.toFixed(2)} — lower = more oar-like)` : ''}`);
  console.log(`  pointed walking claws : ${walkClaws}`);
  console.log(`  banded leg joints     : ${bands}`);
  console.log(`  shell pattern         : ${m.shellPattern}`);
}
