// swimmers.js — Every streamlined swimmer, built the same way the blue whale is:
// one continuous surface whose cross-section morphs along the body, with all
// fine detail (gill slits, countershade edges, stripes, skin grain) painted into
// a procedurally generated texture rather than modelled as geometry.
//
// A body plan is pure data: cross-section stations + a skin function + a parts
// function for the fins. Adding a species is authoring numbers, not code.

import * as THREE from 'three';
import { organicBody, mottle, foil, foilShaded, makeEye, makeSkinTexture, makeBumpTexture } from './bodySurface.js';
import { wantsDeform, refreshNormals, resFor } from '../core/lod.js';

const finMatVC = (extra = {}) => new THREE.MeshStandardMaterial(
  { vertexColors: true, roughness: 0.68, side: THREE.DoubleSide, ...extra });

// Place a mirrored pair of eyes, sunk into the head so they sit near flush.
function addEyes(root, { r, x, y, z, iris, pupil = 0x0a0b0d }) {
  for (const s of [-1, 1]) {
    const e = makeEye(r, iris, pupil);
    e.scale.x = s;
    e.position.set(s * x, y, z);
    root.add(e);
  }
}

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const _c = new THREE.Color();

/* --------------------------------------------------------- shared profiles */

// Reference cross-sections for a heavy-bodied lamnid shark. Every shark in the
// game is derived from this by the per-species `morph` block, so the family
// keeps a consistent silhouette while each animal stays identifiable.
const SHARK_BASE = [
  { t: 0.00, w: 0.007, hTop: 0.008, hBot: 0.006, yOff: 0 },
  { t: 0.04, w: 0.032, hTop: 0.036, hBot: 0.029, yOff: -0.002 },
  { t: 0.10, w: 0.060, hTop: 0.068, hBot: 0.057, yOff: -0.003 },
  { t: 0.17, w: 0.083, hTop: 0.094, hBot: 0.080, yOff: -0.003 },
  { t: 0.25, w: 0.096, hTop: 0.108, hBot: 0.093, yOff: -0.002 },
  { t: 0.33, w: 0.101, hTop: 0.114, hBot: 0.099, yOff: 0 },
  { t: 0.42, w: 0.099, hTop: 0.111, hBot: 0.095, yOff: 0 },
  { t: 0.52, w: 0.092, hTop: 0.102, hBot: 0.086, yOff: 0 },
  { t: 0.62, w: 0.080, hTop: 0.088, hBot: 0.072, yOff: 0 },
  { t: 0.72, w: 0.063, hTop: 0.070, hBot: 0.056, yOff: 0 },
  { t: 0.80, w: 0.048, hTop: 0.055, hBot: 0.042, yOff: 0 },
  { t: 0.87, w: 0.033, hTop: 0.041, hBot: 0.030, yOff: 0 },
  { t: 0.93, w: 0.022, hTop: 0.030, hBot: 0.021, yOff: 0 },
  { t: 0.97, w: 0.015, hTop: 0.022, hBot: 0.015, yOff: 0 },
  { t: 1.00, w: 0.010, hTop: 0.017, hBot: 0.011, yOff: 0 },
];

// Skin functions run once per texel, so colours are resolved once per species
// and cached rather than allocated inside the pixel loop.
const _pal = new Map();
function sharkPal(sp) {
  let p = _pal.get(sp.id);
  if (!p) {
    p = {
      belly: new THREE.Color(sp.colors.belly),
      back: new THREE.Color(sp.colors.body),
      deep: new THREE.Color(sp.colors.fin),
      tooth: new THREE.Color(0xe9e6dc),
      finOut: new THREE.Color(sp.colors.fin).multiplyScalar(0.6),
    };
    _pal.set(sp.id, p);
  }
  return p;
}

/* ------------------------------------------------------ reef fish profiles */

// Deep, laterally compressed perciform — clownfish and blue-green chromis.
const REEF_DEEP = [
  { t: 0.00, w: 0.014, hTop: 0.020, hBot: 0.018, yOff: 0 },
  { t: 0.05, w: 0.038, hTop: 0.072, hBot: 0.064, yOff: 0 },
  { t: 0.12, w: 0.062, hTop: 0.140, hBot: 0.122, yOff: 0 },
  { t: 0.22, w: 0.078, hTop: 0.196, hBot: 0.166, yOff: 0 },
  { t: 0.33, w: 0.085, hTop: 0.222, hBot: 0.184, yOff: 0 },
  { t: 0.45, w: 0.082, hTop: 0.214, hBot: 0.172, yOff: 0 },
  { t: 0.56, w: 0.072, hTop: 0.186, hBot: 0.146, yOff: 0 },
  { t: 0.67, w: 0.058, hTop: 0.146, hBot: 0.112, yOff: 0 },
  { t: 0.77, w: 0.043, hTop: 0.104, hBot: 0.078, yOff: 0 },
  { t: 0.85, w: 0.030, hTop: 0.068, hBot: 0.050, yOff: 0 },
  { t: 0.92, w: 0.020, hTop: 0.042, hBot: 0.031, yOff: 0 },
  { t: 1.00, w: 0.011, hTop: 0.022, hBot: 0.017, yOff: 0 },
];

// Toxotes jaculatrix. The signature is a nearly STRAIGHT dorsal profile from a
// pointed snout back to a dorsal fin set far down the body, against a strongly
// convex belly — the shape that lets it sight along its back at prey above.
const REEF_ARCHER = [
  { t: 0.00, w: 0.010, hTop: 0.032, hBot: 0.014, yOff: 0 },
  { t: 0.05, w: 0.028, hTop: 0.066, hBot: 0.052, yOff: 0 },
  { t: 0.12, w: 0.048, hTop: 0.087, hBot: 0.110, yOff: 0 },
  { t: 0.22, w: 0.064, hTop: 0.114, hBot: 0.170, yOff: 0 },
  { t: 0.33, w: 0.072, hTop: 0.144, hBot: 0.206, yOff: 0 },
  { t: 0.45, w: 0.070, hTop: 0.177, hBot: 0.198, yOff: 0 },
  { t: 0.56, w: 0.061, hTop: 0.206, hBot: 0.166, yOff: 0 },
  { t: 0.67, w: 0.049, hTop: 0.176, hBot: 0.126, yOff: 0 },
  { t: 0.77, w: 0.037, hTop: 0.130, hBot: 0.090, yOff: 0 },
  { t: 0.85, w: 0.027, hTop: 0.092, hBot: 0.062, yOff: 0 },
  { t: 0.92, w: 0.018, hTop: 0.057, hBot: 0.038, yOff: 0 },
  { t: 1.00, w: 0.010, hTop: 0.028, hBot: 0.019, yOff: 0 },
];

// Periophthalmodon schlosseri — elongate and SUB-CYLINDRICAL. Half-width and
// half-height stay close together along the trunk, so the cross-section is
// nearly round rather than the blade of a reef fish.
const REEF_ELONGATE = [
  { t: 0.00, w: 0.030, hTop: 0.038, hBot: 0.030, yOff: 0 },
  { t: 0.05, w: 0.055, hTop: 0.060, hBot: 0.048, yOff: 0 },
  { t: 0.12, w: 0.068, hTop: 0.078, hBot: 0.058, yOff: 0 },
  { t: 0.20, w: 0.070, hTop: 0.082, hBot: 0.062, yOff: 0 },
  { t: 0.32, w: 0.066, hTop: 0.080, hBot: 0.062, yOff: 0 },
  { t: 0.45, w: 0.058, hTop: 0.075, hBot: 0.058, yOff: 0 },
  { t: 0.58, w: 0.049, hTop: 0.068, hBot: 0.052, yOff: 0 },
  { t: 0.70, w: 0.039, hTop: 0.058, hBot: 0.044, yOff: 0 },
  { t: 0.80, w: 0.030, hTop: 0.048, hBot: 0.036, yOff: 0 },
  { t: 0.88, w: 0.023, hTop: 0.038, hBot: 0.028, yOff: 0 },
  { t: 0.94, w: 0.017, hTop: 0.030, hBot: 0.022, yOff: 0 },
  { t: 1.00, w: 0.011, hTop: 0.022, hBot: 0.016, yOff: 0 },
];

/** Sample a reef fish's own (possibly scaled) profile, so appendages follow it. */
function surfaceOf(sp, t, key) {
  const st = PLANS.reeffish.stations(sp);
  for (let i = 0; i < st.length - 1; i++) {
    if (t >= st[i].t && t <= st[i + 1].t) {
      const k = (t - st[i].t) / (st[i + 1].t - st[i].t);
      const e = k * k * (3 - 2 * k);
      return st[i][key] + (st[i + 1][key] - st[i][key]) * e;
    }
  }
  return st[st.length - 1][key];
}

/**
 * Caudal fin. `fork` drives the shape of the trailing edge:
 *   negative -> rounded (the centre reaches further back than the lobes)
 *   0        -> truncate
 *   1        -> deeply forked
 * A clownfish's rounded tail and a chromis's deeply forked one are the quickest
 * way to tell those two apart in the water.
 */
function addCaudal(root, mk, m) {
  const fork = m.fork ?? 0.8;
  const span = m.caudSpan ?? 0.082;
  const len = m.caudLen ?? 0.090;
  const mid = len * (1 - fork * 0.55);
  const tail = new THREE.Group();
  tail.position.z = 0.5 - (m.caudZ ?? 0.94);
  root.add(tail);
  const caud = mk([
    [0.000, 0.006],
    [span, -len * 0.58], [span * 0.83, -len],
    [span * 0.13, -mid],
    [-span * 0.83, -len], [-span, -len * 0.58],
  ], 0.004, 0.28);
  caud.rotation.z = Math.PI / 2;
  tail.add(caud);
  root._tail = tail;
}

// Reef fish colours resolved once per species rather than per texel.
const _reefPal = new Map();
function reefPal(sp) {
  let p = _reefPal.get(sp.id);
  if (!p) {
    p = {
      body: new THREE.Color(sp.colors.body),
      belly: new THREE.Color(sp.colors.belly ?? 0xffffff),
      band: new THREE.Color(sp.colors.band ?? 0xffffff),
    };
    _reefPal.set(sp.id, p);
  }
  return p;
}

/* ------------------------------------------------------------- body plans */

export const PLANS = {
  // ---------------------------------------------------------------- SHARK
  shark: {
    // One base profile — a heavy-bodied lamnid — reshaped per species by the
    // `morph` block in species.js. Requiem sharks (lemon, Caribbean reef) are
    // slimmer with a blunter, flatter snout, a markedly longer upper caudal
    // lobe and almost no caudal keel; the great white keeps the pointed snout,
    // near-lunate tail and hard keel of a lamnid.
    stations(sp) {
      const m = sp.morph || {};
      const depth = m.depth ?? 1, width = m.width ?? 1;
      const snoutW = m.snoutW ?? 1, snoutH = m.snoutH ?? 1;
      return SHARK_BASE.map((s) => {
        const nose = 1 - ss(0, 0.18, s.t);   // 1 at the tip, 0 by mid-head
        const wf = width * (1 + (snoutW - 1) * nose);
        const hf = depth * (1 + (snoutH - 1) * nose);
        return {
          t: s.t, w: s.w * wf,
          hTop: s.hTop * hf, hBot: s.hBot * hf, yOff: s.yOff,
        };
      });
    },
    anim: { kind: 'spineSide', freq: 1.25, amp: 0.030, bendFrom: 0.30, wave: 0.9 },
    skin(u, v, sp) {
      const p = sharkPal(sp);
      const m = sp.morph || {};
      const s = Math.sin(u * Math.PI * 2);
      // How the back meets the belly is species-diagnostic. A great white's
      // demarcation is abrupt and ragged; a lemon shark grades softly, because
      // its job is to disappear against sand rather than to break up a
      // silhouette seen from below.
      const wobbleAmt = m.edgeWobble ?? 0.26;
      const sharp = m.edgeSharp ?? 0.10;
      const wobble = (mottle(v * 9, u * 3) - 0.5) * wobbleAmt;
      const edge = (m.edgeY ?? -0.16) + wobble;
      const k = ss(edge - sharp, edge + sharp, s);
      _c.copy(p.belly).lerp(p.back, k);
      if (s > 0.45) _c.lerp(p.deep, ss(0.45, 1, s));
      // dermal denticle grain
      _c.offsetHSL(0, 0, (mottle(v * 190, u * 90) - 0.5) * 0.05);
      // five gill slits
      if (v > 0.14 && v < 0.25 && Math.abs(s) < 0.75) {
        for (let i = 0; i < 5; i++) {
          const gv = 0.152 + i * 0.021;
          const d = Math.abs(v - gv - Math.abs(s) * 0.012);
          _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.0000075) * 0.5);
        }
      }
      // mouth: broad crescent under the snout, with a serrated tooth row
      if (v < 0.20) {
        const lip = -0.42 - v * 0.6;
        const d = Math.abs(s - lip);
        const gum = Math.exp(-(d * d) / 0.004) * (1 - ss(0.14, 0.20, v));
        _c.multiplyScalar(1 - gum * 0.78);
        const tooth = Math.pow(Math.abs(Math.cos(u * Math.PI * 2 * 26)), 6);
        const inRow = Math.exp(-Math.pow((d - 0.055) / 0.03, 2)) * (1 - ss(0.13, 0.19, v));
        _c.lerp(p.tooth, tooth * inRow * (m.toothShow ?? 0.85));
      }
      // ampullae pores speckling the snout
      if (v < 0.16) {
        const q = mottle(v * 260, u * 130);
        if (q > 0.83) _c.multiplyScalar(0.8);
      }
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v, sp) {
      const m = sp.morph || {};
      const s = Math.sin(u * Math.PI * 2);
      let h = 0.55;
      if (v > 0.14 && v < 0.25 && Math.abs(s) < 0.75) {
        for (let i = 0; i < 5; i++) {
          const gv = 0.152 + i * 0.021;
          const d = Math.abs(v - gv - Math.abs(s) * 0.012);
          h -= Math.exp(-(d * d) / 0.0000075) * 0.45;
        }
      }
      if (v < 0.19) {
        const lip = -0.42 - v * 0.6;
        const d = Math.abs(s - lip);
        h -= Math.exp(-(d * d) / 0.004) * 0.4 * (1 - ss(0.13, 0.19, v));
      }
      // interdorsal ridge shows up in the bump map as a raised midline
      if (m.interdorsal && v > 0.42 && v < 0.78) {
        h += Math.pow(Math.max(0, s), 12) * 0.22;
      }
      h += (mottle(v * 200, u * 95) - 0.5) * 0.07;
      return h;
    },
    groove(t, th, sp) {
      const m = sp.morph || {};
      const s = Math.sin(th);
      let g = 0;
      // caudal keel — pronounced on a lamnid, almost absent on requiem sharks
      const keel = m.keel ?? 0.18;
      if (t > 0.80) g -= Math.pow(Math.abs(Math.cos(th)), 10) * keel * ss(0.80, 0.94, t);
      // slight flattening under the snout only
      if (t < 0.10 && s < -0.55) g += 0.05 * (1 - ss(0.05, 0.10, t));
      // dorsal ridge along the back, as on a heavy-bodied shark
      if (t > 0.15 && t < 0.60 && s > 0.75) {
        g -= Math.pow(s, 8) * 0.05 * ss(0.15, 0.25, t) * (1 - ss(0.48, 0.60, t));
      }
      // Carcharhinus perezi carries a low ridge running between the two dorsal
      // fins — the field mark that separates it from its congeners.
      if (m.interdorsal && t > 0.42 && t < 0.78 && s > 0.80) {
        g -= Math.pow(s, 14) * 0.055 * ss(0.42, 0.50, t) * (1 - ss(0.70, 0.78, t));
      }
      return g;
    },
    parts(root, sp) {
      const m = sp.morph || {};
      const p = sharkPal(sp);
      const fm = finMatVC();
      const mkf = (o, th, tp) => new THREE.Mesh(
        foilShaded(o, th, tp, sp.colors.fin, p.finOut.getHex()), fm);
      const sc = (o, k) => o.map(([a, b]) => [a * k, b * k]);

      // first dorsal — tall broad triangle on the great white, a touch smaller
      // and set further back on the requiem sharks
      const d1s = m.d1 ?? 1, d1z = m.d1z ?? 0.38;
      const d1 = mkf(sc([
        [0.000, 0.075], [0.055, 0.055], [0.115, -0.020],
        [0.070, -0.062], [0.012, -0.070],
      ], d1s), 0.006, 0.3);
      d1.rotation.z = Math.PI / 2;
      d1.position.set(0, 0.094, 0.5 - d1z);
      root.add(d1);

      // second dorsal. On Negaprion brevirostris this is nearly the size of the
      // first — the single most reliable way to identify the animal — while on
      // other sharks it is a small flag.
      const d2s = m.d2 ?? 1;
      const sd = mkf(sc([
        [0, 0.022], [0.026, 0.008], [0.020, -0.020], [0.004, -0.024],
      ], d2s), 0.004, 0.3);
      sd.rotation.z = Math.PI / 2;
      sd.position.set(0, 0.043, 0.5 - 0.80);
      root.add(sd);

      // anal fin — ordinary size whatever the second dorsal does
      const af = mkf([
        [0, 0.022], [0.026, 0.008], [0.020, -0.020], [0.004, -0.024],
      ], 0.004, 0.3);
      af.rotation.z = -Math.PI / 2;
      af.position.set(0, -0.036, 0.5 - 0.82);
      root.add(af);

      // pectorals — long scythes swept back
      const pk = m.pectoral ?? 1;
      for (const s of [-1, 1]) {
        const pf = mkf(sc([
          [0.000, 0.030], [0.040, 0.014], [0.090, -0.055],
          [0.070, -0.082], [0.030, -0.060], [0.004, -0.024],
        ], pk), 0.005, 0.25);
        pf.scale.x = s;
        pf.position.set(s * 0.082, -0.055, 0.5 - 0.28);
        pf.rotation.z = s * -0.2;
        pf.rotation.x = 0.16;
        root.add(pf);
      }

      // pelvic fins
      for (const s of [-1, 1]) {
        const pv = mkf([
          [0, 0.016], [0.028, 0.004], [0.020, -0.026], [0.003, -0.024],
        ], 0.004, 0.3);
        pv.scale.x = s;
        pv.position.set(s * 0.03, -0.05, 0.5 - 0.66);
        root.add(pv);
      }

      // Caudal fin. `caudalLower` is the lower lobe as a fraction of the upper:
      // ~0.8 gives the great white's near-symmetric lunate tail, ~0.55 the
      // strongly heterocercal tail of a requiem shark.
      const U = 0.190, L = U * (m.caudalLower ?? 0.60);
      const tail = new THREE.Group();
      tail.position.z = 0.5 - 0.94;
      root.add(tail);
      const caud = mkf([
        [0.000, 0.010], [U * 0.395, -0.010], [U, -0.090],
        [U * 0.63, -0.115], [U * 0.158, -0.062],
        [-L * 0.61, -0.115], [-L, -0.075], [-L * 0.39, -0.020],
      ], 0.006, 0.2);
      caud.rotation.z = Math.PI / 2;
      tail.add(caud);
      root._tail = tail;

      // Mouth cavity only. The tooth row is painted into the skin texture —
      // modelled cones poked through the snout and read as spikes.
      const jaw = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({ color: 0x2a1f23, roughness: 1 }));
      jaw.rotation.x = Math.PI;
      jaw.scale.set(1.2 * (m.snoutW ?? 1), 0.38, 0.95);
      jaw.position.set(0, -0.056, 0.5 - 0.105);
      root.add(jaw);

      addEyes(root, {
        r: m.eyeR ?? 0.0135, x: 0.080 * (m.snoutW ?? 1), y: 0.014, z: 0.5 - 0.135,
        iris: m.eyeIris ?? 0x1b2228, pupil: m.eyePupil ?? 0x06070a,
      });
    },
  },

  // -------------------------------------------------------------- DOLPHIN
  dolphin: {
    stations: [
      { t: 0.00, w: 0.020, hTop: 0.018, hBot: 0.016, yOff: -0.010 },
      { t: 0.05, w: 0.028, hTop: 0.024, hBot: 0.021, yOff: -0.010 },
      { t: 0.09, w: 0.035, hTop: 0.032, hBot: 0.027, yOff: -0.008 },
      { t: 0.13, w: 0.052, hTop: 0.058, hBot: 0.040, yOff: -0.004 },
      { t: 0.20, w: 0.073, hTop: 0.080, hBot: 0.058, yOff: 0 },
      { t: 0.28, w: 0.089, hTop: 0.090, hBot: 0.070, yOff: 0 },
      { t: 0.36, w: 0.094, hTop: 0.092, hBot: 0.076, yOff: 0 },
      { t: 0.46, w: 0.090, hTop: 0.088, hBot: 0.072, yOff: 0 },
      { t: 0.56, w: 0.080, hTop: 0.080, hBot: 0.062, yOff: 0 },
      { t: 0.66, w: 0.066, hTop: 0.068, hBot: 0.050, yOff: 0 },
      { t: 0.76, w: 0.050, hTop: 0.054, hBot: 0.037, yOff: 0 },
      { t: 0.84, w: 0.036, hTop: 0.042, hBot: 0.026, yOff: 0 },
      { t: 0.90, w: 0.025, hTop: 0.032, hBot: 0.018, yOff: 0 },
      { t: 0.95, w: 0.017, hTop: 0.024, hBot: 0.012, yOff: 0 },
      { t: 1.00, w: 0.011, hTop: 0.016, hBot: 0.008, yOff: 0 },
    ],
    anim: { kind: 'spineVert', freq: 1.3, amp: 0.040, bendFrom: 0.34, wave: 0.9 },
    skin(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      // three-tone cape: dark dorsal cape, mid flank, pale belly
      const capeEdge = 0.60 + (mottle(v * 7, u * 2.5) - 0.5) * 0.14;
      if (up > capeEdge) _c.set(0x8b9aa4).lerp(new THREE.Color(0x455460), ss(capeEdge, 0.95, up));
      else _c.set(0xe4ebee).lerp(new THREE.Color(0x8b9aa4), ss(0.18, capeEdge, up));
      _c.offsetHSL(0, 0, (mottle(v * 40, u * 18) - 0.5) * 0.05);
      // groove where the melon meets the beak
      if (v > 0.085 && v < 0.125 && s > -0.4) {
        const d = Math.abs(v - 0.105);
        _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.00004) * 0.35);
      }
      // mouth line running back along the beak
      if (v < 0.2) {
        const lip = -0.22 - v * 0.4;
        const d = Math.abs(s - lip);
        _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.0012) * 0.6);
      }
      // blowhole
      const dbh = Math.hypot((v - 0.175) * 3.6, (Math.abs(s) > 0.93 ? 0 : (1 - s) * 0.6));
      if (dbh < 0.05 && s > 0.9) _c.multiplyScalar(0.35);
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      let h = 0.55;
      if (v > 0.085 && v < 0.125 && s > -0.4) {
        const d = Math.abs(v - 0.105);
        h -= Math.exp(-(d * d) / 0.00004) * 0.4;
      }
      if (v < 0.2) {
        const lip = -0.22 - v * 0.4;
        const d = Math.abs(s - lip);
        h -= Math.exp(-(d * d) / 0.0012) * 0.45;
      }
      return h;
    },
    groove(t, th) {
      const s = Math.sin(th);
      let g = 0;
      if (t > 0.86) g -= Math.pow(Math.abs(Math.cos(th)), 8) * 0.22 * ss(0.86, 0.97, t);
      // melon bulge
      if (t > 0.11 && t < 0.24 && s > 0.4) {
        g -= Math.exp(-Math.pow((t - 0.175) / 0.05, 2)) * Math.pow(s, 3) * 0.16;
      }
      return g;
    },
    parts(root, sp) {
      const finMat = new THREE.MeshStandardMaterial({ color: 0x4d5c68, roughness: 0.65 });
      // falcate dorsal
      const d1 = new THREE.Mesh(foil([
        [0.000, 0.058], [0.048, 0.030], [0.082, -0.030],
        [0.044, -0.048], [0.008, -0.055],
      ], 0.005, 0.3), finMat);
      d1.rotation.z = Math.PI / 2;
      d1.position.set(0, 0.088, 0.5 - 0.44);
      root.add(d1);
      for (const s of [-1, 1]) {
        const pf = new THREE.Mesh(foil([
          [0.000, 0.028], [0.036, 0.012], [0.078, -0.042],
          [0.056, -0.062], [0.020, -0.048], [0.003, -0.022],
        ], 0.005, 0.25), finMat);
        pf.scale.x = s;
        pf.position.set(s * 0.070, -0.048, 0.5 - 0.28);
        pf.rotation.z = s * -0.22;
        pf.rotation.x = 0.2;
        root.add(pf);
      }
      const tail = new THREE.Group();
      tail.position.z = 0.5 - 0.90;
      root.add(tail);
      for (const s of [-1, 1]) {
        const fk = new THREE.Mesh(foil([
          [0.000, 0.030], [0.055, 0.020], [0.115, -0.014],
          [0.150, -0.062], [0.100, -0.062], [0.040, -0.040], [0.000, -0.018],
        ], 0.005, 0.22), finMat);
        fk.scale.x = s; fk.position.z = -0.06;
        tail.add(fk);
      }
      root._tail = tail;
      addEyes(root, { r: 0.0115, x: 0.055, y: -0.006, z: 0.5 - 0.155,
                      iris: 0x2c3a44, pupil: 0x090c10 });
    },
  },

  // ------------------------------------------------------------- PORPOISE
  porpoise: {
    stations: [
      { t: 0.00, w: 0.030, hTop: 0.028, hBot: 0.026, yOff: 0 },
      { t: 0.06, w: 0.058, hTop: 0.056, hBot: 0.050, yOff: 0 },
      { t: 0.14, w: 0.085, hTop: 0.084, hBot: 0.072, yOff: 0 },
      { t: 0.24, w: 0.102, hTop: 0.100, hBot: 0.086, yOff: 0 },
      { t: 0.34, w: 0.107, hTop: 0.104, hBot: 0.090, yOff: 0 },
      { t: 0.46, w: 0.100, hTop: 0.098, hBot: 0.082, yOff: 0 },
      { t: 0.58, w: 0.086, hTop: 0.086, hBot: 0.068, yOff: 0 },
      { t: 0.70, w: 0.066, hTop: 0.070, hBot: 0.050, yOff: 0 },
      { t: 0.80, w: 0.048, hTop: 0.054, hBot: 0.035, yOff: 0 },
      { t: 0.88, w: 0.032, hTop: 0.040, hBot: 0.023, yOff: 0 },
      { t: 0.94, w: 0.021, hTop: 0.029, hBot: 0.015, yOff: 0 },
      { t: 1.00, w: 0.012, hTop: 0.018, hBot: 0.009, yOff: 0 },
    ],
    anim: { kind: 'spineVert', freq: 1.5, amp: 0.038, bendFrom: 0.36, wave: 0.9 },
    skin(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      if (up > 0.55) _c.set(0x8a97a1).lerp(new THREE.Color(0x4e5b66), ss(0.55, 0.95, up));
      else _c.set(0xe8eef0).lerp(new THREE.Color(0x8a97a1), ss(0.15, 0.55, up));
      _c.offsetHSL(0, 0, (mottle(v * 44, u * 20) - 0.5) * 0.04);
      // the vaquita's dark eye ring and lip patch — its best-known feature
      const de = Math.hypot((v - 0.135) * 5.2, (Math.abs(s) - 0.62) * 1.5);
      if (de < 0.16) _c.multiplyScalar(1 - (1 - de / 0.16) * 0.62);
      if (v < 0.09) {
        const lipD = Math.abs(s + 0.15);
        _c.multiplyScalar(1 - Math.exp(-(lipD * lipD) / 0.05) * 0.5 * (1 - ss(0.05, 0.09, v)));
      }
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v) { return 0.55 + (mottle(v * 60, u * 26) - 0.5) * 0.05; },
    groove(t, th) {
      let g = 0;
      if (t > 0.86) g -= Math.pow(Math.abs(Math.cos(th)), 8) * 0.2 * ss(0.86, 0.97, t);
      return g;
    },
    parts(root, sp) {
      const finMat = new THREE.MeshStandardMaterial({ color: 0x3d4a55, roughness: 0.65 });
      // tall triangular dorsal — porpoises differ from dolphins here
      const d1 = new THREE.Mesh(foil([
        [0.000, 0.055], [0.070, 0.010], [0.030, -0.048], [0.006, -0.052],
      ], 0.005, 0.3), finMat);
      d1.rotation.z = Math.PI / 2;
      d1.position.set(0, 0.100, 0.5 - 0.42);
      root.add(d1);
      for (const s of [-1, 1]) {
        const pf = new THREE.Mesh(foil([
          [0.000, 0.026], [0.034, 0.010], [0.068, -0.038],
          [0.048, -0.056], [0.016, -0.042], [0.003, -0.020],
        ], 0.005, 0.25), finMat);
        pf.scale.x = s;
        pf.position.set(s * 0.082, -0.052, 0.5 - 0.27);
        pf.rotation.z = s * -0.2; pf.rotation.x = 0.2;
        root.add(pf);
      }
      const tail = new THREE.Group();
      tail.position.z = 0.5 - 0.90;
      root.add(tail);
      for (const s of [-1, 1]) {
        const fk = new THREE.Mesh(foil([
          [0.000, 0.028], [0.052, 0.018], [0.108, -0.016],
          [0.138, -0.058], [0.092, -0.058], [0.036, -0.038], [0.000, -0.016],
        ], 0.005, 0.22), finMat);
        fk.scale.x = s; fk.position.z = -0.055;
        tail.add(fk);
      }
      root._tail = tail;
      addEyes(root, { r: 0.0125, x: 0.072, y: 0.004, z: 0.5 - 0.135,
                      iris: 0x27333c, pupil: 0x080b0e });
    },
  },

  // ----------------------------------------------------------------- TUNA
  tuna: {
    stations: [
      { t: 0.00, w: 0.010, hTop: 0.012, hBot: 0.010, yOff: 0 },
      { t: 0.05, w: 0.036, hTop: 0.044, hBot: 0.036, yOff: 0 },
      { t: 0.12, w: 0.060, hTop: 0.080, hBot: 0.066, yOff: 0 },
      { t: 0.20, w: 0.075, hTop: 0.108, hBot: 0.090, yOff: 0 },
      { t: 0.30, w: 0.082, hTop: 0.124, hBot: 0.102, yOff: 0 },
      { t: 0.40, w: 0.080, hTop: 0.122, hBot: 0.098, yOff: 0 },
      { t: 0.50, w: 0.072, hTop: 0.110, hBot: 0.086, yOff: 0 },
      { t: 0.60, w: 0.060, hTop: 0.092, hBot: 0.070, yOff: 0 },
      { t: 0.70, w: 0.046, hTop: 0.070, hBot: 0.052, yOff: 0 },
      { t: 0.79, w: 0.032, hTop: 0.050, hBot: 0.036, yOff: 0 },
      { t: 0.86, w: 0.022, hTop: 0.034, hBot: 0.024, yOff: 0 },
      { t: 0.92, w: 0.015, hTop: 0.022, hBot: 0.015, yOff: 0 },
      { t: 0.96, w: 0.011, hTop: 0.015, hBot: 0.010, yOff: 0 },
      { t: 1.00, w: 0.008, hTop: 0.010, hBot: 0.007, yOff: 0 },
    ],
    anim: { kind: 'spineSide', freq: 2.2, amp: 0.022, bendFrom: 0.55, wave: 1.1 },
    skin(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      // metallic steel-blue back, silver flank, white belly
      if (up > 0.58) _c.set(0x5d86ad).lerp(new THREE.Color(0x1f3d5e), ss(0.58, 0.98, up));
      else _c.set(0xf0f3f4).lerp(new THREE.Color(0xa8bfd0), ss(0.1, 0.58, up));
      // iridescent banding along the flank
      const band = Math.sin(v * 46 + s * 3) * 0.5 + 0.5;
      if (up > 0.3 && up < 0.62) _c.offsetHSL(0.02 * band, 0.05, band * 0.05);
      _c.offsetHSL(0, 0, (mottle(v * 120, u * 55) - 0.5) * 0.045);
      // gill cover
      if (v > 0.16 && v < 0.22) {
        const d = Math.abs(v - 0.19 - Math.abs(s) * 0.02);
        _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.00002) * 0.3);
      }
      if (v < 0.12) {
        const lip = -0.18 - v * 0.5;
        const d = Math.abs(s - lip);
        _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.0009) * 0.55);
      }
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      let h = 0.55;
      if (v > 0.16 && v < 0.22) {
        const d = Math.abs(v - 0.19 - Math.abs(s) * 0.02);
        h -= Math.exp(-(d * d) / 0.00002) * 0.35;
      }
      return h;
    },
    groove(t, th) {
      let g = 0;
      if (t > 0.80) g -= Math.pow(Math.abs(Math.cos(th)), 6) * 0.32 * ss(0.80, 0.94, t);
      return g;
    },
    parts(root, sp) {
      const finMat = new THREE.MeshStandardMaterial({ color: 0x2c4a6b, roughness: 0.6, metalness: 0.15 });
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xe8c33c, roughness: 0.5 });
      const d1 = new THREE.Mesh(foil([
        [0, 0.062], [0.05, 0.030], [0.070, -0.030], [0.010, -0.058],
      ], 0.004, 0.3), finMat);
      d1.rotation.z = Math.PI / 2;
      d1.position.set(0, 0.120, 0.5 - 0.30);
      root.add(d1);
      // finlets — the little yellow flags that mark a tuna
      for (let i = 0; i < 8; i++) {
        const t = 0.72 + i * 0.028;
        for (const dir of [1, -1]) {
          const fl = new THREE.Mesh(foil([
            [0, 0.012], [0.014, 0.002], [0.004, -0.012],
          ], 0.002, 0.4), yellowMat);
          fl.rotation.z = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          const hh = 0.05 * (1 - (t - 0.72) / 0.26);
          fl.position.set(0, dir * (hh + 0.012), 0.5 - t);
          root.add(fl);
        }
      }
      for (const s of [-1, 1]) {
        const pf = new THREE.Mesh(foil([
          [0, 0.020], [0.026, 0.006], [0.060, -0.038], [0.016, -0.032],
        ], 0.003, 0.3), finMat);
        pf.scale.x = s;
        pf.position.set(s * 0.060, -0.012, 0.5 - 0.26);
        pf.rotation.z = s * -0.3;
        root.add(pf);
      }
      const tail = new THREE.Group();
      tail.position.z = 0.5 - 0.95;
      root.add(tail);
      const caud = new THREE.Mesh(foil([
        [0.000, 0.008], [0.115, -0.052], [0.085, -0.078], [0.015, -0.030],
        [-0.085, -0.078], [-0.115, -0.052],
      ], 0.005, 0.2), finMat);
      caud.rotation.z = Math.PI / 2;
      tail.add(caud);
      root._tail = tail;
      addEyes(root, { r: 0.019, x: 0.060, y: 0.024, z: 0.5 - 0.10,
                      iris: 0xb9a35a, pupil: 0x0b0e12 });
    },
  },

  // ------------------------------------------------------- REEF FISH (deep-bodied)
  // ------------------------------------------------------------- REEF FISH
  // Four very different fish share this plan, selected by `morph.profile`:
  //   deep     — clownfish, blue-green chromis (deep, laterally compressed)
  //   archer   — banded archerfish (straight back, pointed head, dorsal set far
  //              back, superior mouth)
  //   elongate — giant mudskipper (sub-cylindrical, eyes on top of the head,
  //              arm-like pectorals, two dorsal fins)
  reeffish: {
    stations(sp) {
      const m = sp.morph || {};
      const base = { archer: REEF_ARCHER, elongate: REEF_ELONGATE }[m.profile] || REEF_DEEP;
      const d = m.depth ?? 1, w = m.width ?? 1;
      if (d === 1 && w === 1) return base;
      return base.map((s) => ({
        t: s.t, w: s.w * w, hTop: s.hTop * d, hBot: s.hBot * d, yOff: s.yOff,
      }));
    },
    anim: { kind: 'spineSide', freq: 2.8, amp: 0.030, bendFrom: 0.45, wave: 1.0 },
    skin(u, v, sp) {
      const m = sp.morph || {};
      const p = reefPal(sp);
      const s = Math.sin(u * Math.PI * 2);
      const up = (s + 1) * 0.5;
      _c.copy(p.belly).lerp(p.body, ss(m.shadeLo ?? 0.2, m.shadeHi ?? 0.72, up));

      if (m.pattern === 'bars3') {
        // three white bars with dark edging — the clownfish pattern
        for (const [bv, bw] of [[0.20, 0.055], [0.47, 0.06], [0.79, 0.042]]) {
          const d = Math.abs(v - bv);
          if (d < bw) {
            const inner = 1 - ss(bw * 0.55, bw, d);
            _c.lerp(p.band, inner);
            if (d > bw * 0.6) _c.multiplyScalar(1 - (1 - inner) * 0.55);
          }
        }
      } else if (m.pattern === 'wedges') {
        // Toxotes carries 4-6 WEDGE-shaped dark bars: broad on the back and
        // tapering to nothing before they reach the belly.
        for (const bv of [0.22, 0.40, 0.57, 0.74, 0.88]) {
          const taper = ss(0.30, 0.92, up);          // wide on top, gone below
          if (taper <= 0.001) continue;
          const bw = 0.028 * taper;
          const d = Math.abs(v - bv);
          if (d < bw) _c.lerp(p.band, (1 - ss(bw * 0.5, bw, d)) * 0.92);
        }
      } else if (m.pattern === 'mud') {
        // mud camouflage: coarse dark blotching over a dull ground
        const q = mottle(v * 26, u * 11);
        if (q > 0.56) _c.lerp(p.band, (q - 0.56) * 1.5);
        const r = mottle(v * 7 + 3.3, u * 3 + 1.7);
        _c.offsetHSL(0, 0, (r - 0.5) * 0.10);
      }

      // scale grain
      _c.offsetHSL(0, 0, (mottle(v * 150, u * 70) - 0.5) * 0.05);
      // gill cover crease
      const gv = m.gillV ?? 0.205;
      if (v > gv - 0.035 && v < gv + 0.035) {
        const d = Math.abs(v - gv - Math.abs(s) * 0.018);
        _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.000022) * 0.28);
      }
      // mouth line — below centre on a clownfish, ABOVE it on an archerfish
      if (v < (m.mouthTo ?? 0.11)) {
        const lip = (m.mouthY ?? -0.2) - v * 0.5;
        const d = Math.abs(s - lip);
        _c.multiplyScalar(1 - Math.exp(-(d * d) / (m.mouthW ?? 0.0012)) * 0.5);
      }
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v, sp) {
      let h = 0.55 + (mottle(v * 140, u * 64) - 0.5) * 0.09;
      // a mudskipper's skin is granular, not scaled
      if (sp.morph?.pattern === 'mud') h += (mottle(v * 320, u * 150) - 0.5) * 0.16;
      return h;
    },
    groove() { return 0; },
    parts(root, sp) {
      const m = sp.morph || {};
      const p = reefPal(sp);
      const inner = sp.colors.body;
      const outer = sp.colors.fin || 0x22252b;
      const rim = m.finRim ?? null;
      const fm = finMatVC();
      const mk = (o, th, tp) => new THREE.Mesh(foilShaded(o, th, tp, inner, outer, rim), fm);
      const st = (t, k) => surfaceOf(sp, t, k);

      if (m.profile === 'elongate') {
        /* ------------------------------------------- giant mudskipper ----
         * Sub-cylindrical, with TWO dorsal fins, muscular arm-like pectorals
         * it walks on, and periscope eyes sitting on top of the skull.
         */
        // first dorsal — short and sail-like, raised in display
        const d1 = mk([
          [0, 0.030], [0.030, 0.038], [0.052, 0.006], [0.030, -0.026], [0.005, -0.032],
        ], 0.003, 0.35);
        d1.rotation.z = Math.PI / 2;
        d1.position.set(0, st(0.34, 'hTop') * 0.92, 0.5 - 0.34);
        root.add(d1);
        // second dorsal — long and low, running most of the rear body
        const d2 = mk([
          [0, 0.030], [0.026, 0.026], [0.030, -0.090], [0.004, -0.100],
        ], 0.003, 0.35);
        d2.rotation.z = Math.PI / 2;
        d2.position.set(0, st(0.58, 'hTop') * 0.92, 0.5 - 0.58);
        root.add(d2);
        // anal fin — long and low, mirroring the second dorsal
        const an = mk([
          [0, 0.024], [0.022, 0.020], [0.026, -0.082], [0.004, -0.092],
        ], 0.003, 0.35);
        an.rotation.z = -Math.PI / 2;
        an.position.set(0, -st(0.60, 'hBot') * 0.90, 0.5 - 0.60);
        root.add(an);

        // Pectorals: these are limbs, not fins. A muscular fleshy base carries
        // a short rounded blade, and the pair is set low and well forward.
        const muscleMat = new THREE.MeshStandardMaterial(
          { color: sp.colors.fin, roughness: 0.72 });
        for (const s of [-1, 1]) {
          const arm = new THREE.Group();
          arm.position.set(s * st(0.22, 'w') * 0.86, -st(0.22, 'hBot') * 0.42, 0.5 - 0.22);
          const musc = new THREE.Mesh(new THREE.SphereGeometry(0.030, 12, 10), muscleMat);
          musc.scale.set(0.75, 0.85, 1.15);
          arm.add(musc);
          const blade = mk([
            [0, 0.026], [0.040, 0.012], [0.052, -0.026], [0.020, -0.040], [0.002, -0.030],
          ], 0.003, 0.4);
          blade.scale.x = s;
          blade.position.set(s * 0.016, -0.010, -0.006);
          blade.rotation.z = s * -0.85;      // splayed downward to prop the body
          arm.add(blade);
          root.add(arm);
        }
        // pelvic fins sit far forward on a mudskipper, close to the midline
        for (const s of [-1, 1]) {
          const pv = mk([[0, 0.012], [0.018, 0.002], [0.014, -0.030]], 0.002, 0.4);
          pv.scale.x = s;
          pv.position.set(s * 0.014, -st(0.30, 'hBot') * 0.92, 0.5 - 0.30);
          root.add(pv);
        }

        addCaudal(root, mk, m);

        // Periscope eyes: high on the skull, close together, each on a turret.
        const eT = m.eyeT ?? 0.10;
        const eY = st(eT, 'hTop');
        for (const s of [-1, 1]) {
          const turret = new THREE.Mesh(
            new THREE.SphereGeometry(0.030, 12, 10), muscleMat);
          turret.scale.set(0.85, 0.75, 0.85);
          turret.position.set(s * 0.026, eY * 0.86, 0.5 - eT);
          root.add(turret);
        }
        addEyes(root, {
          r: 0.026, x: 0.026, y: eY * 1.02, z: 0.5 - eT,
          iris: m.iris ?? 0x8a7238, pupil: 0x0a0b0d,
        });
        return;
      }

      /* ------------------------------------ clownfish / chromis / archer ---- */
      const dz = m.dorsalZ ?? 0.34;
      const dors = mk(m.dorsal ?? [
        [0, 0.062], [0.034, 0.054], [0.054, 0.012], [0.040, -0.046], [0.007, -0.066],
      ], 0.003, 0.35);
      dors.rotation.z = Math.PI / 2;
      dors.position.set(0, st(dz, 'hTop') * 0.98, 0.5 - dz);
      root.add(dors);

      const az = m.analZ ?? 0.60;
      const anal = mk(m.anal ?? [
        [0, 0.040], [0.030, 0.030], [0.034, -0.030], [0.006, -0.044],
      ], 0.003, 0.35);
      anal.rotation.z = -Math.PI / 2;
      anal.position.set(0, -st(az, 'hBot') * 0.97, 0.5 - az);
      root.add(anal);

      for (const s of [-1, 1]) {
        const pf = mk([
          [0, 0.030], [0.036, 0.010], [0.052, -0.032], [0.014, -0.036],
        ], 0.002, 0.35);
        pf.scale.x = s;
        pf.position.set(s * st(0.27, 'w') * 0.90, -0.018, 0.5 - 0.27);
        pf.rotation.z = s * -0.5;
        root.add(pf);
        const pv = mk([[0, 0.014], [0.016, 0.0], [0.012, -0.036]], 0.002, 0.4);
        pv.scale.x = s;
        pv.position.set(s * 0.026, -st(0.34, 'hBot') * 0.92, 0.5 - 0.34);
        root.add(pv);
      }

      addCaudal(root, mk, m);

      const eT = m.eyeT ?? 0.095;
      addEyes(root, {
        r: m.eyeR ?? 0.026,
        x: st(eT, 'w') * (m.eyeX ?? 0.78),
        y: st(eT, 'hTop') * (m.eyeY ?? 0.42),
        z: 0.5 - eT,
        iris: m.iris ?? 0x8fd4c0,
      });
    },
  },
};

/* ---------------------------------------------------------------- builder */

const _texCache = new Map();

export function buildSwimmer(species, planKey, { detail = 'med' } = {}) {
  const [segments, radial] = resFor(detail, 'swim');
  const plan = PLANS[planKey];
  const root = new THREE.Group();

  // A plan may author its cross-sections directly, or derive them per species
  // (sharks share one base profile reshaped by each animal's `morph` block).
  const stations = typeof plan.stations === 'function'
    ? plan.stations(species) : plan.stations;

  const geo = organicBody({
    stations, length: 1, segments, radial,
    groove: plan.groove ? (t, th) => plan.groove(t, th, species) : null,
  });

  // Textures are per-species (colours differ) but cached — a school of 20
  // clownfish shares one texture.
  const cacheKey = planKey + ':' + species.id;
  let tex = _texCache.get(cacheKey);
  if (!tex) {
    tex = {
      map: makeSkinTexture((u, v) => plan.skin(u, v, species), 768, 384),
      bump: makeBumpTexture((u, v) => plan.bump(u, v, species), 512, 256),
    };
    _texCache.set(cacheKey, tex);
  }

  const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: tex.map, bumpMap: tex.bump, bumpScale: 0.05,
    roughness: 0.55, metalness: planKey === 'tuna' ? 0.22 : 0.05,
  }));
  root.add(body);
  root._body = body;
  root._basePos = geo.attributes.position.array.slice();
  root._segments = segments;
  root._radial = radial;

  plan.parts(root, species);

  root._anim = { ...plan.anim, t: Math.random() * 6 };
  root.scale.setScalar(species.length);
  root.userData.species = species.id;
  root.userData.sizeRef = species.length;
  return root;
}

/** Travelling-wave spine deformation. Axis depends on the animal's lineage. */
export function animateSwimmer(root, dt, speed01 = 1) {
  const a = root._anim;
  if (!a || !root._basePos) return;
  a.t += dt * (0.4 + speed01 * a.freq);

  // Far away the body stops flexing; only the tail keeps beating. At that
  // distance the difference is invisible and the saving is the whole cost.
  if (!wantsDeform(root)) {
    if (root._tail) {
      const amp = a.amp * (0.4 + speed01 * 0.6);
      const off = Math.sin((a.t - a.wave) * Math.PI * 2) * amp;
      if (a.kind === 'spineVert') root._tail.position.y = off;
      else root._tail.position.x = off;
    }
    return;
  }

  const vertical = a.kind === 'spineVert';       // cetaceans beat up and down
  const axis = vertical ? 1 : 0;                  // 1 = Y, 0 = X
  const base = root._basePos;
  const pos = root._body.geometry.attributes.position;
  const arr = pos.array;
  const stride = root._radial + 1;
  const amp = a.amp * (0.4 + speed01 * 0.6);
  const from = a.bendFrom;

  for (let i = 0; i <= root._segments; i++) {
    const t = i / root._segments;
    const wgt = Math.pow(Math.max(0, (t - from) / (1 - from)), 2.0);
    const off = Math.sin((a.t - t * a.wave) * Math.PI * 2) * amp * wgt;
    for (let j = 0; j < stride; j++) {
      const k = (i * stride + j) * 3;
      arr[k + axis] = base[k + axis] + off;
    }
  }
  pos.needsUpdate = true;
  refreshNormals(root, root._body.geometry);

  if (root._tail) {
    const off = Math.sin((a.t - a.wave) * Math.PI * 2) * amp;
    const lead = Math.cos((a.t - a.wave) * Math.PI * 2) * amp;
    if (vertical) { root._tail.position.y = off; root._tail.rotation.x = lead * 9; }
    else { root._tail.position.x = off; root._tail.rotation.y = -lead * 9; }
  }
}
