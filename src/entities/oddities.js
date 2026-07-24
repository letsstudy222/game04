// oddities.js — The five species whose body plans are not streamlined
// swimmers: a disc (manta), a shell (turtle), a plate (sunfish), a mantle with
// a crown of arms (squid) and a globe with a lure (anglerfish).
//
// They still use the same pipeline as the whale: one continuous surface whose
// cross-section morphs along the body, with all fine detail painted into a
// procedurally generated texture. What changes is the station data, the
// vertical-thinning function, and the appendages.

import * as THREE from 'three';
import {
  organicBody, mottle, foil, foilShaded, makeEye, makeSkinTexture, makeBumpTexture,
} from './bodySurface.js';
import { wantsDeform, refreshNormals, resFor } from '../core/lod.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Read a body plan's surface at a station. Appendages MUST be placed with this
 * rather than with hand-typed numbers: when the sunfish was enlarged its fins
 * and eyes stayed at their old coordinates and ended up buried inside the body.
 * Anchoring to the surface makes the parts follow any change to the stations.
 */
export function surfaceAt(plan, t, key, sp = null) {
  // A plan may author its stations directly, or derive them per species (the
  // ray plan serves both a manta and a stingray). Resolve either form.
  const st = typeof plan.stations === 'function' ? plan.stations(sp) : plan.stations;
  for (let i = 0; i < st.length - 1; i++) {
    if (t >= st[i].t && t <= st[i + 1].t) {
      const k = (t - st[i].t) / (st[i + 1].t - st[i].t);
      const e = k * k * (3 - 2 * k);
      return st[i][key] + (st[i + 1][key] - st[i][key]) * e;
    }
  }
  return st[st.length - 1][key];
}
const _c = new THREE.Color();
const vcFin = () => new THREE.MeshStandardMaterial(
  { vertexColors: true, roughness: 0.68, side: THREE.DoubleSide });

function eyes(root, { r, x, y, z, iris, pupil = 0x0a0b0d }) {
  for (const s of [-1, 1]) {
    const e = makeEye(r, iris, pupil);
    e.scale.x = s;
    e.position.set(s * x, y, z);
    root.add(e);
  }
}

/* ------------------------------------------------------- ray disc profiles */

// Mobula birostris: a wide diamond with drawn-out, pointed wingtips. Disc width
// runs about 2.2–2.4x the disc length, so the plan is short in Z and very broad.
const DISC_MANTA = [
  { t: 0.00, w: 0.085, hTop: 0.016, hBot: 0.013, yOff: 0 },
  { t: 0.07, w: 0.200, hTop: 0.028, hBot: 0.023, yOff: 0 },
  { t: 0.16, w: 0.315, hTop: 0.036, hBot: 0.029, yOff: 0 },
  { t: 0.28, w: 0.425, hTop: 0.039, hBot: 0.030, yOff: 0 },
  { t: 0.40, w: 0.487, hTop: 0.035, hBot: 0.026, yOff: 0 },
  { t: 0.50, w: 0.500, hTop: 0.029, hBot: 0.021, yOff: 0 },
  { t: 0.62, w: 0.440, hTop: 0.022, hBot: 0.015, yOff: 0 },
  { t: 0.74, w: 0.330, hTop: 0.015, hBot: 0.010, yOff: 0 },
  { t: 0.85, w: 0.205, hTop: 0.010, hBot: 0.007, yOff: 0 },
  { t: 0.94, w: 0.100, hTop: 0.006, hBot: 0.004, yOff: 0 },
  { t: 1.00, w: 0.030, hTop: 0.003, hBot: 0.002, yOff: 0 },
];

// Taeniura lymma: a rounded oval, and markedly THICKER through the body than a
// manta — roughly 13% of disc width against the manta's 6%. Widths follow an
// ellipse rather than a diamond, so there are no drawn-out wingtips.
const DISC_OVAL = [
  { t: 0.00, w: 0.090, hTop: 0.030, hBot: 0.024, yOff: 0 },
  { t: 0.07, w: 0.250, hTop: 0.048, hBot: 0.038, yOff: 0 },
  { t: 0.16, w: 0.362, hTop: 0.064, hBot: 0.050, yOff: 0 },
  { t: 0.28, w: 0.448, hTop: 0.074, hBot: 0.058, yOff: 0 },
  { t: 0.40, w: 0.489, hTop: 0.072, hBot: 0.056, yOff: 0 },
  { t: 0.50, w: 0.500, hTop: 0.066, hBot: 0.050, yOff: 0 },
  { t: 0.62, w: 0.484, hTop: 0.055, hBot: 0.041, yOff: 0 },
  { t: 0.74, w: 0.438, hTop: 0.042, hBot: 0.030, yOff: 0 },
  { t: 0.85, w: 0.356, hTop: 0.029, hBot: 0.020, yOff: 0 },
  { t: 0.94, w: 0.236, hTop: 0.018, hBot: 0.012, yOff: 0 },
  { t: 1.00, w: 0.080, hTop: 0.011, hBot: 0.007, yOff: 0 },
];

/**
 * Distinct round spots, as on a bluespotted ribbontail ray. Value noise alone
 * produces blotches; real spots need cell structure, so this is a cheap Worley
 * field. Cells wrap in u so there is no seam down the side of the animal.
 * Returns the distance to the nearest cell centre and that cell's radius.
 */
function spotField(u, v, density, seed) {
  const D = Math.round(density);
  const gx = u * D, gy = v * D;
  const ix = Math.floor(gx), iy = Math.floor(gy);
  let best = 9, second = 9, br = 0.3, bid = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cx = ix + dx, cy = iy + dy;
      const wx = ((cx % D) + D) % D;          // wrap so u = 0 and u = 1 agree
      const jx = mottle(wx * 1.7 + seed, cy * 2.3 + seed);
      const jy = mottle(wx * 3.1 + seed, cy * 1.1 - seed);
      const d = Math.hypot(gx - (cx + jx), gy - (cy + jy));
      if (d < best) { second = best; best = d; br = 0.15 + jx * 0.15; bid = jy; }
      else if (d < second) { second = d; }
    }
  }
  // (second - best) is near zero exactly on a cell boundary, which is what
  // draws the polygon edges of a mud crab's marbling.
  return { d: best, r: br, id: bid, edge: second - best };
}

/** Scratch colour for vertex-shaded appendages. */
const _tc = new THREE.Color();

/**
 * A thin membrane hanging beneath a tail — the "ribbon" of a ribbontail ray.
 *
 * foil() cannot do this job: it fan-triangulates from a single corner, which
 * degenerates on a long sliver, and its thickness taper follows vertex index
 * rather than distance from the root. Worse, an outline of a handful of points
 * gives a lower edge made of straight segments, which reads as chunky and
 * faceted. Here the depth profile is sampled densely instead, so the fold has
 * a smooth continuous margin.
 *
 * @param {number} zStart  z where the fold begins (nearest the body)
 * @param {number} zEnd    z at the tail tip
 * @param {function} depthAt  (k 0..1) => depth below the tail axis
 */
function finFold(zStart, zEnd, depthAt, n = 26, thickness = 0.0018) {
  const pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const z = zStart + (zEnd - zStart) * k;
    const d = depthAt(k);
    for (const s of [-1, 1]) {
      pos.push(s * thickness, 0, z);           // upper edge, on the tail axis
      pos.push(s * thickness * 0.35, -d, z);   // lower margin, thinner
    }
  }
  const S = 4;   // per station: (-t top), (-t bot), (+t top), (+t bot)
  for (let i = 0; i < n; i++) {
    const a = i * S, b = (i + 1) * S;
    idx.push(a, a + 1, b, b, a + 1, b + 1);               // left face
    idx.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3);   // right face
    idx.push(a + 1, a + 3, b + 1, b + 1, a + 3, b + 3);   // lower rim
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Ray colours resolved once per species rather than per texel.
const _rayPal = new Map();
function rayPal(sp) {
  let p = _rayPal.get(sp.id);
  if (!p) {
    p = {
      back: new THREE.Color(sp.colors.body),
      deep: new THREE.Color(sp.colors.fin ?? sp.colors.body),
      belly: new THREE.Color(sp.colors.belly),
      patch: new THREE.Color(0xdae3e9),
      dark: new THREE.Color(0x39424b),
      spot: new THREE.Color(0x2fc9f5),
      spotRim: new THREE.Color(0x0d5f86),
    };
    _rayPal.set(sp.id, p);
  }
  return p;
}

export const ODD_PLANS = {

  /* ------------------------------------------------------------------- RAYS */
  // Two very different animals share this plan: the giant manta (a broad
  // diamond with cephalic fins and a terminal mouth) and the bluespotted
  // ribbontail ray (a thick rounded oval with a ventral mouth, protruding eyes
  // and a long striped tail). `morph.disc` selects which.
  ray: {
    bodyLength: (sp) => sp.morph?.discLen ?? 0.44,
    norm: (L) => L / 1.0,      // species.length is the DISC WIDTH (wingspan)
    stations: (sp) => (sp.morph?.disc === 'oval' ? DISC_OVAL : DISC_MANTA),
    // Margins must thin towards the edge; a plain ellipse stays fat too far out.
    yScaleFor: (sp) => {
      const k = sp.morph?.disc === 'oval' ? 0.50 : 0.42;
      const floor = sp.morph?.disc === 'oval' ? 0.06 : 0.05;
      return (t, ct) => floor + Math.exp(-Math.pow(ct / k, 2));
    },
    anim: { kind: 'wingwave', freq: 0.55, amp: 0.055, wave: 2.2 },
    skin(u, v, sp) {
      const p = rayPal(sp);
      const s = Math.sin(u * Math.PI * 2);
      const oval = sp.morph?.disc === 'oval';

      if (oval) {
        if (s > 0) {
          // Dorsal: yellow-brown ground carrying the neon-blue spots that warn
          // of the tail spines. Spots are brightest on the disc centre and thin
          // out towards the margin, as in life.
          _c.copy(p.back).lerp(p.deep, ss(0.15, 1, s) * 0.5);
          _c.offsetHSL(0, 0, (mottle(v * 20, u * 9) - 0.5) * 0.07);
          const { d, r } = spotField(u, v, 13, 4.1);
          const core = 1 - ss(r * 0.62, r * 0.95, d);
          const rim = (1 - ss(r * 0.95, r * 1.25, d)) - core;
          const fade = ss(0.03, 0.16, v) * (1 - ss(0.86, 0.99, v));
          _c.lerp(p.spotRim, Math.max(0, rim) * 0.55 * fade);
          _c.lerp(p.spot, core * 0.92 * fade);
        } else {
          // Ventral: plain cream, with the mouth and five gill slit pairs.
          _c.copy(p.belly);
          const lat = Math.abs(Math.cos(u * Math.PI * 2));
          const mouth = Math.exp(-Math.pow((v - 0.16) / 0.045, 2))
                      * Math.exp(-Math.pow(lat / 0.20, 2));
          _c.multiplyScalar(1 - mouth * 0.7);
          for (let i = 0; i < 5; i++) {
            const gv = 0.24 + i * 0.040;
            const d = Math.hypot((v - gv) * 6, (lat - 0.20) * 1.7);
            _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.02) * 0.5);
          }
        }
      } else if (s > 0) {
        // Manta dorsal: slate blue-grey. Photographs look near-black only
        // because of backlighting; lit from above a manta reads clearly
        // blue-grey, with the pale shoulder patches standing out strongly.
        _c.copy(p.back).lerp(p.deep, ss(0, 1, s));
        const patch = Math.exp(-Math.pow((v - 0.19) / 0.10, 2))
                    * Math.exp(-Math.pow((Math.abs(Math.cos(u * Math.PI * 2)) - 0.30) / 0.19, 2));
        _c.lerp(p.patch, patch * 0.95);
        _c.offsetHSL(0, 0, (mottle(v * 18, u * 8) - 0.5) * 0.09);
      } else {
        // Manta ventral: white with the unique spot pattern used to ID
        // individual animals.
        _c.copy(p.belly);
        const q = mottle(v * 22, u * 9);
        if (q > 0.80 && v > 0.25 && v < 0.75) _c.lerp(p.dark, (q - 0.80) * 4);
        for (let i = 0; i < 5; i++) {
          const gv = 0.20 + i * 0.045;
          const lat = Math.abs(Math.cos(u * Math.PI * 2));
          const d = Math.hypot((v - gv) * 5, (lat - 0.16) * 1.6);
          _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.02) * 0.55);
        }
      }
      _c.offsetHSL(0, 0, (mottle(v * 70, u * 30) - 0.5) * 0.04);
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v, sp) {
      let h = 0.55 + (mottle(v * 80, u * 34) - 0.5) * 0.05;
      // the ribbontail's spiracles sit just behind the eyes as real hollows
      if (sp.morph?.disc === 'oval' && Math.sin(u * Math.PI * 2) > 0) {
        const lat = Math.cos(u * Math.PI * 2);
        const d = Math.hypot((v - 0.26) * 5, (Math.abs(lat) - 0.17) * 2.2);
        h -= Math.exp(-(d * d) / 0.03) * 0.35;
        // small flat denticles run the midback in adults
        if (Math.abs(lat) < 0.22) {
          h += (mottle(v * 150, u * 60) - 0.5) * 0.10 * (1 - ss(0.75, 0.95, v));
        }
      }
      return h;
    },
    groove: () => 0,
    parts(root, sp) {
      const m = sp.morph || {};
      const BL = m.discLen ?? 0.44;
      const zAt = (t) => (0.5 - t) * BL;

      if (m.disc === 'oval') {
        /* ---------------------------------- bluespotted ribbontail ray ----
         * Sources describe the tail as broad-based and DEPRESSED, tapering
         * rapidly to the stings and slightly compressed beyond them, with a
         * deep ventral cutaneous fold running all the way to the tip — that
         * fold is what "ribbontail" refers to, and a plain tapered cylinder
         * misses it entirely. The stings sit further back than on most
         * stingrays. A very low fleshy ridge runs the dorsal midline.
         */
        const TL = m.tailLen ?? 1.30;
        const zBase = zAt(1.0);
        const bodyCol = new THREE.Color(sp.colors.body);
        const blueCol = new THREE.Color(0x1fb4ea);

        // --- tail core: wider than tall at the base, narrowing past the sting
        const tailGeo = organicBody({
          stations: [
            { t: 0.00, w: 0.080, hTop: 0.030, hBot: 0.028, yOff: 0 },
            { t: 0.12, w: 0.062, hTop: 0.025, hBot: 0.024, yOff: 0 },
            { t: 0.28, w: 0.042, hTop: 0.020, hBot: 0.019, yOff: 0 },
            { t: 0.45, w: 0.028, hTop: 0.016, hBot: 0.015, yOff: 0 },
            { t: 0.58, w: 0.021, hTop: 0.015, hBot: 0.013, yOff: 0 },
            { t: 0.72, w: 0.014, hTop: 0.014, hBot: 0.012, yOff: 0 },
            { t: 0.85, w: 0.009, hTop: 0.012, hBot: 0.010, yOff: 0 },
            { t: 0.94, w: 0.006, hTop: 0.009, hBot: 0.008, yOff: 0 },
            { t: 1.00, w: 0.003, hTop: 0.006, hBot: 0.005, yOff: 0 },
          ],
          length: TL, 
          // Follow the LOD tier the disc was built at rather than hardcoding —
          // a distant ray must not pay for a full-resolution tail.
          segments: Math.max(14, Math.round((root._segments ?? 44) * 0.55)),
          radial: Math.max(8, Math.round((root._radial ?? 16) * 0.32)),
          groove: (t, th) => -Math.pow(Math.max(0, Math.sin(th)), 16) * 0.10,
          shade: (t, th) => {
            // the pair of blue side-stripes the species is known for
            const lat = Math.pow(Math.abs(Math.cos(th)), 5);
            const along = ss(0.02, 0.14, t) * (1 - ss(0.84, 1.0, t));
            return _tc.copy(bodyCol).lerp(blueCol, lat * along * 0.95);
          },
        });
        const tail = new THREE.Mesh(tailGeo, new THREE.MeshStandardMaterial(
          { vertexColors: true, roughness: 0.6 }));
        tail.position.z = zBase - TL / 2;
        root.add(tail);
        root._tail = tail;

        // --- deep ventral fin fold, reaching the tail tip
        const foldMat = new THREE.MeshStandardMaterial({
          color: sp.colors.body, roughness: 0.62, side: THREE.DoubleSide });
        const fold = new THREE.Mesh(finFold(
          zBase - 0.16 * TL, zBase - TL,
          // deepest a little past mid-tail, still present at the very tip
          (k) => 0.058 * ss(0, 0.26, k) * (1 - ss(0.70, 1.0, k) * 0.80),
          Math.max(12, Math.round((root._segments ?? 44) * 0.45)),
        ), foldMat);
        root.add(fold);

        // --- stings: usually two, set well back, flat blades rather than spikes
        const stingMat = new THREE.MeshStandardMaterial(
          { color: 0x40372c, roughness: 0.45 });
        for (const [k, s] of [[0.54, 1.0], [0.60, 0.76]]) {
          const st = new THREE.Mesh(
            new THREE.ConeGeometry(0.012 * s, 0.125 * s, 5), stingMat);
          st.scale.x = 0.32;
          st.rotation.x = -Math.PI / 2 - 0.30;
          st.position.set(0, 0.013, zBase - k * TL);
          root.add(st);
        }

        // --- pelvic fins: moderate and slender, tucked behind the disc
        for (const s of [-1, 1]) {
          const pv = new THREE.Mesh(foil([
            [0.000, 0.000], [0.062, -0.018], [0.082, -0.070],
            [0.036, -0.086], [0.005, -0.042],
          ], 0.004, 0.4), foldMat);
          pv.scale.x = s;
          pv.position.set(s * 0.070, -0.004, zAt(0.88));
          root.add(pv);
        }

        // Large protruding eyes on TOP of the disc — the feature that most
        // separates this animal from an eagle ray or a manta at a glance.
        const eT = 0.20;
        eyes(root, {
          r: 0.030,
          x: 0.088,
          y: surfaceAt({ stations: DISC_OVAL }, eT, 'hTop') * 0.86,
          z: zAt(eT),
          iris: 0xe0b03a, pupil: 0x120e08,
        });
        return;
      }

      /* --------------------------------------------------- giant manta ---- */
      const dark = new THREE.MeshStandardMaterial({ color: 0x4a5b6b, roughness: 0.72 });
      // cephalic fins — the twin paddles that funnel plankton to the mouth
      for (const s of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.030, 0.115, 10), dark);
        horn.rotation.x = Math.PI / 2 + 0.35;
        horn.rotation.z = s * 0.22;
        horn.position.set(s * 0.062, -0.012, zAt(0.0) + 0.05);
        root.add(horn);
      }
      // whip tail
      const tLen = m.tailLen ?? 0.46;
      const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.011, tLen, 6), dark);
      tail.rotation.x = Math.PI / 2;
      tail.position.z = zAt(1.0) - tLen / 2;
      root.add(tail);

      // Head block. A manta's head stands proud of the disc between the
      // cephalic fins, and the eyes sit on its sides — without it the eyes
      // ended up buried inside the wing surface.
      const headMat = new THREE.MeshStandardMaterial({ color: 0x4d5f70, roughness: 0.7 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), headMat);
      head.scale.set(1.15, 0.62, 1.30);
      head.position.set(0, -0.012, zAt(0.13));
      root.add(head);
      // wide terminal mouth across the front of the head
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.020, 0.030),
        new THREE.MeshStandardMaterial({ color: 0x141a20, roughness: 1 }));
      mouth.position.set(0, -0.022, zAt(0.02));
      root.add(mouth);
      // eyes on the sides of that head block, clear of the disc
      eyes(root, { r: 0.021, x: 0.104, y: 0.002, z: zAt(0.11), iris: 0x3b4e5c });
    },
  },

  /* -------------------------------------------------------------- SEA TURTLE */
  turtle: {
    bodyLength: 1.0,           // carapace length
    norm: (L) => L / 1.0,
    stations: [
      { t: 0.00, w: 0.075, hTop: 0.045, hBot: 0.030, yOff: 0 },
      { t: 0.07, w: 0.225, hTop: 0.120, hBot: 0.062, yOff: 0 },
      { t: 0.18, w: 0.352, hTop: 0.166, hBot: 0.086, yOff: 0 },
      { t: 0.32, w: 0.415, hTop: 0.187, hBot: 0.096, yOff: 0 },
      { t: 0.46, w: 0.430, hTop: 0.192, hBot: 0.099, yOff: 0 },
      { t: 0.60, w: 0.412, hTop: 0.182, hBot: 0.093, yOff: 0 },
      { t: 0.74, w: 0.350, hTop: 0.156, hBot: 0.078, yOff: 0 },
      { t: 0.86, w: 0.252, hTop: 0.114, hBot: 0.056, yOff: 0 },
      { t: 0.95, w: 0.140, hTop: 0.064, hBot: 0.030, yOff: 0 },
      { t: 1.00, w: 0.050, hTop: 0.026, hBot: 0.012, yOff: 0 },
    ],
    yScale: (t, ct) => 0.35 + 0.65 * Math.exp(-Math.pow(ct / 0.75, 2)),
    anim: { kind: 'flipperFlap', freq: 1.5, amp: 0.5 },
    skin(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      if (s > 0.05) {
        // Carapace: olive plates with pale sutures between them. The scute
        // layout is 5 vertebral down the midline, 4 costal either side.
        _c.set(0x4e6438);
        const lat = Math.cos(u * Math.PI * 2);          // -1..1 across the shell
        const col = Math.abs(lat) < 0.24 ? 0 : (Math.abs(lat) < 0.62 ? 1 : 2);
        const rows = col === 0 ? 5 : 4;
        const cellV = v * rows;
        const fv = Math.abs(cellV - Math.floor(cellV) - 0.5) * 2;   // 0 centre, 1 suture
        const bandEdges = [0.24, 0.62, 1.0];
        const lo = col === 0 ? 0 : bandEdges[col - 1];
        const hi = bandEdges[col];
        const fu = Math.abs((Math.abs(lat) - lo) / (hi - lo) - 0.5) * 2;
        const suture = Math.max(Math.pow(fv, 7), Math.pow(fu, 7));
        // each plate carries a lighter sunburst from its centre
        _c.lerp(new THREE.Color(0x86995e), (1 - fv) * (1 - fu) * 0.45);
        _c.lerp(new THREE.Color(0x2d3a22), suture * 0.85);
        // marginal scutes around the rim
        if (Math.abs(lat) > 0.86) {
          const m = Math.abs(Math.cos(v * Math.PI * 22));
          _c.lerp(new THREE.Color(0x33421f), Math.pow(m, 8) * 0.6);
        }
      } else {
        // Plastron: cream, with soft plate seams.
        _c.set(0xd9cda2);
        const seam = Math.pow(Math.abs(Math.cos(v * Math.PI * 6)), 10);
        _c.lerp(new THREE.Color(0xa89a72), seam * 0.5);
      }
      _c.offsetHSL(0, 0, (mottle(v * 60, u * 26) - 0.5) * 0.05);
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      let h = 0.55;
      if (s > 0.05) {
        const lat = Math.cos(u * Math.PI * 2);
        const col = Math.abs(lat) < 0.24 ? 0 : (Math.abs(lat) < 0.62 ? 1 : 2);
        const rows = col === 0 ? 5 : 4;
        const cellV = v * rows;
        const fv = Math.abs(cellV - Math.floor(cellV) - 0.5) * 2;
        h -= Math.pow(fv, 7) * 0.45;                 // sutures sink
        h += (1 - fv) * 0.12;                        // plates bulge
      }
      return h;
    },
    groove: () => 0,
    parts(root, sp) {
      const skin = new THREE.MeshStandardMaterial({ color: 0x5d7048, roughness: 0.8 });
      const fm = vcFin();
      const mk = (o, th, tp) => new THREE.Mesh(
        foilShaded(o, th, tp, 0x6a7f52, 0x36432a), fm);
      // head and neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.085, 0.15, 12), skin);
      neck.rotation.x = Math.PI / 2 - 0.22;
      neck.position.set(0, 0.028, 0.55);
      root.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 14), skin);
      head.scale.set(0.9, 0.85, 1.3);
      head.position.set(0, 0.055, 0.655);
      root.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.07, 10), skin);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.035, 0.74);
      root.add(beak);
      eyes(root, { r: 0.021, x: 0.062, y: 0.075, z: 0.695, iris: 0x8a6a2c });
      // long front paddles + short rear rudders
      root._flippers = [];
      for (const s of [-1, 1]) {
        const f = mk([
          [0.000, 0.090], [0.120, 0.055], [0.300, -0.070],
          [0.400, -0.180], [0.290, -0.215], [0.130, -0.130], [0.010, -0.055],
        ], 0.012, 0.22);
        f.scale.x = s;
        f.position.set(s * 0.31, 0.005, 0.20);
        f.rotation.x = -0.1;
        root.add(f); root._flippers.push(f);
      }
      for (const s of [-1, 1]) {
        const f = mk([
          [0.000, 0.055], [0.090, 0.020], [0.150, -0.080], [0.060, -0.115], [0.005, -0.050],
        ], 0.010, 0.25);
        f.scale.x = s;
        f.position.set(s * 0.26, -0.03, -0.36);
        root.add(f); root._flippers.push(f);
      }
    },
  },

  /* ---------------------------------------------------------------- SUNFISH */
  sunfish: {
    bodyLength: 1.0,
    norm: (L) => L / 1.0,
    stations: [
      { t: 0.00, w: 0.048, hTop: 0.078, hBot: 0.064, yOff: 0 },
      { t: 0.07, w: 0.112, hTop: 0.196, hBot: 0.170, yOff: 0 },
      { t: 0.18, w: 0.156, hTop: 0.322, hBot: 0.284, yOff: 0 },
      { t: 0.32, w: 0.175, hTop: 0.418, hBot: 0.372, yOff: 0 },
      { t: 0.47, w: 0.177, hTop: 0.455, hBot: 0.408, yOff: 0 },
      { t: 0.60, w: 0.166, hTop: 0.446, hBot: 0.396, yOff: 0 },
      { t: 0.72, w: 0.148, hTop: 0.414, hBot: 0.362, yOff: 0 },
      { t: 0.84, w: 0.122, hTop: 0.368, hBot: 0.318, yOff: 0 },
      { t: 0.93, w: 0.098, hTop: 0.322, hBot: 0.276, yOff: 0 },
      { t: 1.00, w: 0.076, hTop: 0.284, hBot: 0.242, yOff: 0 },
    ],
    anim: { kind: 'sunScull', freq: 0.6, amp: 0.26 },
    skin(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      _c.set(0xe3e9ea).lerp(new THREE.Color(0x7d8b93), ss(0.15, 0.78, up));
      if (up > 0.8) _c.lerp(new THREE.Color(0x5d6a72), ss(0.8, 1, up));
      // Sunfish hide is thick, leathery and covered in coarse blotching.
      const b1 = mottle(v * 26, u * 11), b2 = mottle(v * 62 + 4, u * 26);
      _c.offsetHSL(0, 0, (b1 * 0.6 + b2 * 0.4 - 0.5) * 0.14);
      // small round mouth, permanently open
      const dm = Math.hypot((v - 0.035) * 7, s * 0.5);
      if (dm < 0.12) _c.lerp(new THREE.Color(0x25303a), 1 - dm / 0.12);
      // gill opening
      const dg = Math.hypot((v - 0.155) * 6, (Math.abs(s) - 0.25) * 1.2);
      _c.multiplyScalar(1 - Math.exp(-(dg * dg) / 0.02) * 0.4);
      return [_c.r, _c.g, _c.b];
    },
    bump: (u, v) => 0.55 + (mottle(v * 90, u * 40) - 0.5) * 0.16,   // coarse hide
    groove: () => 0,
    parts(root, sp) {
      const P = ODD_PLANS.sunfish;
      const fm = vcFin();
      const mk = (o, th, tp) => new THREE.Mesh(
        foilShaded(o, th, tp, 0x9aa7ae, 0x4d5a63), fm);
      const zAt = (t) => 0.5 - t;              // bodyLength is 1.0

      // clavus — the blunt rudder that replaces a tail, scalloped edge
      const clav = mk([
        [0.000, -0.02], [0.330, -0.090], [0.365, -0.175],
        [-0.365, -0.175], [-0.330, -0.090],
      ], 0.026, 0.5);
      clav.rotation.z = Math.PI / 2;
      clav.position.z = -0.50;
      root.add(clav);
      for (let i = 0; i < 8; i++) {           // scallops along its edge
        const y = -0.30 + (i / 7) * 0.60;
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), fm);
        lobe.material = new THREE.MeshStandardMaterial({ color: 0x6c7982, roughness: 0.7 });
        lobe.scale.set(0.5, 1, 0.55);
        lobe.position.set(0, y, -0.66);
        root.add(lobe);
      }

      // Tall dorsal and anal fins, anchored ON the body surface.
      root._fins = [];
      for (const dir of [1, -1]) {
        const tF = dir > 0 ? 0.45 : 0.50;
        const surf = surfaceAt(P, tF, dir > 0 ? 'hTop' : 'hBot');
        const f = mk([
          [0.000, 0.080], [0.170, 0.024], [0.290, -0.095],
          [0.165, -0.160], [0.022, -0.130],
        ], 0.018, 0.28);
        f.rotation.z = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        f.position.set(0, dir * (surf - 0.015), zAt(tF));
        root.add(f);
        root._fins.push({ mesh: f, dir });
      }

      // Pectoral fins on the flank.
      {
        const tP = 0.30;
        const surf = surfaceAt(P, tP, 'w');
        for (const s of [-1, 1]) {
          const pf = mk([
            [0.000, 0.055], [0.075, 0.014], [0.100, -0.060], [0.012, -0.072],
          ], 0.007, 0.3);
          pf.scale.x = s;
          pf.position.set(s * (surf - 0.012), 0.055, zAt(tP));
          pf.rotation.z = s * 0.35;
          root.add(pf);
        }
      }

      // Gill flap — a raised crescent behind the head.
      {
        const tG = 0.16;
        const surf = surfaceAt(P, tG, 'w');
        for (const s of [-1, 1]) {
          const g = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x5f6d76, roughness: 0.8 }));
          g.scale.set(0.35, 1.5, 0.5);
          g.position.set(s * (surf - 0.02), 0.03, zAt(tG));
          root.add(g);
        }
      }

      // Mouth: small, round, permanently open — a sunfish trait.
      {
        const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10),
          new THREE.MeshStandardMaterial({ color: 0x1f2932, roughness: 1 }));
        mouth.scale.set(0.7, 1.1, 0.7);
        mouth.position.set(0, 0.02, zAt(0.02));
        root.add(mouth);
      }

      // Eyes, sat proud of the flank.
      {
        const tE = 0.15;
        const surf = surfaceAt(P, tE, 'w');
        eyes(root, { r: 0.042, x: surf - 0.008,
                     y: surfaceAt(P, tE, 'hTop') * 0.42, z: zAt(tE),
                     iris: 0x7f95a3 });
      }
    },
  },

  /* ----------------------------------------------------------- GIANT SQUID */
  squid: {
    bodyLength: 1.22,          // head + mantle, in mantle-length units
    norm: (L) => L / 3.4,      // mantle tip to tentacle tip, arms relaxed
    stations: [
      { t: 0.00, w: 0.052, hTop: 0.048, hBot: 0.048, yOff: 0 },   // arm crown base
      { t: 0.07, w: 0.078, hTop: 0.072, hBot: 0.072, yOff: 0 },
      { t: 0.15, w: 0.092, hTop: 0.086, hBot: 0.086, yOff: 0 },   // head, eyes here
      { t: 0.22, w: 0.070, hTop: 0.066, hBot: 0.066, yOff: 0 },   // collar
      { t: 0.30, w: 0.096, hTop: 0.092, hBot: 0.092, yOff: 0 },   // mantle opening
      { t: 0.42, w: 0.104, hTop: 0.100, hBot: 0.100, yOff: 0 },   // widest
      { t: 0.56, w: 0.094, hTop: 0.090, hBot: 0.090, yOff: 0 },
      { t: 0.70, w: 0.072, hTop: 0.069, hBot: 0.069, yOff: 0 },
      { t: 0.82, w: 0.048, hTop: 0.046, hBot: 0.046, yOff: 0 },
      { t: 0.92, w: 0.026, hTop: 0.025, hBot: 0.025, yOff: 0 },
      { t: 1.00, w: 0.005, hTop: 0.005, hBot: 0.005, yOff: 0 },   // pointed tail
    ],
    anim: { kind: 'jetArms', freq: 0.85, amp: 1 },
    skin(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      // deep red mantle above, pale below — and chromatophore speckling, the
      // pigment cells a squid uses to flush colour across its skin
      _c.set(0xd8a9a4).lerp(new THREE.Color(0x8e3546), ss(0.2, 0.85, up));
      const chrom = mottle(v * 120, u * 52);
      if (chrom > 0.62) _c.lerp(new THREE.Color(0x5e1f2e), (chrom - 0.62) * 1.6);
      const fine = mottle(v * 260, u * 110);
      _c.offsetHSL(0, 0.05, (fine - 0.5) * 0.07);
      // funnel opening on the ventral collar
      const df = Math.hypot((v - 0.235) * 6, (s + 0.85) * 1.1);
      if (df < 0.12) _c.lerp(new THREE.Color(0x3a1620), 1 - df / 0.12);
      return [_c.r, _c.g, _c.b];
    },
    bump: (u, v) => 0.55 + (mottle(v * 150, u * 64) - 0.5) * 0.08,
    groove(t, th) {
      // collar constriction between head and mantle
      if (t > 0.18 && t < 0.27) return Math.exp(-Math.pow((t - 0.225) / 0.03, 2)) * 0.1;
      return 0;
    },
    parts(root, sp) {
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xa0505d, roughness: 0.55 });
      const paleMat = new THREE.MeshStandardMaterial({ color: 0xd8a9a4, roughness: 0.5 });
      const fm = vcFin();
      const half = 1.22 / 2;
      // terminal fins — big rhomboids either side of the pointed mantle
      for (const s of [-1, 1]) {
        const fin = new THREE.Mesh(foilShaded([
          [0.000, 0.130], [0.140, 0.055], [0.175, -0.090],
          [0.090, -0.230], [0.010, -0.250],
        ], 0.010, 0.25, 0xb5626d, 0x6d2836), fm);
        fin.scale.x = s;
        fin.position.set(0, 0, -half + 0.30);
        root.add(fin);
      }
      // Arms and tentacles: chains of pivots so they trail and ripple.
      root._arms = [];
      const crownZ = half - 0.02;
      const buildLimb = (x, y, segN, segLen, r0, r1, phase, club) => {
        const grp = new THREE.Group();
        grp.position.set(x, y, crownZ);
        let parent = grp;
        for (let i = 0; i < segN; i++) {
          const a = r0 + (r1 - r0) * (i / segN);
          const b = r0 + (r1 - r0) * ((i + 1) / segN);
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(b, a, segLen, 8), bodyMat);
          seg.rotation.x = Math.PI / 2;
          seg.position.z = segLen / 2;
          const piv = new THREE.Group();
          piv.position.z = i === 0 ? 0 : segLen;
          piv.add(seg);
          parent.add(piv);
          parent = piv;
          root._arms.push({ mesh: piv, phase: phase + i * 0.5, amp: 0.055 + i * 0.045 });
        }
        if (club) {
          const c = new THREE.Mesh(new THREE.SphereGeometry(0.030, 12, 10), paleMat);
          c.scale.set(0.75, 0.75, 2.4);
          c.position.z = 0.14;
          parent.add(c);
        }
        return grp;
      };
      // eight arms in a ring
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        root.add(buildLimb(Math.cos(a) * 0.055, Math.sin(a) * 0.055,
          6, 0.185, 0.026, 0.006, i * 0.75, false));
      }
      // two long hunting tentacles with terminal clubs
      for (const s of [-1, 1]) {
        root.add(buildLimb(s * 0.038, -0.030, 9, 0.28, 0.017, 0.011,
          s > 0 ? 0.3 : 2.2, true));
      }
      // funnel
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.040, 0.09, 10), bodyMat);
      funnel.rotation.x = Math.PI / 2 - 0.55;
      funnel.position.set(0, -0.070, half - 0.28);
      root.add(funnel);
      // the largest eyes in the animal kingdom — 27 cm across on a real one
      eyes(root, { r: 0.062, x: 0.088, y: 0.006, z: half - 0.18,
                   iris: 0xe6d79a, pupil: 0x0a0a0c });
    },
  },


  /* -------------------------------------------------------------- SEA SNAKE */
  snake: {
    // A sea krait is a rope with a paddle on the end: nearly constant girth,
    // strongly compressed side-to-side, and a tail that flares into a blade.
    bodyLength: 1.0,
    norm: (L) => L / 1.0,
    stations: [
      { t: 0.00, w: 0.014, hTop: 0.015, hBot: 0.013, yOff: 0 },
      { t: 0.03, w: 0.021, hTop: 0.024, hBot: 0.021, yOff: 0 },
      { t: 0.07, w: 0.024, hTop: 0.029, hBot: 0.025, yOff: 0 },   // head
      { t: 0.11, w: 0.019, hTop: 0.025, hBot: 0.022, yOff: 0 },   // neck
      { t: 0.25, w: 0.024, hTop: 0.036, hBot: 0.032, yOff: 0 },
      { t: 0.45, w: 0.026, hTop: 0.041, hBot: 0.037, yOff: 0 },
      { t: 0.62, w: 0.025, hTop: 0.042, hBot: 0.038, yOff: 0 },
      { t: 0.76, w: 0.022, hTop: 0.046, hBot: 0.042, yOff: 0 },
      { t: 0.86, w: 0.017, hTop: 0.058, hBot: 0.053, yOff: 0 },   // paddle flares
      { t: 0.93, w: 0.012, hTop: 0.064, hBot: 0.058, yOff: 0 },
      { t: 0.98, w: 0.007, hTop: 0.052, hBot: 0.047, yOff: 0 },
      { t: 1.00, w: 0.003, hTop: 0.028, hBot: 0.025, yOff: 0 },
    ],
    anim: { kind: 'spineSide', freq: 1.9, amp: 0.055, bendFrom: 0.02, wave: 1.7 },
    skin(u, v, sp) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      const pale = new THREE.Color(0xdfe7ee);
      const blue = new THREE.Color(sp.colors.body);
      // Banded: 26 dark rings that wrap right around the body.
      const band = Math.pow(Math.abs(Math.cos(v * Math.PI * 26)), 0.55);
      _c.copy(pale).lerp(blue, band);
      _c.lerp(new THREE.Color(0x14141c), band * 0.55);
      // paler underside between the bands
      if (up < 0.4) _c.lerp(pale, (0.4 - up) * 0.9 * (1 - band));
      // scale grain
      const sc = Math.abs(Math.cos(v * Math.PI * 150)) * Math.abs(Math.cos(u * Math.PI * 2 * 22));
      _c.offsetHSL(0, 0, (sc - 0.5) * 0.05);
      // dark cap over the snout
      if (v < 0.075) _c.lerp(new THREE.Color(0x15161f), 1 - ss(0.03, 0.075, v));
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v) {
      const sc = Math.abs(Math.cos(v * Math.PI * 150)) * Math.abs(Math.cos(u * Math.PI * 2 * 22));
      return 0.55 + (sc - 0.5) * 0.16;
    },
    groove: () => 0,
    parts(root, sp) {
      const P = ODD_PLANS.snake;
      const zAt = (t) => 0.5 - t;
      // A sea krait underwater keeps its mouth shut; the flicking tongue is a
      // land behaviour and read as a stray red spike, so it is gone.
      const surf = surfaceAt(P, 0.06, 'w');
      eyes(root, { r: 0.0085, x: surf - 0.002,
                   y: surfaceAt(P, 0.06, 'hTop') * 0.45, z: zAt(0.06),
                   iris: 0xc8a54a, pupil: 0x0a0a0c });
    },
  },

  /* -------------------------------------------------------------- ANGLERFISH */
  angler: {
    // Built from the classic Melanocetus silhouette: a head that is most of
    // the animal, a gape that opens wider than the body is deep, a palisade of
    // inward-curving needle teeth, and a lure on a long arcing rod.
    bodyLength: 0.86,
    norm: (L) => L / 1.0,
    stations: [
      { t: 0.00, w: 0.205, hTop: 0.250, hBot: 0.205, yOff: 0 },   // jaw hinge
      { t: 0.09, w: 0.258, hTop: 0.305, hBot: 0.258, yOff: 0 },
      { t: 0.20, w: 0.283, hTop: 0.330, hBot: 0.278, yOff: 0 },   // widest: the head
      { t: 0.33, w: 0.268, hTop: 0.305, hBot: 0.255, yOff: 0 },
      { t: 0.47, w: 0.228, hTop: 0.252, hBot: 0.205, yOff: 0 },
      { t: 0.60, w: 0.175, hTop: 0.190, hBot: 0.150, yOff: 0 },
      { t: 0.72, w: 0.122, hTop: 0.132, hBot: 0.100, yOff: 0 },
      { t: 0.83, w: 0.078, hTop: 0.085, hBot: 0.062, yOff: 0 },
      { t: 0.92, w: 0.045, hTop: 0.050, hBot: 0.035, yOff: 0 },
      { t: 1.00, w: 0.024, hTop: 0.028, hBot: 0.020, yOff: 0 },
    ],
    anim: { kind: 'spineSide', freq: 1.3, amp: 0.016, bendFrom: 0.62, wave: 0.85 },
    skin(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      // Olive-brown over near-black, the colouring in the reference photo.
      _c.set(0x6b6338).lerp(new THREE.Color(0x241d15), ss(0.08, 0.95, up));
      // warty, pitted hide
      const warts = mottle(v * 62, u * 27);
      if (warts > 0.66) _c.lerp(new THREE.Color(0x8d8149), (warts - 0.66) * 1.5);
      const pits = mottle(v * 190, u * 82);
      if (pits > 0.86) _c.multiplyScalar(0.72);
      _c.offsetHSL(0, 0.03, (mottle(v * 240, u * 100) - 0.5) * 0.05);
      // pale throat
      if (up < 0.22) _c.lerp(new THREE.Color(0x9c9469), (0.22 - up) * 2.2);
      return [_c.r, _c.g, _c.b];
    },
    bump: (u, v) => 0.55 + (mottle(v * 70, u * 30) - 0.5) * 0.30,
    groove: () => 0,
    parts(root, sp) {
      const half = 0.86 / 2;                     // front of the body, z = +0.43
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x554e2e, roughness: 0.9 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x140f0a, roughness: 1 });
      const toothMat = new THREE.MeshStandardMaterial({
        color: 0xe8e2cc, roughness: 0.35, metalness: 0.05 });
      const fm = vcFin();

      // ---- Gaping jaws -------------------------------------------------
      // Two arcs hinged at the front of the body. The lower jaw drops away
      // so the mouth stands permanently open, as in the reference.
      const jawArc = (halfW, reach, drop, thick, mat) => {
        const g = new THREE.Group();
        const N = 13;
        for (let i = 0; i < N; i++) {
          const a = -1 + (i / (N - 1)) * 2;                  // -1 .. 1 across
          const x = Math.sin(a * 1.15) * halfW;
          const z = Math.cos(a * 1.15) * reach;
          const seg = new THREE.Mesh(
            new THREE.SphereGeometry(thick, 8, 6), mat);
          seg.scale.set(1, 0.75, 1.5);
          seg.position.set(x, drop * (0.35 + 0.65 * Math.cos(a * 1.15)), z);
          g.add(seg);
        }
        return g;
      };
      const upper = jawArc(0.235, 0.19, 0.02, 0.045, skinMat);
      upper.position.set(0, 0.075, half - 0.02);
      root.add(upper);
      const lower = jawArc(0.250, 0.155, -0.075, 0.052, skinMat);
      lower.position.set(0, -0.115, half - 0.02);
      root.add(lower);

      // dark mouth cavity so the gape reads as a hole, not a gap
      const cavity = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 12), darkMat);
      cavity.scale.set(1.05, 0.72, 0.85);
      cavity.position.set(0, -0.025, half - 0.03);
      root.add(cavity);

      // ---- Needle teeth: real geometry, curving inward ------------------
      const N = 12;
      for (let i = 0; i < N; i++) {
        const a = -1 + (i / (N - 1)) * 2;
        const spread = Math.cos(a * 1.15);
        const x = Math.sin(a * 1.15);
        // longest at the front of the jaw, shortest at the corners
        const len = (0.075 + 0.075 * spread);
        // upper teeth point down
        const tu = new THREE.Mesh(new THREE.ConeGeometry(0.011, len, 5), toothMat);
        tu.position.set(x * 0.225, 0.072 + 0.02 * spread, half - 0.02 + spread * 0.185);
        tu.rotation.x = Math.PI;                    // tip downward
        tu.rotation.z = -x * 0.28;
        tu.position.y -= len * 0.5;
        root.add(tu);
        // lower teeth point up
        const tl = new THREE.Mesh(new THREE.ConeGeometry(0.012, len * 1.12, 5), toothMat);
        tl.position.set(x * 0.240, -0.118 - 0.075 * spread, half - 0.02 + spread * 0.15);
        tl.rotation.z = x * 0.24;
        tl.rotation.x = -0.18;
        tl.position.y += len * 0.56;
        root.add(tl);
      }

      // ---- Illicium: long rod arcing up and forward --------------------
      const rodSegs = 7, rodMat = skinMat;
      let prev = null;
      const rodPts = [];
      for (let i = 0; i <= rodSegs; i++) {
        const k = i / rodSegs;
        // arc up from the head, then forward over the mouth
        const ang = -0.15 + k * 1.5;
        rodPts.push(new THREE.Vector3(
          0,
          0.26 + Math.sin(ang) * 0.20,
          half - 0.14 + (1 - Math.cos(ang)) * 0.34
        ));
      }
      for (let i = 0; i < rodPts.length - 1; i++) {
        const a = rodPts[i], b = rodPts[i + 1];
        const len = a.distanceTo(b);
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.011 - i * 0.0008, 0.013 - i * 0.0008, len * 1.12, 6), rodMat);
        seg.position.copy(a).lerp(b, 0.5);
        seg.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        root.add(seg);
        prev = b;
      }

      // ---- Esca: the bioluminescent bulb, green as in the photograph ----
      // Scaled to the animal: the esca on a real Melanocetus is a bead, not a
      // lantern — roughly 8% of body length across.
      const esca = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 14),
        new THREE.MeshBasicMaterial({ color: 0xcdff7a }));
      esca.position.copy(prev);
      root.add(esca);
      const halo1 = new THREE.Mesh(new THREE.SphereGeometry(0.070, 14, 12),
        new THREE.MeshBasicMaterial({ color: 0x8dff42, transparent: true, opacity: 0.34, depthWrite: false }));
      halo1.position.copy(prev); root.add(halo1);
      const halo2 = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0x5bd227, transparent: true, opacity: 0.15, depthWrite: false }));
      halo2.position.copy(prev); root.add(halo2);
      root._lure = { esca, halo: halo1, halo2 };

      // ---- Fins --------------------------------------------------------
      const mk = (o, th, tp) => new THREE.Mesh(
        foilShaded(o, th, tp, 0x6f6740, 0x241d15, 0xb9ae7a), fm);
      for (const s of [-1, 1]) {                 // fan-shaped pectorals
        const pf = mk([
          [0, 0.055], [0.085, 0.030], [0.115, -0.030], [0.075, -0.075], [0.008, -0.062],
        ], 0.006, 0.3);
        pf.scale.x = s;
        pf.position.set(s * 0.225, -0.075, 0.02);
        pf.rotation.z = s * 0.25;
        root.add(pf);
      }
      const d1 = mk([[0, 0.055], [0.085, 0.012], [0.055, -0.062], [0.006, -0.066]], 0.005, 0.3);
      d1.rotation.z = Math.PI / 2;
      d1.position.set(0, 0.235, -0.24);
      root.add(d1);
      const an = mk([[0, 0.042], [0.065, 0.010], [0.042, -0.048], [0.005, -0.052]], 0.005, 0.3);
      an.rotation.z = -Math.PI / 2;
      an.position.set(0, -0.185, -0.24);
      root.add(an);

      const tail = new THREE.Group();
      tail.position.z = -half - 0.02;
      root.add(tail);
      const caud = mk([
        [0.000, 0.006], [0.100, -0.060], [0.085, -0.115], [0.014, -0.066],
        [-0.085, -0.115], [-0.100, -0.060],
      ], 0.005, 0.3);
      caud.rotation.z = Math.PI / 2;
      tail.add(caud);
      root._tail = tail;

      // ---- Big round eye set high on the head --------------------------
      eyes(root, { r: 0.052, x: 0.246, y: 0.150, z: half - 0.13,
                   iris: 0xd8c96a, pupil: 0x0b0c0a });
    },
  },


  /* ------------------------------------------------------------------ DUGONG */
  dugong: {
    // A sirenian, not a cetacean: no dorsal fin, no hind limbs, a blunt
    // down-turned muzzle carrying the horseshoe grazing disc, and a fluked
    // tail it beats vertically at a slow ~10 km/h.
    bodyLength: 1.0,
    norm: (L) => L / 1.0,
    stations: [
      { t: 0.00, w: 0.085, hTop: 0.080, hBot: 0.086, yOff: -0.012 },
      { t: 0.06, w: 0.125, hTop: 0.115, hBot: 0.124, yOff: -0.008 },
      { t: 0.14, w: 0.158, hTop: 0.150, hBot: 0.158, yOff: -0.003 },
      { t: 0.26, w: 0.182, hTop: 0.176, hBot: 0.182, yOff: 0 },
      { t: 0.38, w: 0.188, hTop: 0.182, hBot: 0.186, yOff: 0 },
      { t: 0.52, w: 0.178, hTop: 0.172, hBot: 0.172, yOff: 0 },
      { t: 0.66, w: 0.152, hTop: 0.148, hBot: 0.144, yOff: 0 },
      { t: 0.78, w: 0.118, hTop: 0.118, hBot: 0.110, yOff: 0 },
      { t: 0.87, w: 0.082, hTop: 0.088, hBot: 0.078, yOff: 0 },
      { t: 0.94, w: 0.048, hTop: 0.058, hBot: 0.048, yOff: 0 },
      { t: 1.00, w: 0.022, hTop: 0.030, hBot: 0.024, yOff: 0 },
    ],
    anim: { kind: 'spineVert', freq: 0.7, amp: 0.030, bendFrom: 0.42, wave: 0.85 },
    skin(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      _c.set(0xa39c8b).lerp(new THREE.Color(0x6d675a), ss(0.35, 0.95, up));
      if (up < 0.3) _c.lerp(new THREE.Color(0xc7c1b0), (0.3 - up) * 2.4);
      // thick creased hide with scattered scars, as older dugongs carry
      const grain = mottle(v * 70, u * 30);
      _c.offsetHSL(0, 0, (grain - 0.5) * 0.10);
      const scar = mottle(v * 24 + 9, u * 11);
      if (scar > 0.83) _c.lerp(new THREE.Color(0xd6d0c0), (scar - 0.83) * 2.2);
      // the grazing disc: a broad pale horseshoe on the down-turned muzzle
      if (v < 0.075 && s < 0.25) _c.lerp(new THREE.Color(0x8b8271), 0.55);
      // mouth line under the muzzle
      if (v < 0.10) {
        const d = Math.abs(s + 0.55);
        _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.02) * 0.45);
      }
      return [_c.r, _c.g, _c.b];
    },
    bump: (u, v) => 0.55 + (mottle(v * 85, u * 36) - 0.5) * 0.16,
    groove(t, th) {
      const s = Math.sin(th);
      // muzzle turns down at the front — the sirenian signature
      if (t < 0.11 && s > 0.2) return Math.pow(s, 3) * 0.16 * (1 - ss(0.06, 0.11, t));
      if (t > 0.86) return -Math.pow(Math.abs(Math.cos(th)), 8) * 0.18 * ss(0.86, 0.96, t);
      return 0;
    },
    parts(root, sp) {
      const P = ODD_PLANS.dugong;
      const fm = vcFin();
      const mk = (o, th, tp) => new THREE.Mesh(
        foilShaded(o, th, tp, 0x8b8474, 0x5d5749), fm);
      const zAt = (t) => 0.5 - t;
      // paddle-shaped pectoral flippers, ~15% of body length, set well forward
      for (const s of [-1, 1]) {
        const surf = surfaceAt(P, 0.20, 'w');
        const f = mk([
          [0.000, 0.050], [0.060, 0.026], [0.135, -0.045],
          [0.100, -0.078], [0.040, -0.060], [0.006, -0.028],
        ], 0.010, 0.25);
        f.scale.x = s;
        f.position.set(s * (surf - 0.02), -0.055, zAt(0.20));
        f.rotation.z = s * -0.18;
        f.rotation.x = 0.20;
        root.add(f);
      }
      // horizontal fluke — dolphin-like, which separates dugong from manatee
      const tail = new THREE.Group();
      tail.position.z = zAt(0.94);
      root.add(tail);
      for (const s of [-1, 1]) {
        const fk = new THREE.Mesh(foilShaded([
          [0.000, 0.030], [0.070, 0.018], [0.150, -0.020],
          [0.195, -0.080], [0.130, -0.082], [0.050, -0.050], [0.000, -0.020],
        ], 0.008, 0.22, 0x7d7768, 0x4f4a3e), fm);
        fk.scale.x = s;
        fk.position.z = -0.055;
        tail.add(fk);
      }
      root._tail = tail;
      // bristled grazing disc on the muzzle
      const disc = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0x7f7867, roughness: 0.95 }));
      disc.scale.set(1.15, 0.65, 0.55);
      disc.position.set(0, -0.055, zAt(0.03));
      root.add(disc);
      eyes(root, { r: 0.017, x: surfaceAt(P, 0.11, 'w') - 0.006,
                   y: 0.030, z: zAt(0.11), iris: 0x3c3529 });
    },
  },

  /* ---------------------------------------------------------------- SEAHORSE */
  seahorse: {
    // Upright, bony-ringed, no caudal fin. The body is modelled along its own
    // axis and then stood on end, because a seahorse swims vertically.
    bodyLength: 1.0,
    norm: (L) => L / 1.15,
    stations: [
      { t: 0.00, w: 0.075, hTop: 0.085, hBot: 0.075, yOff: 0 },   // snout base
      { t: 0.10, w: 0.105, hTop: 0.120, hBot: 0.100, yOff: 0 },   // head
      { t: 0.18, w: 0.085, hTop: 0.098, hBot: 0.082, yOff: 0 },   // neck
      { t: 0.30, w: 0.120, hTop: 0.150, hBot: 0.118, yOff: 0 },   // chest/belly
      { t: 0.42, w: 0.118, hTop: 0.148, hBot: 0.120, yOff: 0 },
      { t: 0.55, w: 0.098, hTop: 0.118, hBot: 0.098, yOff: 0 },
      { t: 0.68, w: 0.072, hTop: 0.082, hBot: 0.070, yOff: 0 },
      { t: 0.80, w: 0.050, hTop: 0.056, hBot: 0.048, yOff: 0 },
      { t: 0.90, w: 0.032, hTop: 0.035, hBot: 0.030, yOff: 0 },
      { t: 1.00, w: 0.016, hTop: 0.018, hBot: 0.015, yOff: 0 },
    ],
    anim: { kind: 'seahorseHover', freq: 1.0, amp: 1 },
    skin(u, v, sp) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      _c.set(sp.colors.body).lerp(new THREE.Color(sp.colors.belly || 0xf2e2ad), up * 0.35);
      // the bony rings that ring the body every few millimetres
      const ring = Math.pow(Math.abs(Math.cos(v * Math.PI * 22)), 5);
      _c.lerp(new THREE.Color(sp.colors.fin || 0xefd68a), ring * 0.45);
      // large dark spots, the species' name
      const spot = mottle(v * 34, u * 15);
      if (spot > 0.72) _c.lerp(new THREE.Color(sp.colors.band || 0x6b4a18), (spot - 0.72) * 2.4);
      _c.offsetHSL(0, 0, (mottle(v * 140, u * 60) - 0.5) * 0.08);
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v) {
      const ring = Math.pow(Math.abs(Math.cos(v * Math.PI * 22)), 5);
      return 0.5 + ring * 0.42 + (mottle(v * 150, u * 64) - 0.5) * 0.08;
    },
    groove(t, th) {
      // ring segmentation carved shallowly into the armour
      return Math.pow(Math.abs(Math.cos(t * Math.PI * 22)), 6) * 0.05;
    },
    parts(root, sp) {
      const P = ODD_PLANS.seahorse;
      const zAt = (t) => 0.5 - t;
      const body = new THREE.MeshStandardMaterial({ color: sp.colors.body, roughness: 0.75 });
      const fm = vcFin();
      // tubular snout
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.042, 0.20, 9), body);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, -0.010, zAt(0.0) + 0.10);
      root.add(snout);
      // coronet on top of the head
      const cor = new THREE.Mesh(new THREE.ConeGeometry(0.040, 0.075, 6), body);
      cor.position.set(0, 0.120, zAt(0.10));
      root.add(cor);
      // dorsal fin — the only real propulsion, flutters ~35 times a second
      const dors = new THREE.Mesh(foilShaded([
        [0, 0.085], [0.055, 0.055], [0.070, -0.050], [0.008, -0.090],
      ], 0.004, 0.35, sp.colors.fin || 0xefd68a, sp.colors.band || 0x6b4a18), fm);
      dors.rotation.z = Math.PI / 2;
      dors.position.set(0, surfaceAt(P, 0.48, 'hTop') - 0.01, zAt(0.48));
      root.add(dors);
      root._dorsal = dors;
      for (const s of [-1, 1]) {
        const pf = new THREE.Mesh(foilShaded([
          [0, 0.030], [0.040, 0.010], [0.050, -0.030], [0.006, -0.036],
        ], 0.003, 0.35, sp.colors.fin || 0xefd68a, sp.colors.band || 0x6b4a18), fm);
        pf.scale.x = s;
        pf.position.set(s * (surfaceAt(P, 0.16, 'w') - 0.006), 0.010, zAt(0.16));
        root.add(pf);
      }
      // prehensile tail curl — modelled as a tapering spiral
      const curl = new THREE.Group();
      curl.position.z = zAt(0.86);
      root.add(curl);
      let prev = new THREE.Vector3(0, 0, 0);
      for (let i = 1; i <= 7; i++) {
        const a = i * 0.85;
        const r = 0.075 * (1 - i / 9);
        const p = new THREE.Vector3(0, -0.055 - Math.sin(a) * r, -0.05 - (1 - Math.cos(a)) * r);
        const d = p.clone().sub(prev);
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.030 - i * 0.003, 0.034 - i * 0.003, d.length() * 1.15, 7), body);
        seg.position.copy(prev).lerp(p, 0.5);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        curl.add(seg);
        prev = p;
      }
      eyes(root, { r: 0.030, x: surfaceAt(P, 0.10, 'w') - 0.008,
                   y: 0.040, z: zAt(0.10), iris: 0x8a6a2c });
      // a seahorse holds itself upright
      root.rotation.x = -Math.PI / 2 + 0.25;
    },
  },

  /* ----------------------------------------------------------- SEA CUCUMBER */
  cucumber: {
    // Arched dorsally, flattened ventrally — a semicircular cross-section
    // pressed to the seabed, which is why yScale squashes the underside.
    bodyLength: 1.0,
    norm: (L) => L / 1.0,
    stations: [
      { t: 0.00, w: 0.055, hTop: 0.050, hBot: 0.030, yOff: 0 },
      { t: 0.09, w: 0.098, hTop: 0.090, hBot: 0.042, yOff: 0 },
      { t: 0.22, w: 0.125, hTop: 0.116, hBot: 0.050, yOff: 0 },
      { t: 0.38, w: 0.136, hTop: 0.128, hBot: 0.054, yOff: 0 },
      { t: 0.55, w: 0.133, hTop: 0.124, hBot: 0.052, yOff: 0 },
      { t: 0.70, w: 0.118, hTop: 0.110, hBot: 0.046, yOff: 0 },
      { t: 0.84, w: 0.090, hTop: 0.082, hBot: 0.036, yOff: 0 },
      { t: 0.93, w: 0.060, hTop: 0.054, hBot: 0.026, yOff: 0 },
      { t: 1.00, w: 0.030, hTop: 0.026, hBot: 0.014, yOff: 0 },
    ],
    yScale: (t, ct) => 0.70 + 0.30 * Math.exp(-Math.pow(ct / 0.9, 2)),
    anim: { kind: 'still', freq: 0.15, amp: 0.01 },
    skin(u, v, sp) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      _c.set(sp.colors.body).lerp(new THREE.Color(sp.colors.belly || 0x9c917f), 1 - up);
      // grey cross-banding on the dark dorsal surface
      if (up > 0.45) {
        const band = Math.pow(Math.abs(Math.cos(v * Math.PI * 9)), 3);
        _c.lerp(new THREE.Color(0x8b8172), band * 0.35 * (up - 0.45) * 2);
      }
      // papillae speckling the back
      const pap = mottle(v * 60, u * 26);
      if (pap > 0.74 && up > 0.5) _c.lerp(new THREE.Color(sp.colors.band || 0x2b2723), (pap - 0.74) * 2.6);
      _c.offsetHSL(0, 0, (mottle(v * 170, u * 72) - 0.5) * 0.09);
      return [_c.r, _c.g, _c.b];
    },
    bump: (u, v) => 0.55 + (mottle(v * 65, u * 28) - 0.5) * 0.28,
    groove: () => 0,
    parts(root, sp) {
      const P = ODD_PLANS.cucumber;
      const zAt = (t) => 0.5 - t;
      const dark = new THREE.MeshStandardMaterial({ color: sp.colors.band || 0x2b2723, roughness: 1 });
      const pale = new THREE.MeshStandardMaterial({ color: sp.colors.belly || 0x9c917f, roughness: 0.9 });
      // ~20 short feeding tentacles ringing the ventral mouth
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const t = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.055, 5), pale);
        t.position.set(Math.cos(a) * 0.045, -0.030 + Math.sin(a) * 0.020, zAt(0.02) + 0.02);
        t.rotation.x = Math.PI / 2 + 0.5;
        t.rotation.z = -a;
        root.add(t);
      }
      // dorsal papillae as real bumps
      for (let i = 0; i < 26; i++) {
        const t = 0.10 + Math.random() * 0.80;
        const side = (Math.random() - 0.5) * 1.4;
        const h = surfaceAt(P, t, 'hTop');
        const w = surfaceAt(P, t, 'w');
        const p = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.040, 5), dark);
        p.position.set(Math.sin(side) * w * 0.7, Math.cos(side) * h * 0.9, zAt(t));
        p.rotation.z = -side;
        root.add(p);
      }
      // tube feet along the sole
      for (let i = 0; i < 18; i++) {
        const t = 0.12 + (i / 18) * 0.76;
        for (const s of [-1, 1]) {
          const f = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.030, 5), pale);
          f.position.set(s * surfaceAt(P, t, 'w') * 0.55, -surfaceAt(P, t, 'hBot') * 0.85, zAt(t));
          root.add(f);
        }
      }
    },
  },

  /* --------------------------------------------------------------- STARFISH */
  star: {
    custom: 'star',
    norm: (L) => L / 1.0,        // species.length is the arm span
  },

  /* ------------------------------------------------------------------- CRAB */
  crab: {
    custom: 'crab',
    norm: (L) => L / 0.78,       // species.length is the carapace width
  },
};


/* ------------------------------------------- radially symmetric: STARFISH */
// Sea stars vary enormously between species, so instead of one model there are
// four forms: a smooth blue Linckia, a knobbed Protoreaster, a spiny star and
// a slender-armed one. A variant number chosen at spawn picks the form, so a
// patch of reef shows a mixed population rather than clones.
const STAR_TYPES = [
  { key: 'smooth',  arms: 5, armLen: 0.72, waist: 0.26, dome: 0.100,
    body: 0x2f6fc4, tip: 0x7fb4e8, knobs: 0,  spines: 0, knobCol: 0x1d4a86 },
  { key: 'knobby',  arms: 5, armLen: 0.56, waist: 0.42, dome: 0.155,
    body: 0xd9c08a, tip: 0xefe0bb, knobs: 7,  spines: 0, knobCol: 0x5a4326 },
  { key: 'spiny',   arms: 7, armLen: 0.66, waist: 0.34, dome: 0.125,
    body: 0xc4552f, tip: 0xe8a07a, knobs: 0,  spines: 9, knobCol: 0x7d2f18 },
  { key: 'slender', arms: 5, armLen: 0.84, waist: 0.16, dome: 0.072,
    body: 0xb8563f, tip: 0xe7b48e, knobs: 0,  spines: 0, knobCol: 0x6d2c1d },
];

function buildStarfish(species, variant = Math.random()) {
  const T = STAR_TYPES[Math.floor(variant * STAR_TYPES.length) % STAR_TYPES.length];
  const root = new THREE.Group();
  const RAD = 72, RINGS = 26;
  const lobes = T.arms / 2;
  const starR = (a) => T.waist + (1 - T.waist) * Math.pow(Math.abs(Math.cos(a * lobes)), 0.55);

  const pos = [], uv = [], idx = [];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= RINGS; i++) {
      const u = i / RINGS;
      for (let j = 0; j <= RAD; j++) {
        const a = (j / RAD) * Math.PI * 2;
        const r = u * starR(a) * T.armLen;
        const dome = side > 0
          ? Math.pow(Math.max(0, 1 - u * u), 0.75) * T.dome
          : Math.pow(Math.max(0, 1 - u * u), 0.9) * T.dome * 0.26;
        pos.push(Math.cos(a) * r, side * dome, Math.sin(a) * r);
        uv.push(j / RAD, u);
      }
    }
    const stride = RAD + 1;
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < RAD; j++) {
        const p0 = base + i * stride + j, p1 = p0 + 1, p2 = p0 + stride, p3 = p2 + 1;
        if (side > 0) idx.push(p0, p2, p1, p1, p2, p3);
        else idx.push(p0, p1, p2, p1, p3, p2);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const bodyC = new THREE.Color(T.body), tipC = new THREE.Color(T.tip);
  const map = makeSkinTexture((u, v) => {
    _c.copy(bodyC).lerp(tipC, Math.pow(v, 1.6) * 0.75);
    const lobe = Math.pow(Math.abs(Math.cos(u * Math.PI * 2 * lobes)), 0.6);
    _c.offsetHSL(0, 0.03, (lobe - 0.5) * 0.10);
    // the plated ossicles every sea star carries
    const plate = Math.pow(Math.abs(Math.cos(v * Math.PI * 18)), 5)
                * Math.pow(Math.abs(Math.cos(u * Math.PI * 2 * lobes * 4)), 3);
    _c.lerp(tipC, plate * 0.5 * lobe);
    if (v > 0.88) _c.lerp(tipC, (v - 0.88) * 5);
    _c.offsetHSL(0, 0, (mottle(v * 70, u * 44) - 0.5) * 0.07);
    return [_c.r, _c.g, _c.b];
  }, 512, 256);
  const bump = makeBumpTexture((u, v) => {
    const b = Math.pow(Math.abs(Math.cos(v * Math.PI * 18)), 5)
            * Math.pow(Math.abs(Math.cos(u * Math.PI * 2 * lobes * 4)), 3);
    return 0.5 + b * 0.42 + (mottle(v * 95, u * 55) - 0.5) * 0.10;
  }, 384, 192);

  const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map, bumpMap: bump, bumpScale: 0.05, roughness: 0.84, side: THREE.DoubleSide,
  }));
  root.add(body);

  // Knobs (chocolate-chip star) and spines, placed along each arm's midline.
  const knobMat = new THREE.MeshStandardMaterial({ color: T.knobCol, roughness: 0.6 });
  for (let arm = 0; arm < T.arms; arm++) {
    const a = (arm / T.arms) * Math.PI * 2;
    for (let k = 0; k < T.knobs; k++) {
      const u = 0.18 + (k / Math.max(1, T.knobs - 1)) * 0.68;
      const r = u * T.armLen;
      const h = Math.pow(Math.max(0, 1 - u * u), 0.75) * T.dome;
      const kn = new THREE.Mesh(new THREE.ConeGeometry(0.030 * (1 - u * 0.4), 0.055, 7), knobMat);
      kn.position.set(Math.cos(a) * r, h + 0.012, Math.sin(a) * r);
      root.add(kn);
    }
    for (let k = 0; k < T.spines; k++) {
      const u = 0.14 + (k / Math.max(1, T.spines - 1)) * 0.76;
      const r = u * T.armLen;
      const h = Math.pow(Math.max(0, 1 - u * u), 0.75) * T.dome;
      for (const off of [-0.10, 0.10]) {
        const sp2 = new THREE.Mesh(new THREE.ConeGeometry(0.010, 0.075, 5), knobMat);
        sp2.position.set(Math.cos(a + off) * r, h + 0.028, Math.sin(a + off) * r);
        sp2.rotation.z = -Math.sin(a + off) * 0.35;
        sp2.rotation.x = Math.cos(a + off) * 0.35;
        root.add(sp2);
      }
    }
  }

  root._body = body;
  root._basePos = geo.attributes.position.array.slice();
  root._anim = { kind: 'starCurl', freq: 0.25, amp: 1, t: Math.random() * 6 };
  root.scale.setScalar(species.length / (T.armLen * 2));
  root.userData.species = species.id;
  root.userData.sizeRef = species.length;
  root.userData.variant = T.key;
  return root;
}

/* ----------------------------------------------------------------- CRAB */
// Rebuilt against a photograph of a real rock crab.
//
// Two things were wrong before. The cheliped was assembled from three NESTED
// Euler rotations (-2.35, then 1.15, then -1.25 rad); nested rotations do not
// compose the way they read, so the arm ended up pointing nowhere sensible.
// And the pincer fingers were cones left at their default orientation, whose
// apex points +Y — so the tips aimed back INTO the palm.
//
// Now every joint is an explicit point and each segment is a bone stretched
// between two points. The pose is therefore exactly what the coordinates say.
const _crabTexCache = new Map();

function buildCrab(species, variant = Math.random()) {
  const root = new THREE.Group();
  const c = species.colors;
  const m = species.morph || {};
  const tint = (variant - 0.5) * 0.08;

  // Two very different crabs are built here. Carpilius maculatus is a smooth
  // cream shell carrying nine to eleven big maroon blotches in 2-3-4 rows (the
  // "seven-eleven crab"); Scylla serrata is dark green with polygonal marbling,
  // nine teeth down each anterolateral margin, and its last leg pair flattened
  // into swimming paddles.
  const ground = new THREE.Color(c.body);
  const blot = new THREE.Color(c.band ?? 0x8d2440);
  const pale = new THREE.Color(c.belly ?? 0xe8d9c2);
  const pattern = m.shellPattern ?? 'spots711';

  // 9 blotches in 2-3-4 rows, as [lateral -1..1, along 0..1]
  const SPOTS = [
    [-0.35, 0.24], [0.35, 0.24],
    [-0.56, 0.46], [0.00, 0.46], [0.56, 0.46],
    [-0.64, 0.70], [-0.24, 0.70], [0.24, 0.70], [0.64, 0.70],
  ];

  const shellAt = (u, v) => {
    const s2 = Math.sin(u * Math.PI * 2);
    const lat = Math.cos(u * Math.PI * 2);
    if (s2 < 0.1) { _c.copy(pale); return _c; }             // pale underside
    if (pattern === 'marbled') {
      const cell = spotField(u, v, 9, 2.7);
      _c.copy(ground).offsetHSL(0, 0, (cell.id - 0.5) * 0.16);
      // dark lines where cells meet == the polygonal marbling
      _c.lerp(blot, (1 - ss(0.0, 0.16, cell.edge)) * 0.75);
    } else {
      _c.copy(ground);
      for (const [sl, sv] of SPOTS) {
        const d = Math.hypot(lat - sl, (v - sv) * 2.1);
        if (d < 0.21) _c.lerp(blot, (1 - ss(0.13, 0.21, d)) * 0.95);
      }
      const grain = mottle(v * 320, u * 140);
      if (grain > 0.84) _c.offsetHSL(0, 0, 0.04);
    }
    // regional grooves dividing the carapace into lobes
    const groove = Math.pow(Math.abs(Math.cos(v * Math.PI * 3.0)), 16)
                 + Math.pow(Math.abs(Math.cos(u * Math.PI * 2 * 3)), 18) * 0.6;
    _c.multiplyScalar(1 - Math.min(0.4, groove) * (m.grooveDepth ?? 0.5));
    if (v > 0.93) _c.lerp(pale, (v - 0.93) * 8);
    return _c;
  };

  // Every other builder caches its textures per species; this one did not, so
  // each crab that spawned regenerated a 640x320 shell texture — 135 ms for a
  // reef crab and 385 ms for a mud crab, on the spawn path. The textures are
  // now built once per species and the per-individual colour variation is
  // applied through the material tint instead, which costs nothing.
  const limbCol = c.fin ?? 0xe0cdae;
  let tex = _crabTexCache.get(species.id);
  if (!tex) {
    tex = {
      shell: makeSkinTexture((u, v) => { const q = shellAt(u, v); return [q.r, q.g, q.b]; }, 640, 320),
      bump: makeBumpTexture((u, v) => {
        const g = Math.pow(Math.abs(Math.cos(v * Math.PI * 3.0)), 16);
        let h = 0.55 - g * 0.3;
        if (pattern === 'marbled') h += (1 - ss(0, 0.16, spotField(u, v, 9, 2.7).edge)) * 0.10;
        else h += (mottle(v * 130, u * 58) - 0.5) * 0.10;
        return h;
      }, 448, 224),
      limb: pattern === 'marbled' ? makeSkinTexture((u, v) => {
        const cell = spotField(u, v, 7, 5.1);
        _c.set(limbCol).offsetHSL(0, 0, (cell.id - 0.5) * 0.12);
        _c.lerp(blot, (1 - ss(0.0, 0.18, cell.edge)) * 0.7);
        return [_c.r, _c.g, _c.b];
      }, 256, 256) : null,
    };
    _crabTexCache.set(species.id, tex);
  }

  // per-individual tint, applied to the shared texture rather than baked in
  const tintCol = new THREE.Color(0xffffff).offsetHSL(tint * 0.3, 0, tint * 0.6);

  const shellMat = new THREE.MeshStandardMaterial({
    map: tex.shell, bumpMap: tex.bump, color: tintCol,
    // Carpilius is famously glossy; Scylla is matt.
    bumpScale: 0.05, roughness: m.gloss ?? 0.42, metalness: 0.10,
  });

  const limbMat = tex.limb
    ? new THREE.MeshStandardMaterial({ map: tex.limb, color: tintCol, roughness: 0.6 })
    : new THREE.MeshStandardMaterial({ color: limbCol, roughness: 0.55 });
  const bandMat = new THREE.MeshStandardMaterial(
    { color: m.bandCol ?? 0x8f6742, roughness: 0.6 });
  const handMat = new THREE.MeshStandardMaterial(
    { color: m.handCol ?? 0xf0e3cd, roughness: 0.45 });
  const redMat  = new THREE.MeshStandardMaterial(
    { color: m.accentCol ?? 0xc03d22, roughness: 0.5 });
  const tipMat  = new THREE.MeshStandardMaterial(
    { color: m.tipCol ?? 0x1b1512, roughness: 0.3, metalness: 0.2 });

  // ---- Carapace: broad fan, clearly wider than long ----------------------
  const CARA = {
    stations: [
      { t: 0.00, w: 0.285, hTop: 0.070, hBot: 0.018, yOff: 0 },
      { t: 0.10, w: 0.395, hTop: 0.100, hBot: 0.024, yOff: 0 },
      { t: 0.24, w: 0.468, hTop: 0.122, hBot: 0.028, yOff: 0 },
      { t: 0.42, w: 0.500, hTop: 0.130, hBot: 0.030, yOff: 0 },
      { t: 0.60, w: 0.480, hTop: 0.124, hBot: 0.028, yOff: 0 },
      { t: 0.78, w: 0.396, hTop: 0.102, hBot: 0.024, yOff: 0 },
      { t: 0.90, w: 0.290, hTop: 0.074, hBot: 0.018, yOff: 0 },
      { t: 1.00, w: 0.160, hTop: 0.042, hBot: 0.010, yOff: 0 },
    ],
  };
  const shell = new THREE.Mesh(organicBody({
    stations: CARA.stations, length: 0.70, segments: 46, radial: 46,
    yScale: (t, ct) => 0.55 + 0.45 * Math.exp(-Math.pow(ct / 0.85, 2)),
  }), shellMat);
  root.add(shell);

  // Anterolateral margin. Scylla serrata carries nine even teeth down each
  // side; Carpilius maculatus has a smooth margin and only a few small spines
  // between the eyes, so its tooth count is zero.
  const nTeeth = m.teeth ?? 0;
  for (const s of [-1, 1]) {
    for (let i = 0; i < nTeeth; i++) {
      const t = 0.05 + i * (0.42 / Math.max(1, nTeeth - 1));
      const w = surfaceAt(CARA, t, 'w');
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(0.016, m.toothLen ?? 0.050, 5), redMat);
      tooth.position.set(s * (w - 0.004), 0.010, 0.35 - t * 0.70);
      tooth.rotation.z = s * (Math.PI / 2 - 0.30);
      tooth.rotation.y = s * -0.45;
      root.add(tooth);
    }
  }
  // small spines on the front margin between the eyes
  for (let i = 0; i < (m.frontSpines ?? 0); i++) {
    const x = (i - (m.frontSpines - 1) / 2) * 0.048;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.030, 5), redMat);
    sp.position.set(x, 0.048, 0.352);
    sp.rotation.x = Math.PI / 2 - 0.35;
    root.add(sp);
  }

  // ---- Eyes in their orbital notches -------------------------------------
  for (const s of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.020, 0.080, 8), redMat);
    stalk.position.set(s * 0.078, 0.062, 0.325);
    stalk.rotation.x = -0.30;
    root.add(stalk);
    const e = makeEye(0.027, 0.14, 0x0a0a0c);
    e.rotation.y = Math.PI / 2;
    e.position.set(s * 0.082, 0.104, 0.338);
    root.add(e);
  }
  const mp = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.020, 0.055), handMat);
  mp.position.set(0, -0.006, 0.325);
  root.add(mp);

  // ---- Bone helper: a segment stretched between two explicit points -------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const DOWN = V(0, -1, 0);
  const bone = (parent, from, to, r0, r1, mat) => {
    const dir = to.clone().sub(from);
    const len = dir.length();
    const g = new THREE.Group();
    g.position.copy(from);
    g.quaternion.setFromUnitVectors(DOWN, dir.clone().normalize());
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 10), mat);
    m.position.y = -len / 2;
    g.add(m);
    parent.add(g);
    // rounded joint cap so segments do not show a seam
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r1 * 1.15, 10, 8), mat);
    cap.position.copy(to);
    parent.add(cap);
    return g;
  };

  root._legs = [];

  // ---- Chelipeds: raised and folded in front, black-tipped pincers -------
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 0.26, 0.010, 0.215);
    root.add(arm);
    // all points below are relative to the shoulder
    const elbow = V(s * 0.150, 0.075, 0.150);        // merus: out and forward
    const wrist = V(s * 0.075, 0.215, 0.290);        // carpus: in, up, forward
    bone(arm, V(0, 0, 0), elbow, 0.050, 0.044, redMat);
    bone(arm, elbow, wrist, 0.045, 0.042, redMat);
    // Scylla serrata carries two spines on the carpus (wrist); Carpilius has none
    for (let q = 0; q < (m.carpalSpines ?? 0); q++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.052, 5), redMat);
      sp.position.copy(wrist.clone().lerp(elbow, 0.10 + q * 0.20));
      sp.position.y += 0.030;
      sp.position.x += s * 0.018;
      sp.quaternion.setFromUnitVectors(V(0, 1, 0), V(s * 0.5, 0.75, 0.42).normalize());
      arm.add(sp);
    }

    // propodus — the swollen white hand, aligned wrist -> finger base
    const fBase = V(s * 0.020, 0.360, 0.360);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), handMat);
    const mid = wrist.clone().lerp(fBase, 0.5);
    hand.position.copy(mid);
    hand.scale.set(1.0, 1.85, 1.1);
    hand.quaternion.setFromUnitVectors(V(0, 1, 0), fBase.clone().sub(wrist).normalize());
    arm.add(hand);
    // red flush on the outer face of the hand
    const flush = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), redMat);
    flush.position.copy(mid); flush.position.x += s * 0.028;
    flush.scale.set(0.55, 1.7, 0.95);
    flush.quaternion.copy(hand.quaternion);
    arm.add(flush);

    // Fixed finger (pollex) and movable dactyl. Both curve toward each other
    // and end in black — the single most recognisable crab feature.
    const fixTip = V(s * -0.055, 0.520, 0.420);
    bone(arm, fBase, fixTip, 0.030, 0.012, handMat);
    const fixBlack = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.085, 8), tipMat);
    fixBlack.position.copy(fixTip.clone().lerp(fBase, 0.16));
    fixBlack.quaternion.setFromUnitVectors(V(0, 1, 0), fixTip.clone().sub(fBase).normalize());
    arm.add(fixBlack);

    const hinge = new THREE.Group();
    hinge.position.copy(fBase.clone().add(V(s * 0.030, 0.035, -0.010)));
    arm.add(hinge);
    const dacTip = V(s * -0.070, 0.180, 0.062);       // relative to the hinge
    bone(hinge, V(0, 0, 0), dacTip, 0.027, 0.011, handMat);
    const dacBlack = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.078, 8), tipMat);
    dacBlack.position.copy(dacTip.clone().multiplyScalar(0.86));
    dacBlack.quaternion.setFromUnitVectors(V(0, 1, 0), dacTip.clone().normalize());
    hinge.add(dacBlack);

    root._legs.push({ mesh: arm, side: s, phase: 0, kind: 'claw' });
    root._legs.push({ mesh: hinge, side: s, phase: 0, kind: 'pincer' });
  }

  // ---- Four pairs of walking legs, arched out and back -------------------
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Group();
      const w = surfaceAt(CARA, 0.28 + i * 0.16, 'w');
      leg.position.set(s * (w - 0.02), -0.010, 0.145 - i * 0.108);
      root.add(leg);
      const spread = 0.30 - i * 0.20;                 // front legs point forward
      const k1 = V(s * 0.20, 0.075, spread * 0.55);
      const k2 = V(s * 0.40, -0.055, spread * 0.85);
      const foot = V(s * 0.50, -0.235, spread * 1.05);
      const isPaddle = (m.paddle ?? false) && i === 3;
      bone(leg, V(0, 0, 0), k1, 0.030, 0.026, limbMat);
      bone(leg, k1, k2, 0.026, isPaddle ? 0.024 : 0.020, limbMat);
      if (isPaddle) {
        // Last leg pair flattened into an oar — this is what lets a mud crab
        // swim rather than only walk, and it is the fastest way to tell the
        // species from a reef crab.
        const dir = foot.clone().sub(k2).normalize();
        const blade = new THREE.Mesh(new THREE.SphereGeometry(0.080, 14, 10), limbMat);
        blade.position.copy(k2.clone().lerp(foot, 0.56));
        blade.scale.set(0.22, 1.35, 0.92);
        blade.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
        leg.add(blade);
        // the segment before it is flattened too, though less so
        const prop = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 9), limbMat);
        prop.position.copy(k1.clone().lerp(k2, 0.6));
        prop.scale.set(0.34, 1.25, 0.9);
        prop.quaternion.setFromUnitVectors(V(0, 1, 0), k2.clone().sub(k1).normalize());
        leg.add(prop);
      } else {
        bone(leg, k2, foot, 0.020, 0.008, limbMat);
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.075, 6), tipMat);
        claw.position.copy(foot.clone().lerp(k2, 0.1));
        claw.quaternion.setFromUnitVectors(V(0, 1, 0), foot.clone().sub(k2).normalize());
        leg.add(claw);
      }
      if (m.legBands ?? true) {
        for (const [a, b, t] of [[V(0,0,0), k1, 0.55], [k1, k2, 0.45], [k1, k2, 0.8]]) {
          const band = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), bandMat);
          band.position.copy(a.clone().lerp(b, t));
          band.scale.set(1, 0.5, 1);
          band.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
          leg.add(band);
        }
      }
      root._legs.push({ mesh: leg, side: s, phase: i * 0.85, kind: 'leg' });
    }
  }

  root._anim = { kind: 'scuttle', freq: 2.4, amp: 0.13, t: Math.random() * 6 };
  root.scale.setScalar(species.length / 1.0);   // species.length = carapace width
  root.userData.species = species.id;
  root.userData.sizeRef = species.length;
  return root;
}

/* ---------------------------------------------------------------- builder */

const _cache = new Map();

export function buildOddity(species, key, { variant, detail = 'med' } = {}) {
  const plan = ODD_PLANS[key];
  if (plan.custom === 'star') return buildStarfish(species, variant);
  if (plan.custom === 'crab') return buildCrab(species, variant);
  const [segments, radial] = resFor(detail, 'odd');
  const root = new THREE.Group();

  // Plans may author these directly or derive them per species.
  const stations = typeof plan.stations === 'function'
    ? plan.stations(species) : plan.stations;
  const bodyLength = typeof plan.bodyLength === 'function'
    ? plan.bodyLength(species) : plan.bodyLength;
  const yScale = plan.yScaleFor ? plan.yScaleFor(species) : (plan.yScale || null);

  const geo = organicBody({
    stations,
    length: bodyLength,
    segments, radial,
    groove: plan.groove ? (t, th) => plan.groove(t, th, species) : null,
    yScale,
  });

  const ck = key + ':' + species.id;
  let tex = _cache.get(ck);
  if (!tex) {
    tex = {
      map: makeSkinTexture((u, v) => plan.skin(u, v, species), 768, 384),
      bump: makeBumpTexture((u, v) => plan.bump(u, v, species), 512, 256),
    };
    _cache.set(ck, tex);
  }

  const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: tex.map, bumpMap: tex.bump, bumpScale: 0.06,
    roughness: key === 'turtle' ? 0.72 : 0.58, metalness: 0.04,
  }));
  root.add(body);
  root._body = body;
  root._basePos = geo.attributes.position.array.slice();
  root._segments = segments;
  root._radial = radial;
  root._bodyLength = bodyLength;

  plan.parts(root, species);

  root._anim = { ...plan.anim, t: Math.random() * 6 };
  root.scale.setScalar(plan.norm(species.length));
  root.userData.species = species.id;
  root.userData.sizeRef = species.length;
  return root;
}

export function animateOddity(root, dt, speed01 = 1) {
  const a = root._anim;
  if (!a) return;
  a.t += dt * (0.4 + speed01 * a.freq);
  const s = Math.sin(a.t * Math.PI * 2);

  switch (a.kind) {
    case 'wingwave': {
      if (!wantsDeform(root)) break;
      // A manta does not flap rigidly — a wave travels out along each wing.
      const base = root._basePos;
      const pos = root._body.geometry.attributes.position;
      const arr = pos.array;
      const stride = root._radial + 1;
      const amp = a.amp * (0.4 + speed01 * 0.6);
      for (let i = 0; i <= root._segments; i++) {
        for (let j = 0; j < stride; j++) {
          const k = (i * stride + j) * 3;
          const x = base[k];
          const lift = Math.sin(a.t * Math.PI * 2 - Math.abs(x) * a.wave * 6) * amp
                     * Math.pow(Math.min(1, Math.abs(x) / 0.5), 1.6);
          arr[k + 1] = base[k + 1] + lift;
        }
      }
      pos.needsUpdate = true;
      refreshNormals(root, root._body.geometry);
      break;
    }
    case 'flipperFlap':
      if (root._flippers) {
        const f = s * a.amp;
        root._flippers[0].rotation.x = -0.10 + f;
        root._flippers[1].rotation.x = -0.10 + f;
        if (root._flippers[2]) root._flippers[2].rotation.x = -0.05 - f * 0.35;
        if (root._flippers[3]) root._flippers[3].rotation.x = -0.05 - f * 0.35;
      }
      break;
    case 'sunScull':
      if (root._fins) for (const f of root._fins) f.mesh.rotation.x = s * a.amp * f.dir;
      break;
    case 'jetArms': {
      if (root._arms) for (const arm of root._arms) {
        arm.mesh.rotation.x = Math.sin(a.t * Math.PI * 2 + arm.phase) * arm.amp;
        arm.mesh.rotation.y = Math.cos(a.t * Math.PI * 1.4 + arm.phase * 0.7) * arm.amp * 0.7;
      }
      break;
    }
    case 'seahorseHover': {
      // the dorsal fin blurs; the whole animal bobs gently on the current
      if (root._dorsal) root._dorsal.rotation.y = Math.sin(a.t * 42) * 0.35;
      root.position.y += Math.sin(a.t * Math.PI * 2 * 0.5) * 0.0015;
      break;
    }
    case 'spineSide': {
      if (!wantsDeform(root)) {
        if (root._tail) {
          const amp = a.amp * (0.4 + speed01 * 0.6);
          root._tail.position.x = Math.sin((a.t - a.wave) * Math.PI * 2) * amp;
        }
        break;
      }
      const base = root._basePos;
      const pos = root._body.geometry.attributes.position;
      const arr = pos.array;
      const stride = root._radial + 1;
      const amp = a.amp * (0.4 + speed01 * 0.6);
      for (let i = 0; i <= root._segments; i++) {
        const t = i / root._segments;
        const w = Math.pow(Math.max(0, (t - a.bendFrom) / (1 - a.bendFrom)), 2);
        const off = Math.sin((a.t - t * a.wave) * Math.PI * 2) * amp * w;
        for (let j = 0; j < stride; j++) {
          const k = (i * stride + j) * 3;
          arr[k] = base[k] + off;
        }
      }
      pos.needsUpdate = true;
      refreshNormals(root, root._body.geometry);
      if (root._tail) root._tail.position.x = Math.sin((a.t - a.wave) * Math.PI * 2) * amp;
      break;
    }
  }

  if (a.kind === 'starCurl' && root._basePos && wantsDeform(root)) {
    // arms lift and settle very slowly, as a sea star creeps
    const base = root._basePos;
    const pos = root._body.geometry.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i], z = base[i + 2];
      const r = Math.hypot(x, z);
      const ang = Math.atan2(z, x);
      arr[i + 1] = base[i + 1]
        + Math.sin(a.t * Math.PI * 2 * 0.4 + ang * 2.5) * r * r * 0.14;
    }
    pos.needsUpdate = true;
    refreshNormals(root, root._body.geometry);
  }
  if (a.kind === 'scuttle' && root._legs) {
    for (const l of root._legs) {
      if (l.kind === 'claw') {
        // the raised arms sway gently around their built pose
        l.mesh.rotation.z = Math.sin(a.t * Math.PI * 0.8 + l.side) * a.amp * 0.28;
        l.mesh.rotation.x = Math.sin(a.t * Math.PI * 0.6) * a.amp * 0.15;
      } else if (l.kind === 'pincer') {
        // the dactyl hinges open and shut against the fixed finger
        l.mesh.rotation.x = -Math.abs(Math.sin(a.t * Math.PI * 1.2)) * 0.34;
      } else {
        const p = a.t * Math.PI * 2 + l.phase + (l.side > 0 ? 0 : Math.PI);
        l.mesh.rotation.z = Math.sin(p) * a.amp * 0.42;
        l.mesh.rotation.y = Math.cos(p) * a.amp * 0.22;
      }
    }
  }

  if (root._lure) {
    const p = 0.78 + Math.sin(a.t * 2.0) * 0.22;
    root._lure.halo.scale.setScalar(p);
    root._lure.halo.material.opacity = 0.22 + p * 0.16;
    if (root._lure.halo2) {
      root._lure.halo2.scale.setScalar(0.85 + p * 0.3);
      root._lure.halo2.material.opacity = 0.09 + p * 0.09;
    }
  }
}
