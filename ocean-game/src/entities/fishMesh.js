// fishMesh.js — Procedural low-poly creatures. No external model files.
// Each builder returns a THREE.Group scaled to REAL length (meters) with an
// attached `._anim` state used by creature.js / player.js to animate swimming.
// Convention: body long axis = +Z (head at +0.5, tail at -0.5), unit length ~1.

import * as THREE from 'three';

function mat(color, { flat = true, rough = 0.8, metal = 0.05 } = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: flat, roughness: rough, metalness: metal });
}

// Spindle body along +Z, centered at origin. profile(t 0..1)->radius fraction.
function spindle(length, maxR, profile, segments = 12, radial = 9) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    pts.push(new THREE.Vector2(Math.max(0.0006, profile(t) * maxR), t * length));
  }
  const geo = new THREE.LatheGeometry(pts, radial);
  geo.rotateX(-Math.PI / 2);          // y-axis body -> z-axis (spans z: 0..-length)
  geo.translate(0, 0, length / 2);    // recenter so it spans [-L/2, +L/2]
  geo.computeVertexNormals();
  return geo;
}

// Vertical fin in the Y-Z plane (thin in X). Points: base, up-back, down-back.
function caudalFin(hy, hz) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 0, hy, -hz, 0, -hy, -hz,
  ], 3));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
}

// Upright triangular fin (dorsal): base along Z on the back, apex up.
function dorsalFin(bz, h) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, bz, 0, 0, -bz, 0, h, -bz * 0.3,
  ], 3));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
}

// Flat side fin (pectoral / flipper) in local XZ, apex at origin.
function sideFin(w, h) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, w, 0, -h, w * 0.2, 0, -h * 1.2,
  ], 3));
  g.setIndex([0, 1, 2]);
  g.computeVertexNormals();
  return g;
}

function addEyes(group, radius, z, sideX, upY) {
  const em = mat(0x0a0a0a, { flat: false, rough: 0.3 });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 8), em);
    e.position.set(sideX * s, upY, z);
    group.add(e);
  }
}

export function buildCreature(species) {
  const root = new THREE.Group();
  const c = species.colors;
  const shape = species.shape;
  const bodyMat = mat(c.body);
  const bellyMat = mat(c.belly || 0xffffff);
  const finMat = mat(c.fin || c.body);

  if (shape === 'turtle') {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(c.shell || c.body));
    shell.scale.set(1, 0.42, 1.25); root.add(shell);
    const under = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), bellyMat);
    under.rotation.x = -Math.PI / 2; under.scale.set(1, 1, 1.25); root.add(under);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), bodyMat);
    head.position.set(0, 0.03, 0.62); root.add(head);
    addEyes(head, 0.03, 0.1, 0.07, 0.04);
    root._flippers = [];
    const spots = [[0.36, 0.30, 0.7], [-0.36, 0.30, -0.7], [0.34, -0.34, 0.5], [-0.34, -0.34, -0.5]];
    for (const [x, z, rot] of spots) {
      const f = new THREE.Mesh(sideFin(0.5, 0.34), finMat);
      f.position.set(x, 0, z); f.rotation.y = rot; f.rotation.x = -0.15;
      root.add(f); root._flippers.push(f);
    }
    root._anim = { kind: 'flipper', freq: 2.0, amp: 0.4, t: Math.random() * 6 };
    root.scale.setScalar(species.length);
    root.userData.species = species.id;
    return root;
  }

  if (shape === 'ray') {
    // Flat diamond body with big flapping wings and a whip tail.
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), bodyMat);
    body.scale.set(0.55, 0.16, 0.8); root.add(body);
    const under = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8), bellyMat);
    under.scale.set(0.54, 0.1, 0.79); under.position.y = -0.02; root.add(under);
    // cephalic fins (the "horns" by the mouth)
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 5), finMat);
      horn.rotation.x = Math.PI / 2;
      horn.position.set(s * 0.1, 0, 0.3);
      root.add(horn);
    }
    // wings
    root._wings = [];
    for (const s of [-1, 1]) {
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, 0.24, 0, 0, -0.3, s * 0.55, 0, -0.06,
      ], 3));
      wg.setIndex([0, 1, 2]);
      wg.computeVertexNormals();
      const wing = new THREE.Mesh(wg, mat(c.body, { rough: 0.75 }));
      wing.material.side = THREE.DoubleSide;
      wing.position.x = s * 0.08;
      root.add(wing); root._wings.push({ mesh: wing, side: s });
    }
    // whip tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.5, 4), finMat);
    tail.rotation.x = Math.PI / 2; tail.position.z = -0.5;
    root.add(tail);
    addEyes(root, 0.02, 0.26, 0.1, 0.03);
    root._anim = { kind: 'wings', freq: 0.8, amp: 0.32, t: Math.random() * 6 };
    root.scale.setScalar(species.length);
    root.userData.species = species.id;
    return root;
  }

  // fish / shark / whale / angler : single spindle body + swinging tail pivot
  let profile, maxR, isWhale = shape === 'whale', isShark = shape === 'shark';
  const isAngler = shape === 'angler';
  if (isWhale) { profile = (t) => Math.pow(Math.sin(Math.PI * Math.min(t, 0.96)), 0.5) * (1 - 0.22 * t); maxR = 0.14; }
  else if (isShark) { profile = (t) => Math.pow(Math.sin(Math.PI * Math.min(t, 0.93)), 0.55) * (1 - 0.32 * t); maxR = 0.11; }
  else if (isAngler) { profile = (t) => Math.pow(Math.sin(Math.PI * Math.min(t, 0.9)), 0.6) * (1 - 0.3 * t); maxR = 0.22; }
  else { profile = (t) => Math.pow(Math.sin(Math.PI * t), 0.7); maxR = 0.16; }

  const body = new THREE.Mesh(spindle(1, maxR, profile, 14, isWhale ? 11 : 9), bodyMat);
  root.add(body);

  // lighter belly
  const belly = new THREE.Mesh(new THREE.SphereGeometry(maxR, 10, 6, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), bellyMat);
  belly.scale.set(1, 0.55, 3.4); belly.position.y = -maxR * 0.1; root.add(belly);

  // tail pivot near the tail base
  const rear = new THREE.Group();
  rear.position.z = -0.38;
  root.add(rear);
  if (isWhale) {
    for (const s of [-1, 1]) {
      const fluke = new THREE.Mesh(sideFin(0.4, 0.34), finMat);
      fluke.rotation.x = -Math.PI / 2;      // horizontal
      fluke.position.set(0, 0, -0.06);
      fluke.rotation.z = s * 0.5 - Math.PI / 2 * 0; // spread lobes
      fluke.scale.x = s;
      rear.add(fluke);
    }
  } else {
    const tail = new THREE.Mesh(caudalFin(maxR * 2.4, 0.3), finMat);
    tail.position.z = -0.06;
    rear.add(tail);
  }

  // dorsal fin
  if (!isWhale && !isAngler) {
    const d = new THREE.Mesh(dorsalFin(0.12, maxR * (isShark ? 2.4 : 1.7)), finMat);
    d.position.set(0, maxR * 0.85, 0.04); root.add(d);
  }

  // anglerfish: bioluminescent lure arcing over the head
  if (isAngler) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.32, 4), finMat);
    rod.position.set(0, maxR * 1.15, 0.28);
    rod.rotation.x = -0.85;                       // arc forward over the mouth
    root.add(rod);
    const lure = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xaef4ff })   // self-lit in the dark
    );
    lure.position.set(0, maxR * 1.15 + 0.12, 0.4);
    root.add(lure);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x57e3c9, transparent: true, opacity: 0.22, depthWrite: false })
    );
    halo.position.copy(lure.position);
    root.add(halo);
  }

  // pectoral fins
  for (const s of [-1, 1]) {
    const pf = new THREE.Mesh(sideFin(maxR * 2.2, maxR * 2.4), finMat);
    pf.position.set(s * maxR * 0.7, -maxR * 0.2, 0.14);
    pf.rotation.y = s * 0.5; pf.rotation.z = s * 0.3; pf.scale.x = s;
    root.add(pf);
  }

  // reef fish stripes
  if (c.band && shape === 'fish') {
    for (const bz of [0.16, -0.02, -0.18]) {
      const r = maxR * profile((bz + 0.5)) * 1.04 + 0.004;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, maxR * 0.06, 6, 14), mat(c.band));
      ring.rotation.y = Math.PI / 2; ring.position.z = bz; root.add(ring);
    }
  }

  addEyes(root, maxR * 0.13, 0.42, maxR * 0.66, maxR * 0.22);

  root._anim = {
    kind: isWhale ? 'fluke' : 'tail',
    freq: isWhale ? 0.9 : (isShark ? 1.4 : (isAngler ? 1.6 : 3.0)),
    amp: isWhale ? 0.18 : (isShark ? 0.24 : (isAngler ? 0.28 : 0.4)),
    t: Math.random() * 6, rear,
  };
  root.scale.setScalar(species.length);
  root.userData.species = species.id;
  return root;
}

export function animateCreature(root, dt, speed01 = 1) {
  const a = root._anim;
  if (!a) return;
  a.t += dt * (0.6 + speed01 * a.freq);
  const s = Math.sin(a.t * Math.PI * 2);
  if (a.kind === 'flipper' && root._flippers) {
    const flap = s * a.amp;
    root._flippers[0].rotation.x = -0.15 + flap;
    root._flippers[1].rotation.x = -0.15 + flap;
    root._flippers[2].rotation.x = -0.15 - flap * 0.6;
    root._flippers[3].rotation.x = -0.15 - flap * 0.6;
  } else if (a.kind === 'wings' && root._wings) {
    for (const w of root._wings) {
      w.mesh.rotation.z = w.side * s * a.amp;      // graceful manta wingbeat
    }
  } else if (a.rear) {
    if (a.kind === 'fluke') a.rear.rotation.x = s * a.amp;   // whale up/down
    else a.rear.rotation.y = s * a.amp;                      // fish left/right
  }
  root.rotation.z = Math.sin(a.t * Math.PI) * 0.03;          // gentle roll
}
