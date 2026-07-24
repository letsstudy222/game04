// dump.mjs — export a built creature as world-space triangles + vertex colours,
// so the offline software renderer can rasterise it without WebGL.
import * as THREE from 'three';
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import fs from 'fs';
import { SPECIES } from '../src/data/species.js';
import { buildCreature } from '../src/entities/fishMesh.js';

const id = process.argv[2];
const out = process.argv[3] || `/tmp/${id}.json`;
const sp = SPECIES[id];
if (!sp) { console.error('no species', id); process.exit(1); }

const root = buildCreature(sp, 0.5, 'high');
root.updateMatrixWorld(true);

const P = [], C = [];
const v = new THREE.Vector3();
const nm = new THREE.Matrix3();
const col = new THREE.Color();

function sampleTex(tex, u, vv) {
  const img = tex.image;
  if (!img || !img.data) return null;
  const w = img.width, h = img.height;
  let x = Math.floor(((u % 1) + 1) % 1 * w);
  let y = Math.floor(Math.min(0.999, Math.max(0, vv)) * h);
  x = Math.min(w - 1, Math.max(0, x)); y = Math.min(h - 1, Math.max(0, y));
  const i = (y * w + x) * 4;
  return [img.data[i] / 255, img.data[i + 1] / 255, img.data[i + 2] / 255];
}

root.traverse((o) => {
  if (!o.isMesh || !o.geometry) return;
  const g = o.geometry;
  const pos = g.attributes.position;
  if (!pos) return;
  const uv = g.attributes.uv;
  const vc = g.attributes.color;
  const mat = Array.isArray(o.material) ? o.material[0] : o.material;
  const map = mat && mat.map ? mat.map : null;
  const base = mat && mat.color ? mat.color : new THREE.Color(0xffffff);
  nm.getNormalMatrix(o.matrixWorld);
  const idx = g.index ? g.index.array : null;
  const n = idx ? idx.length : pos.count;

  for (let k = 0; k < n; k++) {
    const i = idx ? idx[k] : k;
    v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
    P.push(v.x, v.y, v.z);

    let c = null;
    if (map && uv) c = sampleTex(map, uv.getX(i), uv.getY(i));
    if (!c && vc) c = [vc.getX(i), vc.getY(i), vc.getZ(i)];
    if (!c) c = [base.r, base.g, base.b];
    else if (vc && map) { /* texture wins */ }
    // modulate by material base colour when a texture supplied the value
    if (map && uv) { c = [c[0] * base.r, c[1] * base.g, c[2] * base.b]; }
    C.push(c[0], c[1], c[2]);
  }
});

fs.writeFileSync(out, JSON.stringify({ id, P, C }));
console.log(id, 'triangles:', P.length / 9);
