// biomes.js — Maps world (x,z) coordinates to a biome, seamlessly.
// Two low-frequency noise fields (temperature, moisture-of-sorts) partition the
// infinite plane into connected regions — like real oceans blend into each other.

import { BIOMES } from '../data/species.js';

// Visual + terrain identity for each biome.
export const BIOME_DEF = {
  coral_reef: {
    label: 'Rạn san hô',
    floorColor: 0xf0dcae,       // pale sand
    accentColor: 0xff6f61,       // coral pink/orange
    waterTint: 0x2fb6c9,
    baseDepth: -14,              // shallow
    depthAmp: 22,                // gentle relief
    decor: 'coral',
    decorDensity: 0.9,
    clarity: 1.15,               // clearer water -> longer fog
  },
  kelp_forest: {
    label: 'Rừng tảo bẹ',
    floorColor: 0x5b6b4a,
    accentColor: 0x6f8f3a,
    waterTint: 0x2b7a63,
    baseDepth: -30,
    depthAmp: 34,
    decor: 'kelp',
    decorDensity: 1.0,
    clarity: 0.75,
  },
  open_ocean: {
    label: 'Biển khơi',
    floorColor: 0x3a5a72,
    accentColor: 0x4a7fa0,
    waterTint: 0x1f6f9a,
    baseDepth: -120,
    depthAmp: 90,
    decor: 'sparse_rock',
    decorDensity: 0.25,
    clarity: 1.0,
  },
  polar: {
    label: 'Vùng cực',
    floorColor: 0x8fa6b2,
    accentColor: 0xcfe6f2,
    waterTint: 0x4f8ba8,
    baseDepth: -80,
    depthAmp: 60,
    decor: 'ice',
    decorDensity: 0.4,
    clarity: 1.05,
  },
  mangrove: {
    label: 'Rừng ngập mặn',
    floorColor: 0x4a3d2a,          // soft anoxic mud
    accentColor: 0x6b5333,
    waterTint: 0x4a5230,           // tannin-stained, turbid
    baseDepth: -3,                 // intertidal; almost no water column
    depthAmp: 5,
    decor: 'mangrove',
    decorDensity: 1.35,
    clarity: 0.32,                 // low visibility is the defining quality
  },
  blue_hole: {
    label: 'Hố xanh',
    floorColor: 0xa89a80,          // pale carbonate sand on the rim
    accentColor: 0xd8cdb4,
    waterTint: 0x1246a0,           // the deep blue that names them
    baseDepth: -14,                // shallow rim; the shaft is carved below
    depthAmp: 10,
    decor: 'karst',
    decorDensity: 0.55,
    clarity: 1.5,                  // exceptionally clear water
  },
  seagrass: {
    label: 'Bãi cỏ biển',
    floorColor: 0xcbbf94,          // clean sand
    accentColor: 0x5f8f3f,
    waterTint: 0x35a8b4,
    baseDepth: -7,
    depthAmp: 7,
    decor: 'seagrass',
    decorDensity: 1.5,
    clarity: 1.35,
  },
  deep_sea: {
    label: 'Biển sâu',
    floorColor: 0x1a2733,
    accentColor: 0x2a3d4d,
    waterTint: 0x081821,
    baseDepth: -300,
    depthAmp: 165,
    decor: 'vent',
    decorDensity: 0.3,
    clarity: 0.55,
  },
};

// Determine biome from continuous fields. Returns { biome, blend } where blend
// helps smooth terrain across borders.
export function biomeAt(noise, x, z) {
  const s = 0.0014; // region scale — smaller => cross biomes more often while swimming
  const temp = noise.fbm2(x * s + 1000, z * s + 1000, { octaves: 3, gain: 0.55 });
  const depthField = noise.fbm2(x * s - 2000, z * s - 2000, { octaves: 3, gain: 0.55 });
  // A third field standing in for distance from land. Mangrove, seagrass and
  // blue holes are all coastal features, so they need a shore axis; two fields
  // could not separate them from the open-water biomes.
  const shore = noise.fbm2(x * s + 5000, z * s - 5000, { octaves: 3, gain: 0.55 });

  // Thresholds calibrated to the fbm distribution (mean 0, sd ~0.15). Depth
  // carves basins first; open_ocean always sits between shallow reefs and the
  // deep sea so the seafloor grades reef -> open -> deep instead of cliffing.
  let biome;
  if (depthField > 0.17) biome = 'deep_sea';
  else if (depthField > 0.04) biome = 'open_ocean';
  else if (shore < -0.20 && temp > -0.02) biome = 'mangrove';   // warmest, nearest land
  else if (shore < -0.11 && temp > -0.04) biome = 'seagrass';   // shallow sand shelf
  else if (shore > 0.20 && temp > 0.02) biome = 'blue_hole';    // karst platform
  else if (temp > 0.06) biome = 'coral_reef';
  else if (temp < -0.06) biome = 'polar';
  else biome = 'kelp_forest';
  return { biome, temp, depthField, shore };
}

// Blue holes are a hole, not a hill: a near-vertical karst shaft sunk into an
// otherwise shallow platform. It is carved as its own term so the shaft keeps
// its steep walls no matter what the surrounding terrain noise does.
export function blueHoleAt(noise, x, z) {
  const s = 0.0014;
  const shore = noise.fbm2(x * s + 5000, z * s - 5000, { octaves: 3, gain: 0.55 });
  if (shore <= 0.20) return null;
  // A blue hole is drowned karst: it only forms in a SHALLOW carbonate
  // platform, never in a deep basin. But these conditions must FADE rather
  // than switch, or the shaft is sliced off flat wherever a noise field
  // crosses its threshold, leaving a vertical cliff mid-rim.
  const depthField = noise.fbm2(x * s - 2000, z * s - 2000, { octaves: 3, gain: 0.55 });
  const temp = noise.fbm2(x * s + 1000, z * s + 1000, { octaves: 3, gain: 0.55 });
  const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const strength = sm(0.20, 0.30, shore)
                 * (1 - sm(0.06, 0.22, depthField))
                 * sm(0.00, 0.07, temp);
  if (strength <= 0.001) return null;
  // Hole centres sit on a coarse jittered lattice. The neighbouring cells must
  // all be tested: checking only the nearest lattice point meant a position
  // just across a cell boundary failed to see the hole it was actually inside,
  // which tore a vertical cliff through the rim.
  const cell = 900;
  const bx = Math.round(x / cell);
  const bz = Math.round(z / cell);
  let best = null;
  for (let oz = -1; oz <= 1; oz++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = (bx + ox) * cell;
      const cz = (bz + oz) * cell;
      const jx = cx + noise.perlin2(cx * 0.01, cz * 0.01) * 300;
      const jz = cz + noise.perlin2(cx * 0.01 + 40, cz * 0.01 - 40) * 300;
      const d = Math.hypot(x - jx, z - jz);
      const radius = 120 + noise.perlin2(cx * 0.02, cz * 0.02) * 45;
      if (d > radius * 1.25) continue;
      if (!best || d < best.d) best = { d, radius, cx: jx, cz: jz, strength };
    }
  }
  return best;
}

const _sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Soft membership of every biome at a point, from the same three noise fields
 * biomeAt uses — no extra sampling.
 *
 * This exists because the terrain used to take baseDepth from ONE hard-chosen
 * biome. A reef sits at -14 m and open ocean at -120 m, so every boundary
 * between them was a 100 m vertical cliff. Blending the parameters instead
 * makes the seabed grade between habitats the way a real shelf does.
 */
export function biomeWeights(noise, x, z) {
  const s = 0.0014;
  const temp = noise.fbm2(x * s + 1000, z * s + 1000, { octaves: 3, gain: 0.55 });
  const depthField = noise.fbm2(x * s - 2000, z * s - 2000, { octaves: 3, gain: 0.55 });
  const shore = noise.fbm2(x * s + 5000, z * s - 5000, { octaves: 3, gain: 0.55 });

  const w = {};
  // Wide windows on purpose: the narrower they are, the shorter the physical
  // distance the seabed has to climb between habitats, and a 0.08-wide window
  // turned the shelf edge into a vertical wall.
  const deep = _sm(0.04, 0.30, depthField);
  const open = _sm(-0.08, 0.12, depthField) * (1 - deep);
  w.deep_sea = deep;
  w.open_ocean = open;

  let rest = Math.max(0, 1 - deep - open);
  // coastal features, ordered from nearest land outward
  const warm = _sm(-0.06, 0.02, temp);
  const mang = _sm(-0.16, -0.24, shore) * warm;
  const sea = _sm(-0.07, -0.15, shore) * warm * (1 - mang);
  const karst = _sm(0.16, 0.24, shore) * _sm(-0.02, 0.06, temp);
  w.mangrove = rest * mang;
  w.seagrass = rest * sea;
  w.blue_hole = rest * karst * (1 - mang - sea);

  const left = Math.max(0, rest - w.mangrove - w.seagrass - w.blue_hole);
  const reef = _sm(0.02, 0.10, temp);
  const polar = _sm(-0.02, -0.10, temp);
  w.coral_reef = left * reef * (1 - polar);
  w.polar = left * polar * (1 - reef);
  w.kelp_forest = Math.max(0, left - w.coral_reef - w.polar);
  return w;
}

// Seafloor height (y, negative) at world (x,z), blended so biomes connect smoothly.
export function floorHeightAt(noise, x, z) {
  const { biome } = biomeAt(noise, x, z);
  const def = BIOME_DEF[biome];
  // Medium-frequency rolling terrain + fine detail.
  const roll = noise.fbm2(x * 0.004, z * 0.004, { octaves: 4, gain: 0.5 });
  const detail = noise.fbm2(x * 0.02, z * 0.02, { octaves: 3, gain: 0.5 }) * 0.35;
  const ridges = noise.ridged2(x * 0.006 + 50, z * 0.006 + 50, { octaves: 3 }) * 0.4;

  // Blend the depth parameters across every biome present here rather than
  // taking them from one winner, so boundaries grade instead of cliffing.
  const w = biomeWeights(noise, x, z);
  let baseDepth = 0, depthAmp = 0, total = 0;
  for (const k in w) {
    const wt = w[k];
    if (wt <= 0.0001) continue;
    baseDepth += BIOME_DEF[k].baseDepth * wt;
    depthAmp += BIOME_DEF[k].depthAmp * wt;
    total += wt;
  }
  if (total > 0.0001) { baseDepth /= total; depthAmp /= total; }
  else { baseDepth = def.baseDepth; depthAmp = def.depthAmp; }

  let y = baseDepth + (roll + detail) * depthAmp - ridges * depthAmp * 0.5;

  // Occasional trenches in open/deep water. Weighted, not gated: an
  // `if (biome === 'deep_sea')` switch deleted the whole trench the instant
  // the classification changed, which left a 57 m wall along its edge.
  {
    const deepW = (w.open_ocean || 0) + (w.deep_sea || 0);
    if (deepW > 0.001) {
      const trench = noise.fbm2(x * 0.0016 + 700, z * 0.0016 + 700, { octaves: 2 });
      if (trench > 0.55) y -= (trench - 0.55) * 900 * deepW;
    }
  }

  // Mangrove flats are intertidal and nearly level; seagrass sits on a shallow
  // sand shelf. Both are blended in by weight so their edges do not step.
  const mw = w.mangrove || 0, sw = w.seagrass || 0;
  if (mw > 0.001) y += ((-1.4 + (roll + detail) * 2.2) - y) * mw;
  if (sw > 0.001) y += ((-6 + (roll + detail) * 6) - y) * sw;
  // The global -4 m floor is right for open seabed but wrong for an
  // intertidal flat, so the minimum depth relaxes where mangrove dominates.
  const minDepth = -4 + 3.3 * mw;

  // Blue hole: a steep-walled shaft dropping ~124 m (Great Blue Hole scale)
  // out of a shallow carbonate platform.
  const hole = blueHoleAt(noise, x, z);
  if (hole) {
    const kRaw = hole.d / hole.radius;          // reaches the 1.25 cutoff
    const k = Math.min(1, kRaw);
    // near-vertical wall, flat floor, slight lip raised around the rim
    const wall = 1 - Math.pow(Math.min(1, k), 7);
    const lip = Math.exp(-Math.pow((kRaw - 1.02) / 0.10, 2)) * 3.5;
    // The hole is cut into a shallow carbonate platform, which keeps the shaft
    // at the ~124 m of the Great Blue Hole. Blend that platform back out into
    // the natural seabed by the outer edge so the rim has no step in it.
    const clamped = Math.max(-24, Math.min(-10, y));
    // Both the platform clamp and the rim lip must fall to exactly zero at the
    // 1.25 cutoff, or the terrain steps the moment blueHoleAt stops returning
    // a hole — which is what produced a 110 m cliff around the rim.
    const t = Math.min(1, Math.max(0, (kRaw - 0.80) / 0.45));
    const fade = 1 - t * t * (3 - 2 * t);
    const amt = fade * hole.strength;             // fades at the rim AND at the
    const platform = y + (clamped - y) * amt;      // edge of the karst region
    y = platform - wall * 112 * hole.strength + lip * amt;
    return Math.min(minDepth, y);
  }
  return Math.min(minDepth, y);
}

export { BIOMES };
