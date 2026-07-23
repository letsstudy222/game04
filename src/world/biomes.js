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
  deep_sea: {
    label: 'Biển sâu',
    floorColor: 0x1a2733,
    accentColor: 0x2a3d4d,
    waterTint: 0x081821,
    baseDepth: -520,
    depthAmp: 260,
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

  // Thresholds calibrated to the fbm distribution (mean 0, sd ~0.15) so all five
  // biomes get a balanced, connected share of the map. Depth carves basins first;
  // an open_ocean band always sits between shallow reefs and the deep sea, so the
  // seafloor grades smoothly reef -> open -> deep instead of cliffing.
  let biome;
  if (depthField > 0.16) biome = 'deep_sea';
  else if (depthField > 0.04) biome = 'open_ocean';
  else if (temp > 0.06) biome = 'coral_reef';
  else if (temp < -0.06) biome = 'polar';
  else biome = 'kelp_forest';
  return { biome, temp, depthField };
}

// Seafloor height (y, negative) at world (x,z), blended so biomes connect smoothly.
export function floorHeightAt(noise, x, z) {
  const { biome } = biomeAt(noise, x, z);
  const def = BIOME_DEF[biome];
  // Medium-frequency rolling terrain + fine detail.
  const roll = noise.fbm2(x * 0.004, z * 0.004, { octaves: 4, gain: 0.5 });
  const detail = noise.fbm2(x * 0.02, z * 0.02, { octaves: 3, gain: 0.5 }) * 0.35;
  const ridges = noise.ridged2(x * 0.006 + 50, z * 0.006 + 50, { octaves: 3 }) * 0.4;

  let y = def.baseDepth + (roll + detail) * def.depthAmp - ridges * def.depthAmp * 0.5;

  // Occasional trenches in open/deep zones.
  if (biome === 'open_ocean' || biome === 'deep_sea') {
    const trench = noise.fbm2(x * 0.0016 + 700, z * 0.0016 + 700, { octaves: 2 });
    if (trench > 0.55) y -= (trench - 0.55) * 900;
  }
  return Math.min(-4, y);
}

export { BIOMES };
