// audit.mjs — measure what the CODE actually produces, per species.
import * as THREE from 'three';
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { SPECIES, ALL_SPECIES } from '../src/data/species.js';
import { buildCreature } from '../src/entities/fishMesh.js';


// Some builders scatter detail with Math.random() (the sea cucumber's papillae,
// for instance). That is intentional in game, but it makes this report differ
// slightly between runs and hides real regressions in the noise. Seed it.
let _s = 123456789;
Math.random = () => {
  _s = (_s * 1103515245 + 12345) & 0x7fffffff;
  return _s / 0x7fffffff;
};

const box = new THREE.Box3();
const size = new THREE.Vector3();
const rows = [];

for (const id of ALL_SPECIES) {
  const sp = SPECIES[id];
  if (!sp) { rows.push({ id, err: 'MISSING in SPECIES' }); continue; }
  try {
    const m = buildCreature(sp, 0.5, 'high');
    m.updateMatrixWorld(true);
    box.setFromObject(m);
    box.getSize(size);
    let tris = 0, meshes = 0;
    m.traverse((o) => {
      if (o.isMesh && o.geometry) {
        meshes++;
        const g = o.geometry;
        tris += g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3;
      }
    });
    rows.push({
      id, shape: sp.shape, declared: sp.length,
      X: size.x, Y: size.y, Z: size.z,
      meshes, tris: Math.round(tris),
    });
  } catch (e) {
    rows.push({ id, shape: sp.shape, err: e.message });
  }
}

const f = (n) => (n === undefined ? '  -  ' : n.toFixed(3).padStart(7));
console.log('id                shape       decl      X(width)  Y(height) Z(length)  H/L%   W/L%  meshes  tris');
for (const r of rows) {
  if (r.err) { console.log(`${r.id.padEnd(17)} ${(r.shape||'').padEnd(10)} ERROR: ${r.err}`); continue; }
  const L = Math.max(r.X, r.Y, r.Z);
  const hl = (r.Y / r.Z * 100).toFixed(1).padStart(5);
  const wl = (r.X / r.Z * 100).toFixed(1).padStart(5);
  console.log(`${r.id.padEnd(17)} ${r.shape.padEnd(10)} ${f(r.declared)} ${f(r.X)} ${f(r.Y)} ${f(r.Z)} ${hl} ${wl}  ${String(r.meshes).padStart(4)} ${String(r.tris).padStart(7)}`);
}
