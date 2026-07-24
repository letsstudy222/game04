// verify_reef.mjs — bulk ratios cannot separate three deep-bodied fish. The
// features that actually identify them are the straightness of the back, where
// the dorsal fin sits, and the shape of the caudal trailing edge.
import * as THREE from 'three';
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import { SPECIES } from '../src/data/species.js';
import { buildCreature } from '../src/entities/fishMesh.js';
import { PLANS } from '../src/entities/swimmers.js';

const b = new THREE.Box3(), sz = new THREE.Vector3(), ctr = new THREE.Vector3();

for (const id of ['clownfish', 'reef_fry', 'archerfish', 'mudskipper']) {
  const sp = SPECIES[id];
  const st = PLANS.reeffish.stations(sp);

  // 1. Back straightness: how far the dorsal profile deviates from a straight
  //    line drawn from the head to the highest point.
  const pk = st.reduce((a, c) => (c.hTop > a.hTop ? c : a));
  const head = st.find((s) => s.t >= 0.05);
  const seg = st.filter((s) => s.t >= head.t && s.t <= pk.t);
  let dev = 0;
  for (const s of seg) {
    const k = (s.t - head.t) / (pk.t - head.t || 1);
    const line = head.hTop + (pk.hTop - head.hTop) * k;
    dev = Math.max(dev, Math.abs(s.hTop - line) / pk.hTop);
  }

  // 2. Body cross-section: full width vs full depth at the thickest station
  const thick = st.reduce((a, c) => ((c.hTop + c.hBot) > (a.hTop + a.hBot) ? c : a));
  const roundness = (thick.w * 2) / (thick.hTop + thick.hBot);

  // 3. Caudal trailing edge and dorsal fin position, from the built mesh
  const root = buildCreature(sp, 0.5, 'high');
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    b.setFromObject(o); b.getSize(sz); b.getCenter(ctr);
    parts.push({ w: sz.x, h: sz.y, l: sz.z, cy: ctr.y, cz: ctr.z });
  });
  const body = parts.reduce((a, c) => (c.l > a.l ? c : a));
  // dorsal fins: above the midline, on the axis, behind the head (not eyes)
  const dorsals = parts.filter((m) => m !== body && m.cy > body.h * 0.20
    && m.w < body.w * 0.6 && m.cz < sp.length * 0.25);
  const dz = dorsals.length
    ? Math.min(...dorsals.map((d) => (0.5 - d.cz / sp.length))) : NaN;

  // Caudal trailing edge, measured from the vertices rather than trusting the
  // parameter: compare how far back the CENTRE reaches against the lobe tips.
  let cMid = -1e9, cTip = -1e9, hMax = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    b.setFromObject(o); b.getCenter(ctr);
    if (ctr.z > -sp.length * 0.30) return;        // caudal region only
    const pa = o.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
      hMax = Math.max(hMax, Math.abs(v.y));
    }
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld);
      if (Math.abs(v.y) < hMax * 0.35) cMid = Math.max(cMid, -v.z);
      if (Math.abs(v.y) > hMax * 0.70) cTip = Math.max(cTip, -v.z);
    }
  });
  const shape = cMid > cTip + sp.length * 0.010 ? 'ROUNDED'
    : cTip > cMid + sp.length * 0.010 ? 'FORKED' : 'truncate';

  console.log(`\n=== ${id}  (${sp.scientific}) ===`);
  console.log(`  back deviation from straight : ${(dev * 100).toFixed(1)} %   (lower = straighter)`);
  console.log(`  body width / body depth      : ${roundness.toFixed(2)}   (1.0 = circular)`);
  console.log(`  caudal centre reaches        : ${cMid.toFixed(4)} m`);
  console.log(`  caudal lobe tips reach       : ${cTip.toFixed(4)} m`);
  console.log(`  => caudal shape              : ${shape}`);
  console.log(`  dorsal fin origin (frac TL)  : ${dz.toFixed(2)}`);
  console.log(`  dorsal fins                  : ${dorsals.length}`);
}
