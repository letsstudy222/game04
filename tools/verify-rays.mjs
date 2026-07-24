// verify_rays.mjs — the manta and the ribbontail must now differ where the
// literature says they differ. Measure the disc separately from the tail.
import * as THREE from 'three';
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { SPECIES } from '../src/data/species.js';
import { buildCreature } from '../src/entities/fishMesh.js';

const b = new THREE.Box3(), sz = new THREE.Vector3(), ctr = new THREE.Vector3();

for (const id of ['manta_ray', 'bluespotted_ray']) {
  const sp = SPECIES[id];
  const root = buildCreature(sp, 0.5, 'high');
  root.updateMatrixWorld(true);

  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    b.setFromObject(o); b.getSize(sz); b.getCenter(ctr);
    meshes.push({ o, w: sz.x, h: sz.y, l: sz.z, cz: ctr.z });
  });
  // the disc is the widest mesh; the tail is the long thin rearmost one
  const disc = meshes.reduce((a, c) => (c.w > a.w ? c : a));
  const tail = meshes.reduce((a, c) => (c.cz < a.cz ? c : a));
  b.setFromObject(root); b.getSize(sz);

  const cephalic = meshes.filter((m) => m.cz > disc.cz + disc.l * 0.25).length;

  console.log(`\n=== ${id}  (${sp.scientific}) ===`);
  console.log(`  disc width               : ${disc.w.toFixed(3)} m   (declared ${sp.length})`);
  console.log(`  disc length              : ${disc.l.toFixed(3)} m`);
  console.log(`  disc width / disc length : ${(disc.w / disc.l).toFixed(2)}`);
  console.log(`  disc thickness           : ${disc.h.toFixed(3)} m  = ${(disc.h / disc.w * 100).toFixed(1)} % of width`);
  console.log(`  tail length              : ${tail.l.toFixed(3)} m  = ${(tail.l / disc.w).toFixed(2)} x disc width`);
  console.log(`  TOTAL length             : ${sz.z.toFixed(3)} m`);
  console.log(`  meshes fwd of disc centre: ${cephalic}  (cephalic fins / head block)`);
}
