// mergeStatic.js — Collapse a chunk's static decor into one mesh per material.
//
// A single mangrove is a trunk plus nine stilt roots of five segments each,
// which is about fifty meshes; a mangrove chunk was building 719 of them and
// taking 58 ms, against 8-13 ms for every other biome. Once real coastlines
// put mangrove along every tropical shore instead of in rare noise patches,
// that became the frame budget.
//
// Two things have to happen for merging to actually help. Geometries must be
// baked into chunk space, and — the part that is easy to miss — the MATERIALS
// have to be shared. Each mangrove built its own `new MeshStandardMaterial`,
// so grouping by material reference would have merged nothing at all. They are
// keyed by their visible properties instead, and identical ones collapse.
//
// Anything that animates is left alone: kelp blades sway per-blade, jellyfish
// pulse, and a merged mesh has no children left to move.

import * as THREE from 'three';

function materialKey(m) {
  return [
    m.type, m.color?.getHexString() ?? '-', m.roughness ?? '-', m.metalness ?? '-',
    m.side, m.transparent ? 1 : 0, m.opacity, m.flatShading ? 1 : 0,
    m.vertexColors ? 1 : 0, m.emissive?.getHexString() ?? '-',
    m.map ? m.map.uuid : '-',
  ].join('|');
}

/** Concatenate geometries that share a material, in the parent's local space. */
function mergeGroup(entries, material, wantColor) {
  let vCount = 0, iCount = 0;
  for (const { geo } of entries) {
    vCount += geo.attributes.position.count;
    iCount += geo.index ? geo.index.count : geo.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3);
  const nrm = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const col = wantColor ? new Float32Array(vCount * 3) : null;
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);

  // The transform is applied by hand rather than through Vector3.applyMatrix4.
  // At tens of thousands of vertices per chunk the accessor and method-call
  // overhead is most of the cost, and this runs on the chunk-streaming path.
  let vo = 0, io = 0;
  for (const { geo, matrix } of entries) {
    const e = matrix.elements;
    const p = geo.attributes.position.array;
    const pn = geo.attributes.normal ? geo.attributes.normal.array : null;
    const pt = geo.attributes.uv ? geo.attributes.uv.array : null;
    const pc = geo.attributes.color ? geo.attributes.color.array : null;
    const count = geo.attributes.position.count;

    // normal matrix = inverse-transpose of the upper 3x3; for the rigid-ish
    // transforms decor uses, the 3x3 itself is close enough and far cheaper,
    // but scaling does appear (rocks, corals), so compute it properly once.
    const n11 = e[0], n12 = e[4], n13 = e[8];
    const n21 = e[1], n22 = e[5], n23 = e[9];
    const n31 = e[2], n32 = e[6], n33 = e[10];
    const det = n11 * (n22 * n33 - n23 * n32) - n12 * (n21 * n33 - n23 * n31) + n13 * (n21 * n32 - n22 * n31);
    const id = det !== 0 ? 1 / det : 0;
    const m11 = (n22 * n33 - n23 * n32) * id, m12 = (n13 * n32 - n12 * n33) * id, m13 = (n12 * n23 - n13 * n22) * id;
    const m21 = (n23 * n31 - n21 * n33) * id, m22 = (n11 * n33 - n13 * n31) * id, m23 = (n13 * n21 - n11 * n23) * id;
    const m31 = (n21 * n32 - n22 * n31) * id, m32 = (n12 * n31 - n11 * n32) * id, m33 = (n11 * n22 - n12 * n21) * id;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3, o3 = (vo + i) * 3;
      const x = p[i3], y = p[i3 + 1], z = p[i3 + 2];
      pos[o3]     = e[0] * x + e[4] * y + e[8]  * z + e[12];
      pos[o3 + 1] = e[1] * x + e[5] * y + e[9]  * z + e[13];
      pos[o3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      if (pn) {
        const nx = pn[i3], ny = pn[i3 + 1], nz = pn[i3 + 2];
        // transposed inverse
        let ax = m11 * nx + m21 * ny + m31 * nz;
        let ay = m12 * nx + m22 * ny + m32 * nz;
        let az = m13 * nx + m23 * ny + m33 * nz;
        const l = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
        nrm[o3] = ax / l; nrm[o3 + 1] = ay / l; nrm[o3 + 2] = az / l;
      }
      if (pt) { uv[(vo + i) * 2] = pt[i * 2]; uv[(vo + i) * 2 + 1] = pt[i * 2 + 1]; }
      if (col) {
        if (pc) { col[o3] = pc[i3]; col[o3 + 1] = pc[i3 + 1]; col[o3 + 2] = pc[i3 + 2]; }
        else { col[o3] = 1; col[o3 + 1] = 1; col[o3 + 2] = 1; }
      }
    }
    if (geo.index) {
      const gi = geo.index.array;
      for (let i = 0, L = gi.length; i < L; i++) idx[io + i] = vo + gi[i];
      io += gi.length;
    } else {
      for (let i = 0; i < count; i++) idx[io + i] = vo + i;
      io += count;
    }
    vo += count;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return new THREE.Mesh(g, material);
}


const SWAY_BUCKETS = 4;

/**
 * Collapse a swaying bed's blades into SWAY_BUCKETS meshes, grouped by phase.
 * chunkManager swings `group.children` reading `swayPhase`/`swayAmp` off each
 * one, so the buckets carry those fields and the animation code is untouched.
 */
function bucketSway(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const blades = [];
  group.traverse((o) => { if (o.isMesh && o.geometry) blades.push(o); });
  if (blades.length <= SWAY_BUCKETS) return group;

  const buckets = [];
  for (let i = 0; i < SWAY_BUCKETS; i++) {
    buckets.push({ entries: [], material: null, wantColor: false, phase: (i / SWAY_BUCKETS) * Math.PI * 2, amp: 0 });
  }
  for (const b of blades) {
    const ph = b.userData.swayPhase ?? 0;
    const k = Math.min(SWAY_BUCKETS - 1, Math.floor(((ph % (Math.PI * 2)) / (Math.PI * 2)) * SWAY_BUCKETS));
    const bk = buckets[k];
    const mat = Array.isArray(b.material) ? b.material[0] : b.material;
    if (!bk.material) bk.material = mat;
    if (b.geometry.attributes.color) bk.wantColor = true;
    bk.amp += b.userData.swayAmp ?? 0.12;
    bk.entries.push({ geo: b.geometry, matrix: new THREE.Matrix4().multiplyMatrices(inv, b.matrixWorld) });
  }

  const out = new THREE.Group();
  out.userData = { ...group.userData };
  out.position.copy(group.position);
  out.quaternion.copy(group.quaternion);
  out.scale.copy(group.scale);
  for (const bk of buckets) {
    if (!bk.entries.length) continue;
    const m = mergeGroup(bk.entries, bk.material, bk.wantColor);
    m.userData.swayPhase = bk.phase;
    m.userData.swayAmp = (bk.amp / bk.entries.length) * 0.55;   // gentler as a block
    out.add(m);
  }
  return out;
}

/**
 * Merge every static mesh under `root`, in place.
 * Subtrees whose group carries `userData.sway`, `userData.jelly` or
 * `userData.keepDynamic` are skipped and re-attached untouched.
 * @returns {{before:number, after:number}} draw-call counts, for the stats panel
 */
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();

  const buckets = new Map();      // key -> { material, entries[], wantColor }
  const keep = [];
  let before = 0;

  // Only DIRECT children are classified. chunkManager finds animated decor with
  // `decor.children.forEach(d => d.userData.sway)` and sways each blade inside
  // it, so a swaying group has to stay a direct child with its own children
  // intact. Wrecks likewise: their node position is read back later.
  for (const child of [...root.children]) {
    const ud = child.userData || {};
    if (ud.sway) {
      // Kelp and seagrass sway per blade, and a bed is around thirty blades —
      // thirty draw calls each, which was the largest single cost left along
      // the coast. Blades are merged into a handful of PHASE BUCKETS instead:
      // each bucket is one mesh that swings as a unit, so the bed still moves
      // out of step with itself rather than as one rigid slab.
      child.traverse((o) => { if (o.isMesh) before++; });
      keep.push(bucketSway(child));
      continue;
    }
    if (ud.jelly || ud.wreck || ud.keepDynamic) {
      child.traverse((o) => { if (o.isMesh) before++; });
      keep.push(child);
      continue;
    }
    child.updateMatrixWorld(true);
    child.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      before++;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!mat) return;
      const key = materialKey(mat);
      let b = buckets.get(key);
      if (!b) { b = { material: mat, entries: [], wantColor: false }; buckets.set(key, b); }
      if (o.geometry.attributes.color) b.wantColor = true;
      b.entries.push({
        geo: o.geometry,
        matrix: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld),
      });
    });
  }

  root.clear();
  let after = 0;
  for (const b of buckets.values()) {
    if (!b.entries.length) continue;
    if (b.wantColor && !b.material.vertexColors) b.material.vertexColors = true;
    root.add(mergeGroup(b.entries, b.material, b.wantColor));
    after++;
  }
  for (const k of keep) { root.add(k); after++; }
  return { before, after };
}
