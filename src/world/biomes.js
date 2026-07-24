// biomes.js — Maps world (x,z) coordinates to a biome, seamlessly.
// Two low-frequency noise fields (temperature, moisture-of-sorts) partition the
// infinite plane into connected regions — like real oceans blend into each other.


// Visual + terrain identity for each biome.
import { earthFields, biomeWeightsAt, worldAt, WORLD_W } from './earth.js';

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
  // Geography now decides this; see earth.js. Kept as a thin wrapper because
  // chunk.js, chunkManager.js and the minimap all call it.
  const { biome } = earthFields(noise, x, z);
  return { biome };
}

export function biomeWeights(noise, x, z) {
  return biomeWeightsAt(noise, x, z);
}


// Seafloor height (y, negative) at world (x,z), blended so biomes connect smoothly.

// Real blue holes, by name and position. These are drowned karst shafts and
// they exist in specific places — Belize, the Bahamas, the Red Sea, the South
// China Sea — not wherever a noise field happens to cross a threshold, which
// is how they used to be scattered.
export const BLUE_HOLES = [
  { name: 'Great Blue Hole',   lon: -87.535, lat: 17.316, radius: 150, depth: 124 },
  { name: "Dean's Blue Hole",  lon: -74.895, lat: 23.785, radius: 90,  depth: 202 },
  { name: 'Dragon Hole',       lon: 111.767, lat: 16.528, radius: 110, depth: 300 },
  { name: 'Blue Hole Dahab',   lon: 34.537,  lat: 28.572, radius: 70,  depth: 130 },
  { name: 'Blue Hole Gozo',    lon: 14.190,  lat: 36.049, radius: 55,  depth: 60 },
  { name: 'Blue Hole Guam',    lon: 144.650, lat: 13.235, radius: 60,  depth: 90 },
];

// Precomputed game-space centres, filled on first use.
let _holes = null;
function holeSites() {
  if (_holes) return _holes;
  _holes = BLUE_HOLES.map((h) => {
    const { x, z } = worldAt(h.lon, h.lat);
    return { ...h, x, z };
  });
  return _holes;
}

// Blue holes are a hole, not a hill: a near-vertical karst shaft sunk into an
// otherwise shallow platform. Carved as its own term so the shaft keeps its
// steep walls no matter what the surrounding terrain noise does.
export function blueHoleAt(noise, x, z) {
  let best = null;
  for (const h of holeSites()) {
    // the world wraps east-west, so measure the shorter way round
    let dx = x - h.x;
    if (dx > WORLD_W / 2) dx -= WORLD_W;
    if (dx < -WORLD_W / 2) dx += WORLD_W;
    const d = Math.hypot(dx, z - h.z);
    if (d > h.radius * 1.25) continue;
    if (!best || d < best.d) {
      best = { d, radius: h.radius, cx: h.x, cz: h.z, strength: 1, name: h.name };
    }
  }
  return best;
}

const _sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

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

