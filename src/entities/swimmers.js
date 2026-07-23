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

/* ------------------------------------------------------------- body plans */

export const PLANS = {
  // ---------------------------------------------------------------- SHARK
  shark: {
    stations: [
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
    ],
    anim: { kind: 'spineSide', freq: 1.25, amp: 0.030, bendFrom: 0.30, wave: 0.9 },
    skin(u, v) {
      const s = Math.sin(u * Math.PI * 2);
      // The demarcation between slate back and white belly is famously abrupt
      // and irregular — that ragged edge is the animal's signature.
      const wobble = (mottle(v * 9, u * 3) - 0.5) * 0.26;
      const edge = -0.16 + wobble;
      const k = ss(edge - 0.1, edge + 0.1, s);
      _c.set(0xf2f4f2).lerp(new THREE.Color(0x6d7780), k);
      if (s > 0.45) _c.lerp(new THREE.Color(0x59636c), ss(0.45, 1, s));
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
        // triangular teeth just inside the gum line
        const tooth = Math.pow(Math.abs(Math.cos(u * Math.PI * 2 * 26)), 6);
        const inRow = Math.exp(-Math.pow((d - 0.055) / 0.03, 2)) * (1 - ss(0.13, 0.19, v));
        _c.lerp(new THREE.Color(0xe9e6dc), tooth * inRow * 0.85);
      }
      // ampullae pores speckling the snout
      if (v < 0.16) {
        const p = mottle(v * 260, u * 130);
        if (p > 0.83) _c.multiplyScalar(0.8);
      }
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v) {
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
      h += (mottle(v * 200, u * 95) - 0.5) * 0.07;
      return h;
    },
    groove(t, th) {
      const s = Math.sin(th);
      let g = 0;
      // caudal keel — a real ridge, but subtle: overdoing it flattens the tail
      if (t > 0.80) g -= Math.pow(Math.abs(Math.cos(th)), 10) * 0.18 * ss(0.80, 0.94, t);
      // slight flattening under the snout only (not the whole forebody)
      if (t < 0.10 && s < -0.55) g += 0.05 * (1 - ss(0.05, 0.10, t));
      // dorsal ridge along the back, as on a heavy-bodied shark
      if (t > 0.15 && t < 0.60 && s > 0.75) {
        g -= Math.pow(s, 8) * 0.05 * ss(0.15, 0.25, t) * (1 - ss(0.48, 0.60, t));
      }
      return g;
    },
    parts(root, sp) {
      const fm = finMatVC();
      const mkf = (o, th, tp) => new THREE.Mesh(foilShaded(o, th, tp, 0x6d7780, 0x3b444c), fm);
      const finMat = fm;
      // first dorsal — tall, broad-based triangle
      const d1 = mkf([
        [0.000, 0.075], [0.055, 0.055], [0.115, -0.020],
        [0.070, -0.062], [0.012, -0.070],
      ], 0.006, 0.3);
      d1.rotation.z = Math.PI / 2;
      d1.position.set(0, 0.094, 0.5 - 0.38);
      root.add(d1);
      // second dorsal + anal, small
      for (const [yy, zz, flip] of [[0.043, 0.5 - 0.80, 1], [-0.036, 0.5 - 0.82, -1]]) {
        const f = mkf([
          [0, 0.022], [0.026, 0.008], [0.020, -0.020], [0.004, -0.024],
        ], 0.004, 0.3);
        f.rotation.z = flip > 0 ? Math.PI / 2 : -Math.PI / 2;
        f.position.set(0, yy, zz);
        root.add(f);
      }
      // pectorals — long scythes swept back
      for (const s of [-1, 1]) {
        const pf = mkf([
          [0.000, 0.030], [0.040, 0.014], [0.090, -0.055],
          [0.070, -0.082], [0.030, -0.060], [0.004, -0.024],
        ], 0.005, 0.25);
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
      // heterocercal caudal: upper lobe distinctly longer
      const tail = new THREE.Group();
      tail.position.z = 0.5 - 0.94;
      root.add(tail);
      const caud = mkf([
        [0.000, 0.010], [0.075, -0.010], [0.190, -0.090],
        [0.120, -0.115], [0.030, -0.062],
        [-0.070, -0.115], [-0.115, -0.075], [-0.045, -0.020],
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
      jaw.scale.set(1.2, 0.38, 0.95);
      jaw.position.set(0, -0.056, 0.5 - 0.105);
      root.add(jaw);
      // Great whites have a nearly black eye with no visible iris ring.
      addEyes(root, { r: 0.0135, x: 0.080, y: 0.014, z: 0.5 - 0.135,
                      iris: 0x1b2228, pupil: 0x06070a });
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
  reeffish: {
    stations: [
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
    ],
    anim: { kind: 'spineSide', freq: 2.8, amp: 0.030, bendFrom: 0.45, wave: 1.0 },
    skin(u, v, sp) {
      const s = Math.sin(u * Math.PI * 2);
      const body = new THREE.Color(sp.colors.body);
      const belly = new THREE.Color(sp.colors.belly || 0xffffff);
      const up = (s + 1) * 0.5;
      _c.copy(belly).lerp(body, ss(0.2, 0.72, up));
      // three white bars with dark edging — the clownfish pattern
      if (sp.id === 'clownfish' && sp.colors.band) {
        const band = new THREE.Color(sp.colors.band);
        for (const [bv, bw] of [[0.20, 0.055], [0.47, 0.06], [0.79, 0.042]]) {
          const d = Math.abs(v - bv);
          if (d < bw) {
            const inner = 1 - ss(bw * 0.55, bw, d);
            _c.lerp(band, inner);
            if (d > bw * 0.6) _c.multiplyScalar(1 - (1 - inner) * 0.55);   // dark edge
          }
        }
      }
      // scale grain
      _c.offsetHSL(0, 0, (mottle(v * 150, u * 70) - 0.5) * 0.05);
      if (v > 0.17 && v < 0.24) {
        const d = Math.abs(v - 0.205 - Math.abs(s) * 0.018);
        _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.000022) * 0.28);
      }
      if (v < 0.11) {
        const lip = -0.2 - v * 0.5;
        const d = Math.abs(s - lip);
        _c.multiplyScalar(1 - Math.exp(-(d * d) / 0.0012) * 0.5);
      }
      return [_c.r, _c.g, _c.b];
    },
    bump(u, v) { return 0.55 + (mottle(v * 140, u * 64) - 0.5) * 0.09; },
    groove() { return 0; },
    parts(root, sp) {
      // Reef-fish fins are translucent at the root and darken to the margin,
      // often with a bright outer rim — never flat black.
      const inner = sp.colors.body;
      const outer = sp.colors.fin || 0x22252b;
      const rim = sp.id === 'clownfish' ? 0xf4f6f5 : null;
      const fm = finMatVC();
      const mk = (o, th, tp) => new THREE.Mesh(foilShaded(o, th, tp, inner, outer, rim), fm);

      const dors = mk([
        [0, 0.062], [0.034, 0.054], [0.054, 0.012], [0.040, -0.046], [0.007, -0.066],
      ], 0.003, 0.35);
      dors.rotation.z = Math.PI / 2;
      dors.position.set(0, 0.218, 0.5 - 0.34);
      root.add(dors);

      const anal = mk([
        [0, 0.040], [0.030, 0.030], [0.034, -0.030], [0.006, -0.044],
      ], 0.003, 0.35);
      anal.rotation.z = -Math.PI / 2;
      anal.position.set(0, -0.178, 0.5 - 0.60);
      root.add(anal);

      for (const s of [-1, 1]) {
        const pf = mk([
          [0, 0.030], [0.036, 0.010], [0.052, -0.032], [0.014, -0.036],
        ], 0.002, 0.35);
        pf.scale.x = s;
        pf.position.set(s * 0.070, -0.018, 0.5 - 0.27);
        pf.rotation.z = s * -0.5;
        root.add(pf);
        const pv = mk([
          [0, 0.014], [0.016, 0.0], [0.012, -0.036],
        ], 0.002, 0.4);
        pv.scale.x = s;
        pv.position.set(s * 0.026, -0.168, 0.5 - 0.34);
        root.add(pv);
      }

      const tail = new THREE.Group();
      tail.position.z = 0.5 - 0.94;
      root.add(tail);
      const caud = mk([
        [0.000, 0.006], [0.082, -0.052], [0.068, -0.090], [0.011, -0.050],
        [-0.068, -0.090], [-0.082, -0.052],
      ], 0.004, 0.28);
      caud.rotation.z = Math.PI / 2;
      tail.add(caud);
      root._tail = tail;

      // Clownfish eyes are DARK with a thin warm iris — not white.
      addEyes(root, { r: 0.026, x: 0.058, y: 0.046, z: 0.5 - 0.095,
                      iris: sp.id === 'clownfish' ? 0xd08a2a : 0x8fd4c0 });
    },
  },
};

/* ---------------------------------------------------------------- builder */

const _texCache = new Map();

export function buildSwimmer(species, planKey, { detail = 'med' } = {}) {
  const [segments, radial] = resFor(detail, 'swim');
  const plan = PLANS[planKey];
  const root = new THREE.Group();

  const geo = organicBody({
    stations: plan.stations, length: 1, segments, radial,
    groove: plan.groove ? (t, th) => plan.groove(t, th) : null,
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
