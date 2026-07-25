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

export function makeWaterSurface(size = 700, segs = 160) {
  // SIZE. Once underwater visibility was brought down from 736 m to a realistic
  // 173 m, most of this plane became unreachable. The furthest any biome now
  // sees is 225 m, so a 350 m half-width still never shows an edge — and the
  // triangles saved buy resolution instead: 4.4 m per quad against 30 m
  // originally, which is what finally makes the smaller wave trains exist.
  //
  // RESOLUTION. At 30 m per quad only the 62 m swell was above Nyquist; the
  // 31, 15 and 7 m trains were finer than the mesh could represent and simply
  // did not exist. At 9.4 m per quad the swell and both mid trains resolve, and
  // everything below that moved to the fragment shader as normal detail, where
  // it costs nothing and never aliases.
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
    uWind: { value: 1.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      uniform float uWind;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vCrest;
      varying float vFold;
      ${GERSTNER}

      // One place, so the displacement and the normal can never disagree —
      // the old version left the finest train out of the normal entirely.
      vec3 waveField(vec2 xz, float t) {
        vec3 o = vec3(0.0);
        o += gerstner(xz, vec2( 1.0,  0.35), 0.62, 62.0, t, 1.00);
        o += gerstner(xz, vec2(-0.6,  1.0 ), 0.44, 31.0, t, 1.15);
        o += gerstner(xz, vec2( 0.8, -0.75), 0.32, 17.0, t, 1.30);
        o += gerstner(xz, vec2(-0.3, -1.0 ), 0.22, 11.0, t, 1.60);
        o += gerstner(xz, vec2( 0.55, 0.9 ), 0.16,  7.5, t, 1.85);
        return o * uWind;
      }

      void main() {
        vec2 xz = position.xz;
        vec3 o = waveField(xz, uTime);
        vec3 p = position + o;

        // Finite difference at roughly one quad, which is the finest thing the
        // mesh can actually carry.
        float e = 4.0;
        vec3 a = (vec3(xz.x + e, 0.0, xz.y) + waveField(xz + vec2(e, 0.0), uTime)) - p;
        vec3 b = (vec3(xz.x, 0.0, xz.y + e) + waveField(xz + vec2(0.0, e), uTime)) - p;
        vNormal = normalize(cross(b, a));

        vCrest = clamp(o.y * 0.55 + 0.5, 0.0, 1.0);

        // Horizontal Jacobian: where a Gerstner surface folds in on itself the
        // wave is breaking. This is what foam should key off, not height — a
        // tall smooth swell has no white on it at all.
        float dxdx = 1.0 + (a.x - e) / e;
        float dzdz = 1.0 + (b.z - e) / e;
        vFold = clamp(1.0 - (dxdx * dzdz), 0.0, 1.0);

        vWorld = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uSunDir, uShallow, uDeep, uSky;
      uniform float uDaylight, uCamY, uTime, uWind;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vCrest;
      varying float vFold;

      // Integer-style hash rather than the usual fract(sin(...)). The sine
      // version costs two transcendentals per sample and this shader takes a
      // dozen samples per pixel over most of the screen; that alone was a large
      // part of why the frame rate sat at 26.
      vec2 hash22(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
      }
      float gnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(dot(hash22(i), f),
                       dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                   mix(dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                       dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
      }

      // Ripples below the mesh resolution, as a normal only. Real water carries
      // centimetre-scale chop that never displaces anything visibly but is
      // entirely responsible for how it glitters.
      vec3 rippleNormal(vec2 p, float t, float detail) {
        float amp = 1.0, frq = 0.35;
        vec2 dr = vec2(0.0);
        for (int i = 0; i < 2; i++) {
          if (float(i) > detail) break;
          vec2 q = p * frq + vec2(t * (0.6 + float(i) * 0.35), t * 0.25);
          float e = 0.6 / frq;
          float c = gnoise(q);
          dr.x += (gnoise(q + vec2(e * frq, 0.0)) - c) * amp;
          dr.y += (gnoise(q + vec2(0.0, e * frq)) - c) * amp;
          amp *= 0.55; frq *= 2.7;
        }
        return normalize(vec3(-dr.x * 3.1, 1.0, -dr.y * 3.1));
      }

      void main() {
        vec3 view = normalize(cameraPosition - vWorld);
        vec3 n = normalize(vNormal);

        // Blend the ripple normal into the wave normal in the wave's own frame.
        // Ripples are sub-metre detail. Past about eighty metres they are far
        // below a pixel, so the octaves are dropped with distance instead of
        // being computed and then averaged away.
        float dist = length(cameraPosition - vWorld);
        float detail = clamp(2.0 - dist / 45.0, 0.0, 2.0);
        vec3 rn = rippleNormal(vWorld.xz, uTime, detail);
        vec3 t1 = normalize(cross(vec3(0.0, 1.0, 0.0), n) + vec3(0.001));
        vec3 t2 = cross(n, t1);
        n = normalize(n + (t1 * rn.x + t2 * rn.z) * 0.75 * uWind * step(0.01, detail));

        bool below = uCamY < 0.0;
        if (below) n = -n;

        float fres = pow(1.0 - clamp(dot(n, view), 0.0, 1.0), 3.0);

        // Foam: breaking crests, broken up by noise so the line is ragged
        // rather than a clean contour, and thinned where the sea is calm.
        // Thresholds are set from the measured Jacobian distribution, not by
        // eye: half the sea sits below 0.06 fold and the 90th percentile is
        // 0.65, so keying foam at 0.30 painted 41% of the ocean white. Real sea
        // shows whitecaps on a few per cent of its surface.
        float foamN = gnoise(vWorld.xz * 0.55 + vec2(uTime * 0.25, uTime * 0.11)) * 0.5 + 0.5;
        float foam = smoothstep(0.66, 0.90, vFold) * smoothstep(0.35, 0.80, foamN);
        foam = clamp(foam + smoothstep(0.955, 1.0, vCrest) * 0.30 * foamN, 0.0, 1.0);

        vec3 col;
        float alpha;

        if (below) {
          // ---- Snell's window -------------------------------------------
          // Looking up, refraction squeezes the whole sky into a disc about 97
          // degrees across. Outside it the underside mirrors the sea back.
          float up = clamp(dot(view, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
          // the rim wobbles with the surface instead of being a perfect circle
          float wob = gnoise(vWorld.xz * 0.06 + uTime * 0.15) * 0.05;
          float window = smoothstep(0.60 + wob, 0.80 + wob, up);
          vec3 outside = mix(uDeep * 0.30, uDeep, 0.5);
          vec3 inside = mix(uShallow, uSky, 0.55) * (0.35 + 0.65 * uDaylight);

          vec3 sunView = normalize(uSunDir + n * 0.35);
          float sun = pow(max(dot(view, sunView), 0.0), 220.0);
          float glow = pow(max(dot(view, sunView), 0.0), 14.0);

          col = mix(outside, inside, window);
          col += vec3(1.0, 0.96, 0.86) * sun * 2.8 * uDaylight * window;
          col += vec3(0.75, 0.92, 1.0) * glow * 0.55 * uDaylight * window;

          // Chromatic fringe at the rim. Different wavelengths refract at
          // slightly different angles, so the edge of the window is banded —
          // warm just inside, cold just outside.
          float rim = smoothstep(0.585 + wob, 0.655 + wob, up)
                    * (1.0 - smoothstep(0.655 + wob, 0.755 + wob, up));
          col += vec3(1.15, 0.85, 0.55) * rim * 0.45 * uDaylight;
          col += vec3(0.35, 0.70, 1.20) * rim * 0.28 * uDaylight;

          // foam seen from underneath: a bright scatter, not white paint
          col += vec3(0.80, 0.94, 1.0) * foam * 0.30 * uDaylight;
          alpha = mix(0.42, 0.82, window);
        } else {
          // ---- seen from above -------------------------------------------
          // Sky gradient rather than one flat colour, so the reflection has
          // somewhere to be bright and somewhere to be deep.
          vec3 refl = reflect(-view, n);
          vec3 skyCol = mix(uSky * 0.72, uSky, clamp(refl.y, 0.0, 1.0));
          skyCol = mix(skyCol, vec3(1.0, 0.95, 0.85),
                       pow(max(dot(refl, uSunDir), 0.0), 8.0) * 0.5);

          // Subsurface scattering: sunlight passing THROUGH a crest and coming
          // out the near side. This is what stops water reading as painted
          // metal — the green glow in a backlit wave.
          float sss = pow(clamp(dot(view, -uSunDir) * 0.5 + 0.5, 0.0, 1.0), 3.0)
                    * smoothstep(0.35, 0.95, vCrest);
          vec3 sssCol = mix(uShallow, vec3(0.35, 0.95, 0.80), 0.45) * sss * 0.9;

          vec3 body = mix(uDeep, uShallow, vCrest * 0.85);
          col = mix(body, skyCol, clamp(fres * 0.92, 0.0, 1.0));
          col += sssCol * uDaylight;

          // Glitter. A single wide highlight reads as plastic; the sparkle of
          // real water comes from the ripple normals catching the sun at many
          // tiny angles at once, so the specular is driven by the PERTURBED
          // normal and kept very tight.
          vec3 h = normalize(uSunDir + view);
          float spec = pow(max(dot(n, h), 0.0), 400.0);
          float broad = pow(max(dot(n, h), 0.0), 60.0);
          col += vec3(1.0, 0.97, 0.90) * (spec * 3.4 + broad * 0.35) * uDaylight;

          col *= (0.30 + 0.70 * uDaylight);
          col = mix(col, vec3(0.95, 0.99, 1.0) * (0.35 + 0.65 * uDaylight), foam * 0.85);
          alpha = mix(0.86, 0.97, foam);
        }
        gl_FragColor = vec4(col, alpha);
      }`,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 2;
  return { mesh, uniforms };
}


/* ------------------------------------------------------- water column dome */

/**
 * The water you are looking THROUGH, as a vertical gradient.
 *
 * `scene.background` is a single colour, so every direction that had no
 * geometry in it came out identical — measured on a real frame, the top of the
 * screen varied by 0.8 of one colour step out of 255. That flatness is the main
 * reason the sea read as a tinted pane rather than as a volume you are inside.
 *
 * Real water is not uniform: light comes from above, so looking up is bright
 * and looking down falls away into the dark. The dome carries that gradient,
 * with the horizon band matched to the fog colour so geometry fading into the
 * distance lands on exactly the same colour the empty water already is.
 */
export function makeWaterDome(radius = 900) {
  const uniforms = {
    uUp: { value: new THREE.Color(0x8fd4e0) },
    uMid: { value: new THREE.Color(0x2f7f92) },
    uDown: { value: new THREE.Color(0x061a24) },
    uCamY: { value: -10 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uUp, uMid, uDown;
      varying vec3 vDir;
      void main() {
        float y = clamp(vDir.y, -1.0, 1.0);
        // The band around the horizon is deliberately wide and soft. A tight
        // gradient reads as a painted backdrop; light in water scatters over
        // tens of metres and the transition is gradual.
        vec3 c = y > 0.0
          ? mix(uMid, uUp, pow(y, 0.65))
          : mix(uMid, uDown, pow(-y, 0.80));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
  mesh.renderOrder = -1;          // behind everything
  mesh.frustumCulled = false;
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
