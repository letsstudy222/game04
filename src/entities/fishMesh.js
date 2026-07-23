// fishMesh.js — Anatomically-authored procedural creatures.
//
// Each species' silhouette is defined by REAL proportion control points
// (t along the body, radius as a fraction of max girth), measured from the
// animal's actual body plan. Three techniques do most of the visual work:
//   1. PROFILE POINTS  — authored silhouette instead of a generic sine spindle.
//   2. LATERAL COMPRESS — real fish are narrow side-to-side; a circular
//      cross-section is the #1 thing that makes procedural fish look fake.
//   3. COUNTERSHADING  — dark dorsal fading to pale ventral, via vertex colors.
// Detail (mesh resolution + extra parts) scales with body length, so a blue
// whale gets pleats, rostrum and blowhole while a 5 cm fry stays cheap.
//
// Convention: long axis = +Z. Head at +0.5, tail at -0.5, unit length ~1.

import * as THREE from 'three';
import { buildBlueWhale, animateWhale } from './whale.js';
import { buildSwimmer, animateSwimmer } from './swimmers.js';
import { buildOddity, animateOddity } from './oddities.js';
import { applyCaustics } from '../world/waterShader.js';

/* ------------------------------------------------------------------ utils */

function mat(color, { rough = 0.72, metal = 0.04, flat = false, side = null } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: flat });
  if (side) m.side = side;
  return m;
}

function vcMat({ rough = 0.7, metal = 0.05 } = {}) {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal });
}

// Build a radius function from authored control points [[t, r], ...] (t 0..1).
function profileFromPoints(pts) {
  return (t) => {
    t = Math.min(1, Math.max(0, t));
    for (let i = 0; i < pts.length - 1; i++) {
      const [t0, r0] = pts[i], [t1, r1] = pts[i + 1];
      if (t >= t0 && t <= t1) {
        const k = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
        const s = k * k * (3 - 2 * k);           // smoothstep -> no faceted kinks
        return r0 + (r1 - r0) * s;
      }
    }
    return pts[pts.length - 1][1];
  };
}

// Lathe a body along +Z from a profile.
function spindle(len, maxR, profile, segments, radial) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    pts.push(new THREE.Vector2(Math.max(0.0008, profile(t) * maxR), t * len));
  }
  const geo = new THREE.LatheGeometry(pts, radial);
  geo.rotateX(-Math.PI / 2);        // long axis -> +Z, profile(0) ends up at +Z
  geo.translate(0, 0, len / 2);
  geo.computeVertexNormals();
  return geo;
}

// Dark top -> pale belly. `sharp` mimics the hard demarcation sharks have.
function countershade(geo, topHex, bellyHex, sharp = 1) {
  const pos = geo.attributes.position;
  const top = new THREE.Color(topHex), belly = new THREE.Color(bellyHex);
  const col = new Float32Array(pos.count * 3);
  let maxY = 1e-6;
  for (let i = 0; i < pos.count; i++) maxY = Math.max(maxY, Math.abs(pos.getY(i)));
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let k = (pos.getY(i) / maxY + 1) * 0.5;      // 0 belly .. 1 top
    k = Math.min(1, Math.max(0, (k - 0.5) * sharp + 0.5));
    k = k * k * (3 - 2 * k);
    c.copy(belly).lerp(top, k);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Flat blade in the Y-Z plane (vertical fins: dorsal, caudal, anal).
function blade(points) {
  const g = new THREE.BufferGeometry();
  const v = [];
  for (const p of points) v.push(0, p[0], p[1]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const idx = [];
  for (let i = 1; i < points.length - 1; i++) idx.push(0, i, i + 1);
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Flat blade in the X-Z plane (horizontal: flippers, flukes, wings).
function bladeFlat(points) {
  const g = new THREE.BufferGeometry();
  const v = [];
  for (const p of points) v.push(p[0], 0, p[1]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const idx = [];
  for (let i = 1; i < points.length - 1; i++) idx.push(0, i, i + 1);
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Whale/dolphin fluke: two swept lobes with a centre notch.
function notchedFluke(span, chord) {
  return bladeFlat([
    [0, chord * 0.28],                 // leading centre
    [span * 0.45, chord * 0.05],
    [span, -chord * 0.55],             // swept tip
    [span * 0.42, -chord * 0.28],
    [0, -chord * 0.05],                // notch
  ]);
}

// Shark caudal: heterocercal crescent, upper lobe longer.
function lunateTail(h, chord) {
  return blade([
    [0, chord * 0.15],
    [h * 1.05, chord * 0.62],          // upper lobe tip
    [h * 0.42, -chord * 0.1],
    [-h * 0.62, -chord * 0.5],         // lower lobe tip
    [-h * 0.3, chord * 0.02],
  ]);
}

function eyePair(parent, r, z, x, y, hex = 0x0d0d10) {
  const m = mat(hex, { rough: 0.18, metal: 0.1 });
  const hi = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m);
    e.position.set(x * s, y, z);
    parent.add(e);
    const g = new THREE.Mesh(new THREE.SphereGeometry(r * 0.3, 6, 6), hi);
    g.position.set(x * s * 1.05, y + r * 0.35, z + r * 0.5);
    parent.add(g);
  }
}

// Mouth line: a thin dark wedge pressed into the head.
function mouthLine(parent, width, z, y, depth, hex = 0x14161a) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, depth, depth * 0.9), mat(hex, { rough: 1 }));
  m.position.set(0, y, z);
  parent.add(m);
  return m;
}

/* --------------------------------------------------- anatomy definitions */
// r values are fractions of max girth; authored from real body plans.

const PLAN = {
  whale: {                                   // blue whale: slender rorqual
    profile: [[0, 0.06], [0.04, 0.30], [0.10, 0.55], [0.18, 0.76], [0.28, 0.93],
              [0.36, 1.00], [0.46, 0.95], [0.56, 0.84], [0.66, 0.68], [0.76, 0.50],
              [0.85, 0.33], [0.92, 0.20], [0.97, 0.12], [1, 0.06]],
    maxR: 0.088, compress: 0.92, sharp: 1.5,
  },
  dolphin: {                                 // bottlenose: melon + beak
    profile: [[0, 0.16], [0.05, 0.30], [0.12, 0.62], [0.22, 0.88], [0.32, 1.00],
              [0.45, 0.95], [0.58, 0.82], [0.70, 0.62], [0.82, 0.40], [0.90, 0.26],
              [0.96, 0.16], [1, 0.09]],
    maxR: 0.105, compress: 0.88, sharp: 1.6,
  },
  porpoise: {                                // vaquita: blunt, no beak
    profile: [[0, 0.30], [0.06, 0.58], [0.15, 0.83], [0.26, 0.98], [0.36, 1.00],
              [0.50, 0.92], [0.63, 0.76], [0.75, 0.55], [0.86, 0.34], [0.94, 0.19],
              [1, 0.09]],
    maxR: 0.125, compress: 0.9, sharp: 1.8,
  },
  shark: {                                   // great white: conical snout, fusiform
    profile: [[0, 0.05], [0.04, 0.26], [0.10, 0.52], [0.18, 0.76], [0.27, 0.93],
              [0.36, 1.00], [0.48, 0.94], [0.60, 0.80], [0.72, 0.60], [0.82, 0.40],
              [0.90, 0.25], [0.96, 0.16], [1, 0.11]],
    maxR: 0.125, compress: 0.86, sharp: 3.2,
  },
  fish: {                                    // generic deep-bodied fish
    profile: [[0, 0.10], [0.06, 0.38], [0.14, 0.68], [0.24, 0.90], [0.36, 1.00],
              [0.50, 0.96], [0.64, 0.82], [0.76, 0.60], [0.86, 0.38], [0.94, 0.20],
              [1, 0.10]],
    maxR: 0.2, compress: 0.42, sharp: 2.2,
  },
  tuna: {                                    // fast pelagic: narrow peduncle
    profile: [[0, 0.08], [0.05, 0.32], [0.13, 0.64], [0.23, 0.88], [0.34, 1.00],
              [0.47, 0.94], [0.60, 0.78], [0.72, 0.54], [0.83, 0.30], [0.91, 0.15],
              [0.96, 0.09], [1, 0.07]],
    maxR: 0.155, compress: 0.62, sharp: 2.6,
  },
  angler: {                                  // globular ambush predator
    profile: [[0, 0.34], [0.06, 0.66], [0.14, 0.90], [0.24, 1.00], [0.38, 0.96],
              [0.52, 0.82], [0.66, 0.62], [0.78, 0.42], [0.88, 0.25], [1, 0.10]],
    maxR: 0.26, compress: 0.78, sharp: 1.2,
  },
};

// Mesh resolution tier by real body length.
function tierFor(len) {
  if (len >= 8) return { seg: 34, radial: 26, hi: true };
  if (len >= 2) return { seg: 26, radial: 20, hi: true };
  if (len >= 0.5) return { seg: 20, radial: 14, hi: false };
  return { seg: 14, radial: 10, hi: false };
}

/* ------------------------------------------------------------- builders */

// Shared: lathe body with countershading + lateral compression.
function makeBody(plan, colors, tier) {
  const prof = profileFromPoints(plan.profile);
  const geo = spindle(1, plan.maxR, prof, tier.seg, tier.radial);
  countershade(geo, colors.body, colors.belly || 0xffffff, plan.sharp);
  const mesh = new THREE.Mesh(geo, vcMat());
  mesh.scale.x = plan.compress;
  return { mesh, prof, maxR: plan.maxR };
}

function buildWhale(sp, root) {
  const c = sp.colors, tier = tierFor(sp.length), plan = PLAN.whale;
  const { mesh, prof, maxR } = makeBody(plan, c, tier);
  root.add(mesh);
  const finMat = mat(c.fin || c.body);

  // Rostrum: the flat, broad U-shaped head plate of a rorqual.
  const ros = new THREE.Mesh(new THREE.SphereGeometry(maxR * 0.62, 16, 12), mat(c.body));
  ros.scale.set(1.05, 0.42, 2.5);
  ros.position.z = 0.40;
  root.add(ros);
  // central ridge running down the rostrum
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(maxR * 0.07, maxR * 0.1, 0.2), mat(c.body));
  ridge.position.set(0, maxR * 0.22, 0.41);
  root.add(ridge);

  // Blowhole + splash guard
  const guard = new THREE.Mesh(new THREE.SphereGeometry(maxR * 0.2, 10, 8), mat(c.body));
  guard.scale.set(1.3, 0.6, 1.1);
  guard.position.set(0, maxR * 0.55, 0.30);
  root.add(guard);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(maxR * 0.12, maxR * 0.05, maxR * 0.3),
    mat(0x10161a, { rough: 1 }));
  hole.position.set(0, maxR * 0.72, 0.265);
  root.add(hole);

  // Ventral pleats — the deep throat grooves. Signature of a blue whale.
  if (tier.hi) {
    const pleatMat = mat(new THREE.Color(c.belly || 0xffffff).multiplyScalar(0.72).getHex(), { rough: 0.95 });
    const bands = [[0.34, 0.10], [0.10, -0.14]];
    for (const [zA, zB] of bands) {
      const zc = (zA + zB) / 2, span = zA - zB;
      const r = prof((0.5 - zc)) * maxR;
      for (let i = 0; i < 13; i++) {
        const a = (-0.62 + (i / 12) * 1.24);      // arc across the belly
        const pl = new THREE.Mesh(new THREE.BoxGeometry(maxR * 0.045, maxR * 0.05, span), pleatMat);
        pl.position.set(Math.sin(a) * r * 0.82 * plan.compress, -Math.cos(a) * r * 0.9, zc);
        pl.rotation.z = -a;
        root.add(pl);
      }
    }
  }

  // Small dorsal fin, set far back (~72% down the body) — rorqual trait.
  const dors = new THREE.Mesh(blade([[0, 0.045], [maxR * 0.85, -0.01], [maxR * 0.2, -0.055]]), finMat);
  dors.position.set(0, prof(0.72) * maxR * 0.9, -0.22);
  root.add(dors);

  // Long, slender pectoral flippers
  for (const s of [-1, 1]) {
    const fl = new THREE.Mesh(bladeFlat([
      [0, 0.05], [maxR * 0.6, -0.02], [maxR * 1.15, -0.14], [maxR * 0.85, -0.2], [0, -0.06],
    ]), finMat);
    fl.position.set(s * maxR * 0.72 * plan.compress, -maxR * 0.22, 0.20);
    fl.rotation.y = s > 0 ? 0 : Math.PI;
    fl.rotation.x = 0.22;
    root.add(fl);
  }

  // Tail stock + broad notched fluke
  const rear = new THREE.Group();
  rear.position.z = -0.34;
  root.add(rear);
  for (const s of [-1, 1]) {
    const fk = new THREE.Mesh(notchedFluke(maxR * 1.5, 0.19), finMat);
    fk.position.z = -0.15;
    fk.scale.x = s;
    rear.add(fk);
  }

  eyePair(root, maxR * 0.11, 0.235, maxR * 0.86 * plan.compress, -maxR * 0.12);
  mouthLine(root, maxR * 1.5 * plan.compress, 0.30, -maxR * 0.30, maxR * 0.07);

  root._anim = { kind: 'fluke', freq: 0.75, amp: 0.15, t: Math.random() * 6, rear };
  return root;
}

function buildDolphin(sp, root, isPorpoise = false) {
  const c = sp.colors, tier = tierFor(sp.length);
  const plan = isPorpoise ? PLAN.porpoise : PLAN.dolphin;
  const { mesh, prof, maxR } = makeBody(plan, c, tier);
  root.add(mesh);
  const finMat = mat(c.fin || c.body);

  if (!isPorpoise) {
    // Melon (rounded forehead) + beak — the bottlenose signature.
    const melon = new THREE.Mesh(new THREE.SphereGeometry(maxR * 0.78, 14, 12), mat(c.body));
    melon.scale.set(0.95, 0.92, 1.15);
    melon.position.z = 0.335;
    root.add(melon);
    const beak = new THREE.Mesh(new THREE.CylinderGeometry(maxR * 0.16, maxR * 0.34, 0.17, 12), mat(c.body));
    beak.rotation.x = Math.PI / 2;
    beak.position.z = 0.52;
    beak.scale.x = 0.9;
    root.add(beak);
    mouthLine(root, maxR * 0.8, 0.52, -maxR * 0.1, maxR * 0.06);
    eyePair(root, maxR * 0.1, 0.33, maxR * 0.72 * plan.compress, maxR * 0.04);
  } else {
    // Vaquita: blunt head, dark eye patch and lip ring.
    const head = new THREE.Mesh(new THREE.SphereGeometry(maxR * 0.72, 14, 12), mat(c.body));
    head.scale.set(1, 0.95, 1.2);
    head.position.z = 0.36;
    root.add(head);
    for (const s of [-1, 1]) {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(maxR * 0.26, 10, 8), mat(0x24292e));
      patch.scale.set(0.4, 0.85, 1);
      patch.position.set(s * maxR * 0.62 * plan.compress, maxR * 0.06, 0.40);
      root.add(patch);
    }
    mouthLine(root, maxR * 1.0, 0.42, -maxR * 0.32, maxR * 0.08, 0x2b3238);
    eyePair(root, maxR * 0.085, 0.40, maxR * 0.66 * plan.compress, maxR * 0.07);
  }

  // Dorsal fin: falcate (curved back) on dolphin, triangular on porpoise.
  const dGeo = isPorpoise
    ? blade([[0, 0.09], [maxR * 1.5, -0.02], [maxR * 0.3, -0.09]])
    : blade([[0, 0.10], [maxR * 1.15, 0.0], [maxR * 1.55, -0.09], [maxR * 0.35, -0.10]]);
  const dors = new THREE.Mesh(dGeo, finMat);
  dors.position.set(0, prof(0.45) * maxR * 0.92, 0.02);
  root.add(dors);

  // Pectoral flippers
  for (const s of [-1, 1]) {
    const fl = new THREE.Mesh(bladeFlat([
      [0, 0.05], [maxR * 0.62, -0.02], [maxR * 1.2, -0.12], [maxR * 0.8, -0.15], [0, -0.05],
    ]), finMat);
    fl.position.set(s * maxR * 0.76 * plan.compress, -maxR * 0.3, 0.17);
    fl.rotation.y = s > 0 ? 0 : Math.PI;
    fl.rotation.x = 0.25;
    root.add(fl);
  }

  const rear = new THREE.Group();
  rear.position.z = -0.33;
  root.add(rear);
  for (const s of [-1, 1]) {
    const fk = new THREE.Mesh(notchedFluke(maxR * 1.55, 0.16), finMat);
    fk.position.z = -0.13; fk.scale.x = s;
    rear.add(fk);
  }

  root._anim = { kind: 'fluke', freq: isPorpoise ? 1.5 : 1.25, amp: 0.2, t: Math.random() * 6, rear };
  return root;
}

function buildShark(sp, root) {
  const c = sp.colors, tier = tierFor(sp.length), plan = PLAN.shark;
  const { mesh, prof, maxR } = makeBody(plan, c, tier);
  root.add(mesh);
  const finMat = mat(c.fin || c.body);

  // Conical snout
  const snout = new THREE.Mesh(new THREE.ConeGeometry(maxR * 0.4, 0.16, 14), mat(c.body));
  snout.rotation.x = Math.PI / 2;
  snout.position.z = 0.46;
  snout.scale.x = plan.compress;
  root.add(snout);

  // Gaping mouth, underslung with a pale interior
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(maxR * 0.5, 12, 10,
    0, Math.PI * 2, 0, Math.PI * 0.55), mat(0x2a1f22, { rough: 1 }));
  mouth.rotation.x = Math.PI;
  mouth.scale.set(plan.compress * 1.05, 0.4, 0.9);
  mouth.position.set(0, -maxR * 0.34, 0.375);
  root.add(mouth);
  if (tier.hi) {                                   // teeth
    const tMat = mat(0xf2f0e8, { rough: 0.4 });
    for (let i = 0; i < 9; i++) {
      const a = -0.75 + (i / 8) * 1.5;
      for (const [yy, sc] of [[-maxR * 0.28, 1], [-maxR * 0.46, -1]]) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(maxR * 0.045, maxR * 0.14, 4), tMat);
        tooth.position.set(Math.sin(a) * maxR * 0.42 * plan.compress, yy, 0.40 + Math.cos(a) * 0.02);
        tooth.rotation.x = sc > 0 ? Math.PI : 0;
        root.add(tooth);
      }
    }
  }

  // Five gill slits
  if (tier.hi) {
    const gMat = mat(new THREE.Color(c.body).multiplyScalar(0.55).getHex(), { rough: 1 });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const z = 0.20 - i * 0.032;
        const r = prof(0.5 - z) * maxR;
        const g = new THREE.Mesh(new THREE.BoxGeometry(maxR * 0.03, r * 0.62, maxR * 0.035), gMat);
        g.position.set(s * r * 0.9 * plan.compress, -r * 0.05, z);
        g.rotation.z = s * 0.18;
        root.add(g);
      }
    }
  }

  // Tall triangular first dorsal
  const d1 = new THREE.Mesh(blade([[0, 0.12], [maxR * 2.3, -0.02], [maxR * 0.5, -0.13]]), finMat);
  d1.position.set(0, prof(0.42) * maxR * 0.94, 0.03);
  root.add(d1);
  // Small second dorsal + anal fin
  const d2 = new THREE.Mesh(blade([[0, 0.035], [maxR * 0.6, 0.0], [maxR * 0.15, -0.04]]), finMat);
  d2.position.set(0, prof(0.82) * maxR * 0.9, -0.32);
  root.add(d2);
  const an = new THREE.Mesh(blade([[0, 0.03], [maxR * 0.55, 0.0], [maxR * 0.15, -0.04]]), finMat);
  an.position.set(0, -prof(0.82) * maxR * 0.9, -0.34);
  an.rotation.z = Math.PI;
  root.add(an);

  // Big scythe pectorals
  for (const s of [-1, 1]) {
    const pf = new THREE.Mesh(bladeFlat([
      [0, 0.07], [maxR * 0.7, 0.0], [maxR * 1.3, -0.18], [maxR * 0.8, -0.17], [0, -0.06],
    ]), finMat);
    pf.position.set(s * maxR * 0.8 * plan.compress, -maxR * 0.42, 0.16);
    pf.rotation.y = s > 0 ? 0 : Math.PI;
    pf.rotation.x = 0.3;
    root.add(pf);
  }
  // Caudal keel
  const keel = new THREE.Mesh(new THREE.BoxGeometry(maxR * 1.5 * plan.compress, maxR * 0.06, 0.12), finMat);
  keel.position.z = -0.42;
  root.add(keel);

  const rear = new THREE.Group();
  rear.position.z = -0.4;
  root.add(rear);
  const tail = new THREE.Mesh(lunateTail(maxR * 1.9, 0.22), finMat);
  tail.position.z = -0.08;
  rear.add(tail);

  eyePair(root, maxR * 0.1, 0.365, maxR * 0.68 * plan.compress, maxR * 0.16, 0x08090b);
  root._anim = { kind: 'tail', freq: 1.3, amp: 0.2, t: Math.random() * 6, rear };
  return root;
}

function buildFish(sp, root, planKey = 'fish') {
  const c = sp.colors, tier = tierFor(sp.length), plan = PLAN[planKey];
  const { mesh, prof, maxR } = makeBody(plan, c, tier);
  root.add(mesh);
  const finMat = mat(c.fin || c.body, { side: THREE.DoubleSide });
  const isTuna = planKey === 'tuna';

  // Head + operculum (gill cover) crease
  if (tier.hi || sp.length > 0.3) {
    const op = new THREE.Mesh(new THREE.TorusGeometry(prof(0.22) * maxR * 0.95, maxR * 0.022, 6, 18),
      mat(new THREE.Color(c.body).multiplyScalar(0.75).getHex()));
    op.rotation.y = Math.PI / 2;
    op.scale.y = 1; op.scale.z = plan.compress;
    op.position.z = 0.26;
    root.add(op);
  }

  // Dorsal fin(s)
  if (isTuna) {
    const d1 = new THREE.Mesh(blade([[0, 0.1], [maxR * 1.5, 0.02], [maxR * 0.3, -0.08]]), finMat);
    d1.position.set(0, prof(0.36) * maxR * 0.95, 0.1);
    root.add(d1);
    // finlets — the little yellow flags along the peduncle
    for (let i = 0; i < 7; i++) {
      const z = -0.16 - i * 0.037;
      const r = prof(0.5 - z) * maxR;
      for (const dirY of [1, -1]) {
        const fl = new THREE.Mesh(blade([[0, 0.014], [maxR * 0.3, 0.0], [maxR * 0.08, -0.018]]), finMat);
        fl.position.set(0, dirY * r * 0.92, z);
        if (dirY < 0) fl.rotation.z = Math.PI;
        root.add(fl);
      }
    }
  } else {
    const d = new THREE.Mesh(blade([
      [0, 0.16], [maxR * 0.75, 0.11], [maxR * 0.95, -0.02], [maxR * 0.7, -0.13], [0, -0.16],
    ]), finMat);
    d.position.set(0, prof(0.38) * maxR * 0.93, 0.02);
    root.add(d);
    const an = new THREE.Mesh(blade([
      [0, 0.10], [maxR * 0.6, 0.05], [maxR * 0.5, -0.08], [0, -0.11],
    ]), finMat);
    an.position.set(0, -prof(0.62) * maxR * 0.92, -0.14);
    an.rotation.z = Math.PI;
    root.add(an);
  }

  // Pectoral + pelvic fins
  for (const s of [-1, 1]) {
    const pf = new THREE.Mesh(bladeFlat([
      [0, 0.05], [maxR * 0.9, 0.0], [maxR * 1.4, -0.1], [maxR * 0.7, -0.12], [0, -0.05],
    ]), finMat);
    pf.position.set(s * prof(0.28) * maxR * 0.88 * plan.compress, -maxR * 0.1, 0.16);
    pf.rotation.y = s > 0 ? 0 : Math.PI;
    pf.rotation.z = s * 0.55;
    root.add(pf);
    const pv = new THREE.Mesh(bladeFlat([[0, 0.03], [maxR * 0.5, -0.02], [maxR * 0.25, -0.09]]), finMat);
    pv.position.set(s * maxR * 0.28 * plan.compress, -prof(0.45) * maxR * 0.85, 0.02);
    pv.rotation.y = s > 0 ? 0 : Math.PI;
    root.add(pv);
  }

  // Bands (clownfish white bars with dark edging; tuna lateral stripe)
  if (c.band) {
    if (planKey === 'fish' && sp.id === 'clownfish') {
      const edge = mat(0x14141a);
      for (const [bz, w] of [[0.29, 0.052], [0.02, 0.062], [-0.28, 0.04]]) {
        const t = 0.5 - bz;
        const r = prof(t) * maxR;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.015, r * 1.015, w, 20, 1, true),
          mat(c.band));
        band.rotation.x = Math.PI / 2;
        band.position.z = bz; band.scale.x = plan.compress;
        root.add(band);
        for (const off of [-1, 1]) {
          const ed = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, w * 0.16, 20, 1, true), edge);
          ed.rotation.x = Math.PI / 2;
          ed.position.z = bz + off * w * 0.55; ed.scale.x = plan.compress;
          root.add(ed);
        }
      }
    } else {
      const r = prof(0.5) * maxR;
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.5, 18, 1, true),
        mat(c.band));
      stripe.rotation.x = Math.PI / 2;
      stripe.scale.set(plan.compress, 0.16, 1);
      stripe.position.set(0, -r * 0.35, -0.02);
      root.add(stripe);
    }
  }

  const rear = new THREE.Group();
  rear.position.z = isTuna ? -0.40 : -0.34;
  root.add(rear);
  const tail = isTuna
    ? new THREE.Mesh(lunateTail(maxR * 1.8, 0.15), finMat)
    : new THREE.Mesh(blade([
        [0, 0.02], [maxR * 1.6, -0.16], [maxR * 0.9, -0.2], [0, -0.1],
        [-maxR * 0.9, -0.2], [-maxR * 1.6, -0.16],
      ]), finMat);
  tail.position.z = isTuna ? -0.06 : -0.05;
  rear.add(tail);

  eyePair(root, Math.max(maxR * 0.16, 0.012), 0.33, prof(0.17) * maxR * 0.78 * plan.compress, maxR * 0.18);
  root._anim = { kind: 'tail', freq: isTuna ? 2.4 : 3.0, amp: isTuna ? 0.26 : 0.36, t: Math.random() * 6, rear };
  return root;
}

function buildAngler(sp, root) {
  const c = sp.colors, tier = tierFor(sp.length), plan = PLAN.angler;
  const { mesh, prof, maxR } = makeBody(plan, c, tier);
  root.add(mesh);
  const finMat = mat(c.fin || c.body, { side: THREE.DoubleSide });

  // Enormous gaping jaw
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(maxR * 0.82, 14, 10,
    0, Math.PI * 2, 0, Math.PI * 0.6), mat(0x120f16, { rough: 1 }));
  jaw.rotation.x = Math.PI * 0.92;
  jaw.scale.set(1, 0.62, 0.8);
  jaw.position.set(0, -maxR * 0.16, 0.30);
  root.add(jaw);
  // needle teeth, upper and lower
  const tMat = mat(0xe8e2d4, { rough: 0.45 });
  for (let i = 0; i < 11; i++) {
    const a = -0.95 + (i / 10) * 1.9;
    for (const dir of [1, -1]) {
      const th = new THREE.Mesh(new THREE.ConeGeometry(maxR * 0.032, maxR * 0.2, 4), tMat);
      th.position.set(Math.sin(a) * maxR * 0.6, -maxR * 0.05 + dir * maxR * 0.2, 0.33 + Math.cos(a) * 0.03);
      th.rotation.x = dir > 0 ? Math.PI : 0;
      th.rotation.z = -a * 0.3;
      root.add(th);
    }
  }

  // Illicium (rod) + glowing esca (lure) with halo
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(maxR * 0.03, maxR * 0.05, 0.42, 6), finMat);
  rod.position.set(0, maxR * 0.95, 0.24);
  rod.rotation.x = -0.9;
  root.add(rod);
  const esca = new THREE.Mesh(new THREE.SphereGeometry(maxR * 0.17, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xbdf7ff }));
  esca.position.set(0, maxR * 1.45, 0.44);
  root.add(esca);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(maxR * 0.42, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x57e3c9, transparent: true, opacity: 0.2, depthWrite: false }));
  halo.position.copy(esca.position);
  root.add(halo);
  root._lure = { esca, halo, base: maxR * 0.42 };

  for (const s of [-1, 1]) {
    const pf = new THREE.Mesh(bladeFlat([[0, 0.04], [maxR * 0.8, -0.03], [maxR * 0.4, -0.12]]), finMat);
    pf.position.set(s * maxR * 0.75 * plan.compress, -maxR * 0.3, 0.02);
    pf.rotation.y = s > 0 ? 0 : Math.PI;
    root.add(pf);
  }

  const rear = new THREE.Group();
  rear.position.z = -0.3;
  root.add(rear);
  const tail = new THREE.Mesh(blade([
    [0, 0.02], [maxR * 0.9, -0.14], [0, -0.18], [-maxR * 0.9, -0.14],
  ]), finMat);
  rear.add(tail);

  eyePair(root, maxR * 0.1, 0.30, maxR * 0.6 * plan.compress, maxR * 0.42, 0xf0e9d8);
  root._anim = { kind: 'tail', freq: 1.5, amp: 0.24, t: Math.random() * 6, rear };
  return root;
}

function buildTurtle(sp, root) {
  const c = sp.colors;
  const shellMat = mat(c.shell || c.body, { rough: 0.6 });
  const skinMat = mat(c.body);
  const finMat = mat(c.fin || c.body);

  // Carapace: domed, slightly teardrop
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), shellMat);
  shell.scale.set(1, 0.46, 1.22);
  root.add(shell);
  // Scutes: raised plates in the real 5-centre / 4-lateral arrangement
  const scuteMat = mat(new THREE.Color(c.shell || c.body).multiplyScalar(1.22).getHex(), { rough: 0.55 });
  const layout = [[0, 0, 5, 0.11], [0.26, 0.34, 4, 0.085], [-0.26, 0.34, 4, 0.085]];
  for (const [xf, spread, count, size] of layout) {
    for (let i = 0; i < count; i++) {
      const zz = 0.42 - (i / (count - 1)) * 0.86;
      const xx = xf === 0 ? 0 : xf * (1 - Math.abs(zz) * 0.35);
      const hgt = Math.sqrt(Math.max(0, 1 - (zz / 1.22) ** 2 - (xx / 1) ** 2)) * 0.46;
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(size, size * 1.06, 0.012, 6), scuteMat);
      sc.position.set(xx * 0.92, hgt * 0.97 + 0.004, zz * 0.92);
      sc.rotation.x = zz * 0.25;
      sc.rotation.z = -xx * 0.5;
      root.add(sc);
      if (spread) { /* mirrored by the xf sign in layout */ }
    }
  }
  // Marginal scutes around the rim
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.07), scuteMat);
    m.position.set(Math.sin(a) * 0.45, 0.02, Math.cos(a) * 0.55);
    m.rotation.y = a;
    root.add(m);
  }
  // Plastron
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    mat(c.belly || 0xcfc19a, { rough: 0.8 }));
  under.scale.set(1, 0.13, 1.2);
  root.add(under);

  // Head + neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.18, 10), skinMat);
  neck.rotation.x = Math.PI / 2 - 0.25;
  neck.position.set(0, 0.05, 0.58);
  root.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), skinMat);
  head.scale.set(0.9, 0.85, 1.25);
  head.position.set(0, 0.085, 0.71);
  root.add(head);
  mouthLine(root, 0.11, 0.80, 0.045, 0.016);
  eyePair(root, 0.026, 0.755, 0.062, 0.115);

  // Four flippers: long front paddles, short rear rudders
  root._flippers = [];
  for (const s of [-1, 1]) {
    const front = new THREE.Mesh(bladeFlat([
      [0, 0.1], [s * 0.24, 0.02], [s * 0.55, -0.2], [s * 0.42, -0.28], [0, -0.08],
    ]), finMat);
    front.position.set(s * 0.34, -0.01, 0.3);
    front.rotation.x = -0.12;
    root.add(front);
    root._flippers.push(front);
  }
  for (const s of [-1, 1]) {
    const back = new THREE.Mesh(bladeFlat([
      [0, 0.06], [s * 0.22, 0.0], [s * 0.3, -0.16], [0, -0.1],
    ]), finMat);
    back.position.set(s * 0.3, -0.03, -0.42);
    root.add(back);
    root._flippers.push(back);
  }

  root._anim = { kind: 'flipper', freq: 1.6, amp: 0.42, t: Math.random() * 6 };
  return root;
}

function buildRay(sp, root) {
  const c = sp.colors;
  const topMat = mat(c.body, { rough: 0.7, side: THREE.DoubleSide });
  const botMat = mat(c.belly || 0xffffff, { rough: 0.75, side: THREE.DoubleSide });

  // Diamond disc built as a swept wing pair (top and bottom shells).
  const wingPts = (s) => [
    [0, 0.34], [s * 0.16, 0.3], [s * 0.42, 0.14], [s * 0.62, -0.06],
    [s * 0.7, -0.24], [s * 0.5, -0.3], [s * 0.24, -0.26], [0, -0.22],
  ];
  root._wings = [];
  for (const s of [-1, 1]) {
    const top = new THREE.Mesh(bladeFlat(wingPts(s)), topMat);
    top.position.y = 0.012;
    root.add(top);
    const bot = new THREE.Mesh(bladeFlat(wingPts(s)), botMat);
    bot.position.y = -0.012;
    root.add(bot);
    root._wings.push({ mesh: top, side: s }, { mesh: bot, side: s });
  }
  // Central body bulge
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), topMat);
  core.scale.set(1.1, 0.42, 1.5);
  root.add(core);
  const coreB = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), botMat);
  coreB.scale.set(1.05, 0.22, 1.4);
  coreB.position.y = -0.03;
  root.add(coreB);

  // Cephalic (head) fins — the manta's paddles
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.05, 0.19, 8), topMat);
    horn.rotation.x = Math.PI / 2 + 0.25;
    horn.position.set(s * 0.1, -0.01, 0.4);
    root.add(horn);
  }
  // Gill slits on the underside
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.05),
        mat(0x1a1f24, { rough: 1 }));
      g.position.set(s * (0.07 + i * 0.032), -0.045, 0.12 - i * 0.018);
      root.add(g);
    }
  }
  mouthLine(root, 0.2, 0.36, -0.02, 0.02, 0x101418);
  eyePair(root, 0.028, 0.3, 0.19, 0.0);

  // Whip tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.016, 0.62, 6), topMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = -0.52;
  root.add(tail);

  root._anim = { kind: 'wings', freq: 0.75, amp: 0.3, t: Math.random() * 6 };
  return root;
}

function buildSquid(sp, root) {
  const c = sp.colors;
  const bodyMat = mat(c.body, { rough: 0.55 });
  const finMat = mat(c.fin || c.body, { rough: 0.6, side: THREE.DoubleSide });
  const armMat = mat(c.body, { rough: 0.6 });
  const suckMat = mat(c.belly || 0xd9a3ab, { rough: 0.5 });

  // Mantle: long tapering cone, pointed tail
  const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.115, 0.72, 18), bodyMat);
  mantle.rotation.x = -Math.PI / 2;
  mantle.position.z = -0.24;
  root.add(mantle);
  const mantleCap = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), bodyMat);
  mantleCap.scale.set(1, 1, 0.8);
  mantleCap.position.z = 0.11;
  root.add(mantleCap);

  // Terminal fins — big rhomboid fins at the pointed end
  for (const s of [-1, 1]) {
    const fin = new THREE.Mesh(bladeFlat([
      [0, 0.14], [s * 0.2, 0.0], [s * 0.16, -0.22], [0, -0.26],
    ]), finMat);
    fin.position.set(0, 0, -0.42);
    root.add(fin);
  }

  // Head with the famous giant eyes
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), bodyMat);
  head.scale.set(1.1, 0.95, 1);
  head.position.z = 0.2;
  root.add(head);
  const eyeMat = mat(0xf3e9c9, { rough: 0.15, metal: 0.2 });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 12), eyeMat);
    e.position.set(s * 0.095, 0.01, 0.21);
    root.add(e);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), mat(0x0a0a0c, { rough: 0.1 }));
    pup.position.set(s * 0.13, 0.01, 0.235);
    root.add(pup);
  }
  // Funnel (siphon)
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.1, 10), bodyMat);
  funnel.rotation.x = Math.PI / 2 - 0.5;
  funnel.position.set(0, -0.08, 0.16);
  root.add(funnel);

  // Eight arms + two long hunting tentacles with clubs
  root._arms = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const grp = new THREE.Group();
    grp.position.set(Math.cos(a) * 0.062, Math.sin(a) * 0.062, 0.28);
    const segs = 4;
    let parent = grp;
    for (let sI = 0; sI < segs; sI++) {
      const r0 = 0.026 * (1 - sI / segs * 0.75);
      const r1 = 0.026 * (1 - (sI + 1) / segs * 0.75);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 0.13, 7), armMat);
      seg.rotation.x = Math.PI / 2;
      seg.position.z = 0.065;
      const pivot = new THREE.Group();
      pivot.position.z = sI === 0 ? 0 : 0.13;
      pivot.add(seg);
      parent.add(pivot);
      parent = pivot;
      root._arms.push({ mesh: pivot, phase: i * 0.7 + sI * 0.5, amp: 0.1 + sI * 0.05 });
    }
    root.add(grp);
  }
  for (const s of [-1, 1]) {
    const grp = new THREE.Group();
    grp.position.set(s * 0.04, -0.03, 0.28);
    let parent = grp;
    for (let sI = 0; sI < 6; sI++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.17, 6), armMat);
      seg.rotation.x = Math.PI / 2;
      seg.position.z = 0.085;
      const pivot = new THREE.Group();
      pivot.position.z = sI === 0 ? 0 : 0.17;
      pivot.add(seg);
      parent.add(pivot); parent = pivot;
      root._arms.push({ mesh: pivot, phase: (s > 0 ? 0.3 : 2.1) + sI * 0.45, amp: 0.07 + sI * 0.045 });
    }
    const club = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), suckMat);
    club.scale.set(0.8, 0.8, 2.1);
    club.position.z = 0.2;
    parent.add(club);
    root.add(grp);
  }

  root._anim = { kind: 'jet', freq: 0.9, amp: 1, t: Math.random() * 6 };
  return root;
}

function buildSunfish(sp, root) {
  const c = sp.colors;
  const bodyMat = mat(c.body, { rough: 0.85 });
  const finMat = mat(c.fin || c.body, { rough: 0.8, side: THREE.DoubleSide });

  // Huge laterally-flattened disc
  const disc = new THREE.Mesh(new THREE.SphereGeometry(0.36, 22, 18), bodyMat);
  disc.scale.set(0.2, 1, 0.92);
  root.add(disc);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 12), mat(c.belly || 0xdfe6e9, { rough: 0.85 }));
  belly.scale.set(0.19, 0.55, 0.8);
  belly.position.y = -0.14;
  root.add(belly);
  // Rough hide texture: scattered bumps
  const bumpMat = mat(new THREE.Color(c.body).multiplyScalar(0.88).getHex(), { rough: 1 });
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.3;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.018 + Math.random() * 0.014, 6, 5), bumpMat);
    b.position.set((Math.random() > 0.5 ? 1 : -1) * 0.072, Math.sin(a) * rr, Math.cos(a) * rr * 0.9);
    root.add(b);
  }

  // Clavus — the blunt rudder that replaces a tail, with scalloped edge
  const clavus = new THREE.Mesh(blade([
    [0, -0.3], [0.34, -0.42], [0.3, -0.5], [-0.3, -0.5], [-0.34, -0.42],
  ]), finMat);
  root.add(clavus);
  for (let i = 0; i < 7; i++) {
    const y = -0.3 + (i / 6) * 0.6;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), finMat);
    s.scale.set(0.35, 1, 0.5);
    s.position.set(0, y, -0.5);
    root.add(s);
  }

  // Tall dorsal + anal fins (the sunfish "sculls" with these)
  root._fins = [];
  for (const dir of [1, -1]) {
    const f = new THREE.Mesh(blade([
      [0, 0.06], [dir * 0.2, 0.02], [dir * 0.22, -0.1], [0, -0.14],
    ]), finMat);
    f.position.set(0, dir * 0.3, 0.02);
    root.add(f);
    root._fins.push({ mesh: f, dir });
  }
  for (const s of [-1, 1]) {
    const pf = new THREE.Mesh(bladeFlat([[0, 0.05], [s * 0.1, 0.0], [s * 0.13, -0.1], [0, -0.08]]), finMat);
    pf.position.set(s * 0.06, 0.02, 0.16);
    root.add(pf);
  }
  mouthLine(root, 0.07, 0.35, -0.02, 0.03, 0x2b3238);
  eyePair(root, 0.036, 0.29, 0.075, 0.09);
  root._anim = { kind: 'sunfin', freq: 0.65, amp: 0.24, t: Math.random() * 6 };
  return root;
}

function buildSnake(sp, root) {
  const c = sp.colors;
  const segN = 26;
  root._segs = [];
  for (let i = 0; i < segN; i++) {
    const t = i / (segN - 1);
    const r = 0.05 * (1 - Math.pow(t, 2.2) * 0.55) * (t < 0.06 ? 0.8 : 1);
    const banded = Math.floor(t * 13) % 2 === 0;
    const m = mat(banded && c.band ? c.band : c.body, { rough: 0.55 });
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m);
    seg.scale.set(0.7, 0.95, 1.35);          // laterally flattened like a real sea krait
    seg.position.z = 0.5 - t * 1.0;
    root.add(seg);
    root._segs.push({ mesh: seg, offset: i * 0.38, baseZ: seg.position.z });
  }
  // Paddle tail
  const paddle = new THREE.Mesh(blade([
    [0, 0.02], [0.075, -0.03], [0.06, -0.12], [-0.06, -0.12], [-0.075, -0.03],
  ]), mat(c.fin || c.body, { side: THREE.DoubleSide }));
  paddle.rotation.z = Math.PI / 2;
  paddle.position.z = -0.55;
  root.add(paddle);
  root._paddle = paddle;
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), mat(c.body));
  head.scale.set(0.8, 0.75, 1.45);
  head.position.z = 0.55;
  root.add(head);
  mouthLine(root, 0.05, 0.62, -0.012, 0.01);
  eyePair(root, 0.014, 0.585, 0.032, 0.018, 0x141010);
  root._anim = { kind: 'undulate', freq: 1.8, amp: 0.085, t: Math.random() * 6 };
  return root;
}

function buildStar(sp, root) {
  const c = sp.colors;
  const m = mat(c.body, { rough: 0.9 });
  const bump = mat(new THREE.Color(c.body).multiplyScalar(1.3).getHex(), { rough: 0.85 });
  const disc = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8), m);
  disc.scale.set(1, 0.4, 1);
  root.add(disc);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.ConeGeometry(0.135, 0.52, 8), m);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = -a;
    arm.position.set(Math.cos(a) * 0.3, 0.005, Math.sin(a) * 0.3);
    arm.scale.set(1, 1, 0.42);
    root.add(arm);
    for (let k = 0; k < 4; k++) {            // tubercles along each arm
      const d = 0.12 + k * 0.11;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), bump);
      b.position.set(Math.cos(a) * d, 0.05 - k * 0.005, Math.sin(a) * d);
      root.add(b);
    }
  }
  root._anim = { kind: 'still', freq: 0.2, amp: 0.02, t: Math.random() * 6 };
  return root;
}

function buildCrab(sp, root) {
  const c = sp.colors;
  const bodyMat = mat(c.body, { rough: 0.55, metal: 0.1 });
  const legMat = mat(c.fin || c.body, { rough: 0.6 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), bodyMat);
  shell.scale.set(1.3, 0.5, 0.95);
  root.add(shell);
  // carapace mottling
  for (let i = 0; i < 7; i++) {
    const sp2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6),
      mat(new THREE.Color(c.belly || 0xf0b596).getHex(), { rough: 0.6 }));
    sp2.scale.set(1, 0.25, 1);
    sp2.position.set((Math.random() - 0.5) * 0.5, 0.13, (Math.random() - 0.5) * 0.35);
    root.add(sp2);
  }
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat(c.belly || 0xf0b596));
  under.scale.set(1.25, 0.22, 0.9); under.position.y = -0.07;
  root.add(under);
  for (const s of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.13, 6), bodyMat);
    stalk.position.set(s * 0.1, 0.16, 0.2);
    root.add(stalk);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), mat(0x0a0a0c, { rough: 0.2 }));
    eye.position.set(s * 0.1, 0.24, 0.2);
    root.add(eye);
  }
  root._legs = [];
  for (const s of [-1, 1]) {
    // Chela (claw): upper arm, forearm, pincer with a movable finger
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.2, 8), legMat);
    arm.rotation.z = s * 1.15;
    arm.position.set(s * 0.3, 0.0, 0.18);
    root.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), legMat);
    hand.scale.set(1.5, 0.75, 0.85);
    hand.position.set(s * 0.46, -0.02, 0.26);
    root.add(hand);
    const finger = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.15, 6), legMat);
    finger.rotation.x = Math.PI / 2; finger.rotation.z = s * 0.2;
    finger.position.set(s * 0.55, 0.02, 0.36);
    root.add(finger);
    root._legs.push({ mesh: hand, side: s, phase: 0 }, { mesh: finger, side: s, phase: 0.4 });
    // Four walking legs per side, each with two joints
    for (let i = 0; i < 4; i++) {
      const z = 0.1 - i * 0.13;
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.22, 6), legMat);
      upper.rotation.z = s * 1.0;
      upper.position.set(s * 0.28, -0.03, z);
      root.add(upper);
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.24, 6), legMat);
      lower.rotation.z = s * 0.35;
      lower.position.set(s * 0.42, -0.16, z);
      root.add(lower);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.1, 5), legMat);
      tip.rotation.x = Math.PI;
      tip.position.set(s * 0.47, -0.29, z);
      root.add(tip);
      root._legs.push({ mesh: upper, side: s, phase: i * 0.9 },
                      { mesh: lower, side: s, phase: i * 0.9 + 0.3 },
                      { mesh: tip, side: s, phase: i * 0.9 + 0.5 });
    }
  }
  root._anim = { kind: 'scuttle', freq: 3.0, amp: 0.1, t: Math.random() * 6 };
  return root;
}

/* --------------------------------------------------------------- public */

/**
 * @param {object} species
 * @param {number} [variant] 0..1 — picks a sub-form and shifts size/hue so a
 *        school or a patch of reef is a mixed population, not clones.
 */
function litSkin(root) {
  // caustics ripple across an animal's back near the surface, just as they do
  // on the seabed; skip unlit materials (glowing lures, eye highlights)
  root.traverse((o) => {
    if (o.isMesh && o.material && o.material.type !== 'MeshBasicMaterial') {
      applyCaustics(o.material);
    }
  });
  return root;
}

export function buildCreature(species, variant = Math.random(), detail = 'med') {
  // Continuous-surface builds. These apply their own scaling, so return early.
  if (species.shape === 'whale') return litSkin(buildBlueWhale(species, { detail }));
  const SWIM = {
    shark: 'shark', dolphin: 'dolphin', porpoise: 'porpoise',
    tuna: 'tuna', fish: 'reeffish',
  }[species.shape];
  if (SWIM) {
    const g = buildSwimmer(species, SWIM, { detail });
    // small individual variation in size for the schooling species
    if (species.schooling) g.scale.multiplyScalar(0.86 + variant * 0.28);
    return litSkin(g);
  }
  const ODD = { ray: 'ray', turtle: 'turtle', sunfish: 'sunfish',
                squid: 'squid', angler: 'angler', snake: 'snake',
                star: 'star', crab: 'crab' }[species.shape];
  if (ODD) return litSkin(buildOddity(species, ODD, { variant, detail }));

  const root = new THREE.Group();
  let built;
  switch (species.shape) {
    case 'whale':    built = buildWhale(species, root); break;
    case 'dolphin':  built = buildDolphin(species, root, false); break;
    case 'porpoise': built = buildDolphin(species, root, true); break;
    case 'shark':    built = buildShark(species, root); break;
    case 'turtle':   built = buildTurtle(species, root); break;
    case 'ray':      built = buildRay(species, root); break;
    case 'squid':    built = buildSquid(species, root); break;
    case 'sunfish':  built = buildSunfish(species, root); break;
    case 'snake':    built = buildSnake(species, root); break;
    case 'angler':   built = buildAngler(species, root); break;
    case 'star':     built = buildStar(species, root); break;
    case 'crab':     built = buildCrab(species, root); break;
    case 'tuna':     built = buildFish(species, root, 'tuna'); break;
    default:         built = buildFish(species, root, 'fish'); break;
  }
  // Normalise: the authored unit body is ~1 long along Z, except discs/plates.
  // `length` means a different measurement per body plan (total length for
  // swimmers, wingspan for the ray, arm span for the star, carapace width for
  // the crab), so each shape divides by the unit extent of that measurement.
  const norm = {
    ray: species.length / 1.4,      // wingspan
    star: species.length / 1.12,    // arm span
    crab: species.length / 0.78,    // carapace width
    sunfish: species.length / 0.83, // snout to clavus
    squid: species.length / 1.75,   // mantle + arms
    turtle: species.length / 1.1,   // carapace length
  }[species.shape] ?? species.length;
  root.scale.setScalar(norm);
  root.userData.species = species.id;
  root.userData.sizeRef = species.length;
  return litSkin(built);
}

export function animateCreature(root, dt, speed01 = 1) {
  const a = root._anim;
  if (!a) return;
  if (a.kind === 'whaleSpine') { animateWhale(root, dt, speed01); return; }
  if (a.kind === 'spineVert') { animateSwimmer(root, dt, speed01); return; }
  if (a.kind === 'spineSide') {
    // shared name: swimmers deform via their own path, oddities via theirs
    (root._bodyLength !== undefined ? animateOddity : animateSwimmer)(root, dt, speed01);
    return;
  }
  if (['wingwave', 'flipperFlap', 'sunScull', 'jetArms', 'starCurl', 'scuttle']
      .includes(a.kind)) {
    animateOddity(root, dt, speed01); return;
  }
  a.t += dt * (0.55 + speed01 * a.freq);
  const s = Math.sin(a.t * Math.PI * 2);

  switch (a.kind) {
    case 'flipper':
      if (root._flippers) {
        const f = s * a.amp;
        root._flippers[0].rotation.x = -0.12 + f;
        root._flippers[1].rotation.x = -0.12 + f;
        if (root._flippers[2]) root._flippers[2].rotation.x = -0.1 - f * 0.45;
        if (root._flippers[3]) root._flippers[3].rotation.x = -0.1 - f * 0.45;
      }
      break;
    case 'wings':
      if (root._wings) for (const w of root._wings) w.mesh.rotation.z = w.side * s * a.amp;
      break;
    case 'jet':
      if (root._arms) for (const arm of root._arms) {
        arm.mesh.rotation.x = Math.sin(a.t * Math.PI * 2 + arm.phase) * arm.amp;
        arm.mesh.rotation.y = Math.cos(a.t * Math.PI * 1.3 + arm.phase) * arm.amp * 0.6;
      }
      break;
    case 'sunfin':
      if (root._fins) for (const f of root._fins) f.mesh.rotation.y = s * a.amp * f.dir;
      break;
    case 'undulate':
      if (root._segs) for (const sg of root._segs) {
        sg.mesh.position.x = Math.sin(a.t * Math.PI * 2 - sg.offset) * a.amp;
      }
      if (root._paddle) root._paddle.position.x = Math.sin(a.t * Math.PI * 2 - 9.9) * a.amp * 1.3;
      break;
    case 'still':
      break;
    case 'scuttle':
      if (root._legs) for (const l of root._legs) {
        l.mesh.rotation.x = Math.sin(a.t * Math.PI * 2 + l.phase) * a.amp;
      }
      break;
    case 'fluke':
      if (a.rear) a.rear.rotation.x = s * a.amp;
      break;
    default: // 'tail'
      if (a.rear) a.rear.rotation.y = s * a.amp;
      break;
  }

  // Anglerfish lure pulses in the dark.
  if (root._lure) {
    const p = 0.75 + Math.sin(a.t * 2.4) * 0.25;
    root._lure.halo.scale.setScalar(p);
    root._lure.halo.material.opacity = 0.14 + p * 0.12;
  }

  // Subtle whole-body roll for life (not applied to benthic/static shapes).
  if (a.kind !== 'still' && a.kind !== 'scuttle') {
    root.rotation.z = Math.sin(a.t * Math.PI) * 0.025;
  }
}
