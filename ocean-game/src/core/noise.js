// noise.js — Self-contained deterministic noise (no external deps).
// Simplex-style 2D/3D value noise built on a seeded permutation table.
// Deterministic: same seed + same coords => same result (needed for chunk streaming).

function xfnv1a(str) {
  // Small seeded hash -> uint32
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Noise {
  constructor(seed = 'ocean') {
    const rng = mulberry32(typeof seed === 'number' ? seed : xfnv1a(String(seed)));
    // Build permutation table 0..255 shuffled, then duplicated to 512.
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    this.gradP = new Array(512);
    // 12 gradient directions of a cube (classic Perlin grad set).
    const grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    ];
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.gradP[i] = grad3[this.perm[i] % 12];
    }
  }

  static _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  static _lerp(a, b, t) { return a + t * (b - a); }

  // Classic Perlin 2D in [-1,1]
  perlin2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = Noise._fade(x), v = Noise._fade(y);
    const p = this.perm;
    const n00 = this._grad2(p[X + p[Y]], x, y);
    const n01 = this._grad2(p[X + p[Y + 1]], x, y - 1);
    const n10 = this._grad2(p[X + 1 + p[Y]], x - 1, y);
    const n11 = this._grad2(p[X + 1 + p[Y + 1]], x - 1, y - 1);
    return Noise._lerp(
      Noise._lerp(n00, n10, u),
      Noise._lerp(n01, n11, u),
      v
    );
  }

  _grad2(hash, x, y) {
    const g = this.gradP[hash & 511];
    return g[0] * x + g[1] * y;
  }

  // Fractal Brownian Motion (layered noise) -> [-1,1]
  fbm2(x, y, { octaves = 4, freq = 1, lacunarity = 2, gain = 0.5 } = {}) {
    let amp = 1, sum = 0, norm = 0, f = freq;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.perlin2(x * f, y * f);
      norm += amp;
      amp *= gain;
      f *= lacunarity;
    }
    return sum / norm;
  }

  // Ridged noise (good for canyon/ridge feeling on the seafloor) -> [0,1]
  ridged2(x, y, opts = {}) {
    const n = Math.abs(this.fbm2(x, y, opts));
    return 1 - n;
  }
}
