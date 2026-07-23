// waterShader.js — The surface and the light it throws.
//
// Three things the old flat translucent plane could not do:
//   1. Real waves. Gerstner (trochoidal) waves move water particles in circles,
//      so crests sharpen and troughs flatten — the shape actual sea has, unlike
//      a sine sheet which is symmetric and reads as cloth.
//   2. A refracted sun seen from below. Underwater the whole sky is squeezed
//      into Snell's window, a bright disc ~97 degrees wide directly overhead;
//      outside it the surface mirrors the sea back at you.
//   3. Caustics. Wave crests act as lenses and focus sunlight into the moving
//      bright net you see on the seabed and across an animal's back.

import * as THREE from 'three';

/* --------------------------------------------------------- shared GLSL */

// Gerstner wave displacement. Returns the offset for one wave train.
const GERSTNER = `
vec3 gerstner(vec2 p, vec2 dir, float steep, float wl, float t, float speed) {
  float k = 6.28318530718 / wl;
  float c = sqrt(9.81 / k) * speed;
  vec2 d = normalize(dir);
  float f = k * (dot(d, p) - c * t);
  float a = steep / k;
  return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
}
`;

/* ------------------------------------------------------- water surface */

export function makeWaterSurface(size = 6000, segs = 220) {
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-0.45, 0.78, 0.44).normalize() },
    uShallow: { value: new THREE.Color(0x6fd6e8) },
    uDeep: { value: new THREE.Color(0x0b3f5c) },
    uSky: { value: new THREE.Color(0xcdeeff) },
    uDaylight: { value: 1 },
    uCamY: { value: -10 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vCrest;
      ${GERSTNER}
      void main() {
        vec3 p = position;
        vec2 xz = p.xz;
        vec3 o = vec3(0.0);
        // four wave trains at different scales and headings
        o += gerstner(xz, vec2( 1.0,  0.35), 0.62, 62.0, uTime, 1.0);
        o += gerstner(xz, vec2(-0.6,  1.0 ), 0.42, 31.0, uTime, 1.15);
        o += gerstner(xz, vec2( 0.8, -0.75), 0.30, 15.0, uTime, 1.3);
        o += gerstner(xz, vec2(-0.3, -1.0 ), 0.22,  7.0, uTime, 1.6);
        p += o;

        // finite-difference normal from the same wave field
        float e = 1.2;
        vec3 px = vec3(xz.x + e, 0.0, xz.y);
        vec3 pz = vec3(xz.x, 0.0, xz.y + e);
        vec3 ox = vec3(0.0), oz = vec3(0.0);
        ox += gerstner(px.xz, vec2( 1.0,  0.35), 0.62, 62.0, uTime, 1.0);
        ox += gerstner(px.xz, vec2(-0.6,  1.0 ), 0.42, 31.0, uTime, 1.15);
        ox += gerstner(px.xz, vec2( 0.8, -0.75), 0.30, 15.0, uTime, 1.3);
        oz += gerstner(pz.xz, vec2( 1.0,  0.35), 0.62, 62.0, uTime, 1.0);
        oz += gerstner(pz.xz, vec2(-0.6,  1.0 ), 0.42, 31.0, uTime, 1.15);
        oz += gerstner(pz.xz, vec2( 0.8, -0.75), 0.30, 15.0, uTime, 1.3);
        vec3 a = (px + ox) - p;
        vec3 b = (pz + oz) - p;
        vNormal = normalize(cross(b, a));

        vCrest = clamp(o.y * 0.5 + 0.5, 0.0, 1.0);
        vWorld = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uSunDir, uShallow, uDeep, uSky;
      uniform float uDaylight, uCamY, uTime;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vCrest;
      void main() {
        vec3 view = normalize(cameraPosition - vWorld);
        vec3 n = normalize(vNormal);
        bool below = uCamY < 0.0;
        if (below) n = -n;

        float fres = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 3.0);
        vec3 col;
        float alpha;

        if (below) {
          // ---- Snell's window -------------------------------------------
          // Looking up, refraction squeezes the entire sky into a disc about
          // 97 degrees across. Inside it you see the sky and sun; outside,
          // the underside of the surface mirrors the dark sea back at you.
          float up = clamp(dot(view, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
          float window = smoothstep(0.62, 0.80, up);
          vec3 outside = mix(uDeep * 0.35, uDeep, 0.5);
          vec3 inside = mix(uShallow, uSky, 0.55) * (0.35 + 0.65 * uDaylight);

          // refracted sun disc, wobbling with the wave normal
          vec3 sunView = normalize(uSunDir + n * 0.35);
          float sun = pow(max(dot(view, sunView), 0.0), 220.0);
          float glow = pow(max(dot(view, sunView), 0.0), 14.0);

          col = mix(outside, inside, window);
          col += vec3(1.0, 0.96, 0.86) * sun * 2.6 * uDaylight * window;
          col += vec3(0.75, 0.92, 1.0) * glow * 0.5 * uDaylight * window;
          // bright rim where the window edge folds
          col += uSky * smoothstep(0.60, 0.66, up) *
                 (1.0 - smoothstep(0.66, 0.74, up)) * 0.5 * uDaylight;
          alpha = mix(0.42, 0.80, window);
        } else {
          // ---- seen from above -------------------------------------------
          vec3 body = mix(uDeep, uShallow, vCrest);
          vec3 h = normalize(uSunDir + view);
          float spec = pow(max(dot(n, h), 0.0), 180.0);
          col = mix(body, uSky, fres * 0.85) * (0.3 + 0.7 * uDaylight);
          col += vec3(1.0, 0.97, 0.9) * spec * 1.8 * uDaylight;
          col += vec3(1.0) * smoothstep(0.86, 1.0, vCrest) * 0.18;  // foam on crests
          alpha = 0.86;
        }
        gl_FragColor = vec4(col, alpha);
      }`,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 2;
  return { mesh, uniforms };
}

/* ------------------------------------------------------------ caustics */

/**
 * Caustics are injected into every lit material by patching its shader. The
 * pattern is computed in world space from the same wave field, so the moving
 * light net lands consistently on the seabed, on coral and across an animal's
 * back — and fades out with depth exactly as real focused sunlight does.
 */
export const CAUSTIC = {
  time: { value: 0 },
  daylight: { value: 1 },
  strength: { value: 1 },
};

const CAUSTIC_GLSL = `
  // Two counter-rotating voronoi-ish layers make the classic wavering net.
  float causticLayer(vec2 p, float t) {
    vec2 i = floor(p); vec2 f = fract(p);
    float m = 8.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 o = fract(sin(vec2(
          dot(i + g, vec2(127.1, 311.7)),
          dot(i + g, vec2(269.5, 183.3)))) * 43758.5453);
        o = 0.5 + 0.42 * sin(t + 6.2831 * o);
        m = min(m, length(g + o - f));
      }
    }
    return m;
  }
  float caustics(vec3 wp, float t) {
    vec2 p = wp.xz * 0.075;
    float a = causticLayer(p, t * 0.55);
    float b = causticLayer(p * 1.9 + 37.0, t * 0.42 + 2.0);
    float v = pow(1.0 - min(a, b), 7.0);
    return clamp(v, 0.0, 1.0);
  }
`;

export function applyCaustics(material) {
  if (!material || material.userData._caustic) return material;
  material.userData._caustic = true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCTime = CAUSTIC.time;
    shader.uniforms.uCDay = CAUSTIC.daylight;
    shader.uniforms.uCAmt = CAUSTIC.strength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCWorld;')
      .replace('#include <worldpos_vertex>',
        '#include <worldpos_vertex>\n  vCWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        `#include <common>
         uniform float uCTime, uCDay, uCAmt;
         varying vec3 vCWorld;
         ${CAUSTIC_GLSL}`)
      .replace('#include <dithering_fragment>',
        `#include <dithering_fragment>
         {
           // sunlight focuses strongest just under the surface and is gone by
           // roughly 60 m, matching how quickly the net fades in real water
           float depthFade = smoothstep(-62.0, -3.0, vCWorld.y);
           float c = caustics(vCWorld, uCTime) * depthFade * uCDay * uCAmt;
           gl_FragColor.rgb += vec3(0.55, 0.85, 0.78) * c * 0.85;
         }`);
  };
  material.needsUpdate = true;
  return material;
}

/* ------------------------------------------------ depth colour response */

/**
 * Water absorbs red first, then orange, then green; blue penetrates furthest.
 * Returns a multiplier per channel for a given depth in metres, following the
 * usual dive-photography rule of thumb: red essentially gone by ~5-10 m,
 * orange by ~20 m, yellow by ~30 m, green by ~50 m.
 */
export function depthAbsorption(depth, out = new THREE.Vector3()) {
  const d = Math.max(0, depth);
  return out.set(
    Math.exp(-d / 6.5),     // red
    Math.exp(-d / 34.0),    // green
    Math.exp(-d / 92.0)     // blue
  );
}
