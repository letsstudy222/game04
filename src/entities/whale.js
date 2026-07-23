// whale.js — Blue whale, rebuilt as one continuous surface.
//
// Proportions are taken from the real animal (28 m reference):
//   max width  4.3 m  (15.4% of length), at ~34% back from the snout
//   max depth  3.8 m
//   flipper    3.4 m  (12% of length)
//   fluke span 7.0 m  (25% of length)
//   dorsal fin 0.35 m — tiny, set ~78% back: the rorqual signature
//   60-ish ventral pleats running chin to navel
//
// Everything that used to be a glued-on primitive (rostrum, splash guard,
// throat grooves, mouth line) is now carved into or painted onto the single
// body surface, so there are no seams and the silhouette is continuous.

import * as THREE from 'three';
import { organicBody, mottle, foil, makeEye, makeSkinTexture, makeBumpTexture } from './bodySurface.js';

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Cross-sections along the spine. t = 0 snout, t = 1 fluke notch.
// Note how w > hTop at the head (flat broad rostrum) but w < hTop past t≈0.85
// (laterally compressed tail stock) — that transition is what reads as "whale".
const STATIONS = [
  { t: 0.00, w: 0.004, hTop: 0.004, hBot: 0.003, yOff: 0.000 },
  { t: 0.03, w: 0.020, hTop: 0.011, hBot: 0.010, yOff: -0.001 },
  { t: 0.07, w: 0.036, hTop: 0.019, hBot: 0.021, yOff: -0.002 },
  { t: 0.12, w: 0.050, hTop: 0.027, hBot: 0.032, yOff: -0.003 },
  { t: 0.17, w: 0.061, hTop: 0.036, hBot: 0.044, yOff: -0.004 },
  { t: 0.22, w: 0.070, hTop: 0.046, hBot: 0.056, yOff: -0.004 },
  { t: 0.28, w: 0.075, hTop: 0.056, hBot: 0.067, yOff: -0.003 },
  { t: 0.34, w: 0.077, hTop: 0.062, hBot: 0.073, yOff: -0.002 },
  { t: 0.42, w: 0.076, hTop: 0.062, hBot: 0.069, yOff: 0.000 },
  { t: 0.50, w: 0.071, hTop: 0.058, hBot: 0.060, yOff: 0.000 },
  { t: 0.58, w: 0.063, hTop: 0.052, hBot: 0.050, yOff: 0.000 },
  { t: 0.66, w: 0.053, hTop: 0.045, hBot: 0.041, yOff: 0.000 },
  { t: 0.74, w: 0.042, hTop: 0.037, hBot: 0.032, yOff: 0.000 },
  { t: 0.81, w: 0.031, hTop: 0.030, hBot: 0.025, yOff: 0.000 },
  { t: 0.87, w: 0.021, hTop: 0.024, hBot: 0.018, yOff: 0.000 },
  { t: 0.92, w: 0.014, hTop: 0.019, hBot: 0.014, yOff: 0.000 },
  { t: 0.96, w: 0.009, hTop: 0.014, hBot: 0.010, yOff: 0.000 },
  { t: 1.00, w: 0.005, hTop: 0.009, hBot: 0.006, yOff: 0.000 },
];

const PLEAT_COUNT = 30;

// Carve creases and raise the rostrum ridge / splash guard.
function grooveFn(t, th) {
  const s = Math.sin(th);
  let g = 0;

  // --- ventral pleats: chin (t 0.05) to navel (t 0.46), lower body only ---
  // Broad throat swell: the ventral groove field bulges the underside slightly.
  if (t > 0.04 && t < 0.48 && s < 0.3) {
    const fadeIn = smoothstep(0.04, 0.12, t);
    const fadeOut = 1 - smoothstep(0.36, 0.48, t);
    const fadeSide = 1 - smoothstep(-0.2, 0.3, s);
    g -= 0.05 * fadeIn * fadeOut * fadeSide;
  }

  // --- mouth line: a crease along the lip, snout to jaw corner ---
  if (t < 0.27) {
    const lipAt = -0.12 - t * 0.5;                 // lip drops toward the corner
    const d = Math.abs(s - lipAt);
    g += Math.exp(-(d * d) / 0.0016) * 0.09 * (1 - smoothstep(0.2, 0.27, t));
  }

  // --- peduncle keel: flattened ridge either side of the tail stock ---
  if (t > 0.8) {
    const side = Math.pow(Math.abs(Math.cos(th)), 6);
    g -= side * 0.25 * smoothstep(0.8, 0.95, t);   // negative = push outward
  }

  // --- rostrum ridge + splash guard (raised, so negative displacement) ---
  if (t < 0.24 && s > 0.55) {
    const crest = Math.pow(Math.max(0, s), 6);
    g -= crest * 0.16 * (1 - smoothstep(0.16, 0.24, t));
  }
  if (t > 0.10 && t < 0.16 && s > 0.6) {           // splash guard bump
    const bump = Math.exp(-Math.pow((t - 0.13) / 0.018, 2)) * Math.pow(s, 4);
    g -= bump * 0.5;
  }
  return g;
}

const BACK = new THREE.Color(0x53708a);
const FLANK = new THREE.Color(0x7794a8);
const BELLY = new THREE.Color(0xc3d0d6);
const _c = new THREE.Color();

function shadeFn(t, th, s) {
  const up = (s + 1) * 0.5;                        // 0 belly .. 1 back
  // two-stage countershade: back -> flank -> belly
  if (up > 0.55) _c.copy(FLANK).lerp(BACK, smoothstep(0.55, 0.95, up));
  else _c.copy(BELLY).lerp(FLANK, smoothstep(0.12, 0.55, up));

  // Mottling — blue whales are named for their pale grey blotching.
  const m = mottle(t * 26, th * 2.4);
  const m2 = mottle(t * 61 + 5, th * 5.5);
  const blotch = (m * 0.65 + m2 * 0.35 - 0.5);
  _c.offsetHSL(0, -0.02, blotch * 0.085);

  // Pleats read darker in the crease.
  if (t > 0.04 && t < 0.48 && s < 0.3) {
    const line = Math.pow(Math.abs(Math.cos(th * PLEAT_COUNT)), 10);
    const fade = smoothstep(0.04, 0.11, t) * (1 - smoothstep(0.38, 0.48, t))
               * (1 - smoothstep(-0.15, 0.3, s));
    _c.multiplyScalar(1 - line * fade * 0.3);
  }
  // Dark mouth line.
  if (t < 0.27) {
    const lipAt = -0.12 - t * 0.5;
    const d = Math.abs(s - lipAt);
    const lip = Math.exp(-(d * d) / 0.0009) * (1 - smoothstep(0.2, 0.27, t));
    _c.multiplyScalar(1 - lip * 0.55);
  }
  // Pale chin patch, as on the real animal.
  if (t < 0.2 && s < -0.5) _c.lerp(BELLY, 0.35 * (1 - smoothstep(0.1, 0.2, t)));
  return _c;
}

// Texture-space skin: this resolves 34 throat pleats crisply, which geometry
// at any affordable vertex count cannot.
function skinAt(u, v) {
  const s = Math.sin(u * Math.PI * 2);          // +1 back, -1 belly
  const up = (s + 1) * 0.5;
  if (up > 0.55) _c.copy(FLANK).lerp(BACK, smoothstep(0.55, 0.96, up));
  else _c.copy(BELLY).lerp(FLANK, smoothstep(0.1, 0.55, up));

  // Blue-whale mottling: overlapping pale blotches.
  const m1 = mottle(v * 34, u * 15);
  const m2 = mottle(v * 88 + 7, u * 34 + 3);
  const m3 = mottle(v * 15 - 4, u * 7);
  _c.offsetHSL(0, -0.015, ((m1 * 0.4 + m2 * 0.25 + m3 * 0.35) - 0.5) * 0.16);

  // Ventral pleats — chin to navel, on the lower body only.
  if (v > 0.035 && v < 0.5 && s < 0.34) {
    const line = Math.pow(Math.abs(Math.cos(u * Math.PI * 2 * 34)), 26);
    const fade = smoothstep(0.035, 0.1, v) * (1 - smoothstep(0.4, 0.5, v))
               * (1 - smoothstep(-0.1, 0.34, s));
    _c.multiplyScalar(1 - line * fade * 0.42);
  }
  // Jaw line, snout to corner.
  if (v < 0.28) {
    const lipAt = -0.1 - v * 0.55;
    const d = Math.abs(s - lipAt);
    const lip = Math.exp(-(d * d) / 0.0012) * (1 - smoothstep(0.21, 0.28, v));
    _c.multiplyScalar(1 - lip * 0.6);
  }
  // Pale chin patch and the lighter underside of the tail stock.
  if (v < 0.22 && s < -0.45) _c.lerp(BELLY, 0.4 * (1 - smoothstep(0.11, 0.22, v)));
  return [_c.r, _c.g, _c.b];
}

function bumpAt(u, v) {
  const s = Math.sin(u * Math.PI * 2);
  let h = 0.55;
  if (v > 0.035 && v < 0.5 && s < 0.34) {
    const line = Math.pow(Math.abs(Math.cos(u * Math.PI * 2 * 34)), 26);
    const fade = smoothstep(0.035, 0.1, v) * (1 - smoothstep(0.4, 0.5, v))
               * (1 - smoothstep(-0.1, 0.34, s));
    h -= line * fade * 0.5;                     // grooves sink
  }
  if (v < 0.28) {
    const lipAt = -0.1 - v * 0.55;
    const d = Math.abs(s - lipAt);
    h -= Math.exp(-(d * d) / 0.0012) * 0.45 * (1 - smoothstep(0.21, 0.28, v));
  }
  h += (mottle(v * 90, u * 40) - 0.5) * 0.06;   // fine skin texture
  return h;
}

let _skinTex = null, _bumpTex = null;

export function buildBlueWhale(species, { segments = 96, radial = 56 } = {}) {
  const root = new THREE.Group();

  const geo = organicBody({
    stations: STATIONS, length: 1, segments, radial,
    groove: grooveFn,
  });
  if (!_skinTex) { _skinTex = makeSkinTexture(skinAt, 1024, 512); }
  if (!_bumpTex) { _bumpTex = makeBumpTexture(bumpAt, 1024, 512); }
  const skin = new THREE.MeshStandardMaterial({
    map: _skinTex, bumpMap: _bumpTex, bumpScale: 0.06,
    roughness: 0.58, metalness: 0.04,
  });
  const body = new THREE.Mesh(geo, skin);
  root.add(body);
  root._body = body;
  root._basePos = geo.attributes.position.array.slice();  // for spine bending
  root._segments = segments;
  root._radial = radial;

  const finMat = new THREE.MeshStandardMaterial({ color: 0x5a7690, roughness: 0.6 });

  // --- Pectoral flippers: long, slender, pointed. 12% of body length. ---
  for (const s of [-1, 1]) {
    const fl = new THREE.Mesh(foil([
      [0.000, 0.022], [0.022, 0.018], [0.048, 0.000],
      [0.076, -0.052], [0.060, -0.070], [0.030, -0.052], [0.004, -0.020],
    ], 0.006, 0.25), finMat);
    fl.scale.x = s;
    fl.position.set(s * 0.066, -0.030, 0.5 - 0.31);
    fl.rotation.z = s * -0.16;
    fl.rotation.x = 0.14;
    root.add(fl);
  }

  // --- Tiny falcate dorsal fin, set far back (rorqual signature) ---
  const dorsal = new THREE.Mesh(foil([
    [0.000, 0.014], [0.010, 0.010], [0.019, -0.004],
    [0.014, -0.014], [0.004, -0.016],
  ], 0.004, 0.3), finMat);
  dorsal.rotation.z = Math.PI / 2;      // stand it upright
  dorsal.position.set(0, 0.030, 0.5 - 0.775);
  root.add(dorsal);

  // --- Fluke: broad, swept, with the centre notch. 25% span. ---
  const tail = new THREE.Group();
  tail.position.z = 0.5 - 0.90;
  root.add(tail);
  for (const s of [-1, 1]) {
    const fk = new THREE.Mesh(foil([
      [0.000, 0.028], [0.045, 0.020], [0.092, -0.004],
      [0.125, -0.048], [0.086, -0.050], [0.036, -0.034], [0.000, -0.014],
    ], 0.005, 0.22), finMat);
    fk.scale.x = s;
    fk.position.z = -0.075;
    tail.add(fk);
  }
  root._tail = tail;

  // --- Eye at the jaw corner: small, dark, wet ---
  for (const s of [-1, 1]) {
    const e = makeEye(0.0062, 0x243139, 0x080b0e);
    e.scale.x = s;
    e.position.set(s * 0.0665, -0.021, 0.5 - 0.235);
    root.add(e);
  }

  // --- Blowhole: two dark slits on the raised guard ---
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x121a20, roughness: 1 });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), holeMat);
    h.scale.set(0.55, 0.5, 2.2);
    h.position.set(s * 0.006, 0.032, 0.5 - 0.142);
    root.add(h);
  }

  root._anim = { kind: 'whaleSpine', freq: 0.55, amp: 1, t: Math.random() * 6 };
  root.scale.setScalar(species.length);
  root.userData.species = species.id;
  return root;
}

/**
 * Bend the whole body along a travelling sine wave — real cetaceans swim by
 * undulating the rear third vertically, not by rotating a rigid tail.
 */
export function animateWhale(root, dt, speed01 = 1) {
  const a = root._anim;
  if (!a) return;
  a.t += dt * (0.35 + speed01 * a.freq);

  const base = root._basePos;
  const pos = root._body.geometry.attributes.position;
  const arr = pos.array;
  const stride = root._radial + 1;
  const amp = 0.05 * (0.35 + speed01 * 0.65);

  for (let i = 0; i <= root._segments; i++) {
    const t = i / root._segments;
    // only the rear half flexes, ramping up towards the tail
    const weight = Math.pow(Math.max(0, (t - 0.32) / 0.68), 2.1);
    const yOff = Math.sin((a.t - t * 0.85) * Math.PI * 2) * amp * weight;
    for (let j = 0; j < stride; j++) {
      const k = (i * stride + j) * 3;
      arr[k + 1] = base[k + 1] + yOff;
    }
  }
  pos.needsUpdate = true;
  root._body.geometry.computeVertexNormals();

  // Fluke follows the wave, one beat behind the body.
  const tailT = 1.0;
  const w = Math.pow((tailT - 0.32) / 0.68, 2.1);
  root._tail.position.y = Math.sin((a.t - tailT * 0.85) * Math.PI * 2) * amp * w;
  root._tail.rotation.x = Math.cos((a.t - tailT * 0.85) * Math.PI * 2) * 0.5 * amp * w / 0.05;
}
