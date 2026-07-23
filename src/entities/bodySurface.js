// bodySurface.js — Continuous parametric body surface.
//
// The previous approach glued separate primitives together (a squashed sphere
// for the head, boxes for the throat grooves) onto a lathe body. That produces
// visible seams and a circular cross-section, which is the single biggest
// reason procedural animals read as fake.
//
// Here the whole animal body is ONE surface. Each station along the spine
// carries its own half-width, back height and belly depth, so the cross-section
// morphs from a broad flat rostrum, through a deep round mid-body, into a
// laterally-compressed tail stock — exactly how a real cetacean is shaped.
//
// Grooves (ventral pleats, gill creases) are carved by displacing the surface
// inward, not by adding geometry, so they hug the body perfectly and catch
// light like real creases.

import * as THREE from 'three';

// Smooth interpolation across authored stations.
function sampler(stations, key) {
  return (t) => {
    t = Math.min(1, Math.max(0, t));
    for (let i = 0; i < stations.length - 1; i++) {
      const a = stations[i], b = stations[i + 1];
      if (t >= a.t && t <= b.t) {
        const k = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
        const s = k * k * (3 - 2 * k);
        return a[key] + (b[key] - a[key]) * s;
      }
    }
    return stations[stations.length - 1][key];
  };
}

/**
 * @param {object} o
 * @param {Array}  o.stations  [{t, w, hTop, hBot, yOff}] — t 0 (nose) .. 1 (tail)
 * @param {number} o.length    body length in local units
 * @param {number} o.segments  stations sampled along the spine
 * @param {number} o.radial    vertices around each cross-section
 * @param {function} [o.groove] (t, theta) => inward displacement fraction 0..1
 * @param {function} [o.shade]  (t, theta, yNorm) => THREE.Color
 */
export function organicBody({
  stations, length = 1, segments = 64, radial = 48, groove = null, shade = null,
}) {
  const w = sampler(stations, 'w');
  const hT = sampler(stations, 'hTop');
  const hB = sampler(stations, 'hBot');
  const yO = sampler(stations, 'yOff');

  const pos = [], col = [], uv = [], idx = [];
  const c = new THREE.Color();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const ww = w(t), ht = hT(t), hb = hB(t), yy = yO(t);
    for (let j = 0; j <= radial; j++) {
      const th = (j / radial) * Math.PI * 2;
      const ct = Math.cos(th), st = Math.sin(th);
      // inward displacement carves creases into the surface
      const g = groove ? 1 - groove(t, th) : 1;
      const x = ww * ct * g;
      const h = st >= 0 ? ht : hb;
      const y = h * st * g + yy;
      // head at +Z so the animal faces forward in the game's convention
      const z = (0.5 - t) * length;
      pos.push(x, y, z);

      uv.push(j / radial, t);
      if (shade) {
        c.copy(shade(t, th, st));
        col.push(c.r, c.g, c.b);
      }
    }
  }

  const stride = radial + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * stride + j, b = a + 1, d = a + stride, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (shade) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Deterministic value noise for skin mottling — no texture files needed.
export function mottle(x, y, scale = 1) {
  const s = Math.sin(x * 12.9898 * scale + y * 78.233 * scale) * 43758.5453;
  const a = s - Math.floor(s);
  const s2 = Math.sin(x * 39.3468 * scale - y * 11.135 * scale) * 24634.6345;
  const b = s2 - Math.floor(s2);
  return (a * 0.6 + b * 0.4);
}

/**
 * Build a smooth blade (fin, fluke, flipper) from an outline, with thickness
 * and a tapered trailing edge so it does not look like flat paper.
 * Outline points are [along, across] in the blade's own plane.
 */
export function foil(outline, thickness = 0.02, taper = 0.35) {
  const n = outline.length;
  const pos = [], idx = [];
  // top shell then bottom shell
  for (const side of [1, -1]) {
    for (let i = 0; i < n; i++) {
      const [a, b] = outline[i];
      // thin out towards the outline edge for a foil cross-section
      const edge = i === 0 ? 1 : Math.max(taper, 1 - i / (n - 1));
      pos.push(a, side * thickness * edge, b);
    }
  }
  for (let i = 1; i < n - 1; i++) {
    idx.push(0, i, i + 1);              // top face
    idx.push(n, n + i + 1, n + i);      // bottom face
  }
  for (let i = 0; i < n; i++) {         // rim
    const j = (i + 1) % n;
    idx.push(i, n + i, j, j, n + i, n + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}


/**
 * Render a procedural skin texture. Surface detail this fine (pleats, creases,
 * blotching) cannot be resolved by geometry at a sane vertex count — 30 throat
 * pleats would need ~250 vertices around the girth. A texture gives crisp
 * detail at any mesh density, for a fraction of the cost.
 *
 * @param {function} fn (u, v) => [r, g, b] each 0..1   u = around, v = along
 */
export function makeSkinTexture(fn, w = 512, h = 512) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x / w, y / h);
      const i = (y * w + x) * 4;
      data[i] = Math.max(0, Math.min(255, r * 255));
      data[i + 1] = Math.max(0, Math.min(255, g * 255));
      data[i + 2] = Math.max(0, Math.min(255, b * 255));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Greyscale height field, used as a bump map so creases catch light. */
export function makeBumpTexture(fn, w = 512, h = 512) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.max(0, Math.min(1, fn(x / w, y / h)));
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}


/**
 * A believable fish eye. The previous version was a white ball with a black
 * dot stuck on the side of the head — which reads as a boiled, dead fish.
 * A real eye is: dark and wet, set almost FLUSH into the skull, ringed by a
 * thin coloured iris, with one small specular highlight.
 *
 * The returned group faces +X; mirror it with scale.x for the other side.
 */
export function makeEye(r, irisHex = 0xc9761f, pupilHex = 0x0a0b0d) {
  const g = new THREE.Group();
  // eyeball, flattened along the outward axis so it sits in the socket
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 14),
    new THREE.MeshStandardMaterial({ color: pupilHex, roughness: 0.12, metalness: 0.05 })
  );
  ball.scale.x = 0.55;
  g.add(ball);
  // iris: a thin ring of colour around the pupil, not a white sclera
  const iris = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.72, r * 0.24, 8, 20),
    new THREE.MeshStandardMaterial({ color: irisHex, roughness: 0.35, metalness: 0.25 })
  );
  iris.rotation.y = Math.PI / 2;
  iris.position.x = r * 0.30;
  iris.scale.z = 0.6;
  g.add(iris);
  // wet highlight — one small, off-centre dot
  const hi = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  hi.position.set(r * 0.5, r * 0.34, r * 0.3);
  hi.scale.x = 0.5;
  g.add(hi);
  return g;
}

/**
 * Two-tone fin: body colour at the root fading to a darker margin at the edge,
 * with an optional bright rim. Solid-black fins read as cardboard cut-outs.
 */
export function foilShaded(outline, thickness, taper, inner, outer, rim = null) {
  const g = foil(outline, thickness, taper);
  const pos = g.attributes.position;
  const n = outline.length;
  const ci = new THREE.Color(inner), co = new THREE.Color(outer);
  const cr = rim !== null ? new THREE.Color(rim) : null;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = (i % n) / (n - 1);            // 0 at root, 1 at outline tip
    const e = Math.min(1, k * 1.35);
    if (cr && e > 0.82) c.copy(co).lerp(cr, (e - 0.82) / 0.18);
    else c.copy(ci).lerp(co, e * e);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
