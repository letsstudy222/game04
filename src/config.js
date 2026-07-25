// config.js — Central tuning. Change numbers here to reshape the world.
// Units = meters. World is procedural + chunk-streamed (Minecraft-style).

export const CONFIG = {
  seed: 'blue-planet-01',

  world: {
    surfaceY: 0,            // water surface at y = 0
    maxDepth: -1200,        // deepest the seafloor can go (m)
    minDepth: -12,          // shallowest seafloor (reef flats) (m)
  },

  chunk: {
    size: 240,              // chunk side length in meters
    segments: 24,           // terrain grid resolution per chunk (24x24 quads)
    renderRadius: 3,        // load chunks within this many rings around player
    // -> loaded area ≈ (2*renderRadius+1)^2 chunks. 3 => 7x7 = 49 chunks.
  },

  camera: {
    fov: 60,
    near: 0.1,
    far: 4000,              // far plane large enough for big open scenes + fog
  },

  player: {
    baseSpeed: 14,          // cruise speed (m/s) — scaled per species
    boostMultiplier: 2.6,   // shift to sprint
    turnSpeed: 1.8,         // yaw/pitch responsiveness
    followDistance: 6,      // 3rd-person camera distance (scaled by fish size)
    followHeight: 2.2,
  },

  fog: {
    // Fog color/near/far are recomputed by depth in ocean.js.
    surfaceColor: 0x3fa9d6,
    deepColor: 0x02141f,
  },

  // Time of day. The old cycle was 360 s — six minutes — which sounds
  // atmospheric and is a disaster in practice: the mean of a cosine day is
  // 0.5, and ocean.js multiplies the water tint by (0.22 + 0.78 * daylight),
  // so the average frame was rendered at 61% of its intended colour. The game
  // spent roughly thirty seconds of every six minutes at the brightness the
  // art was actually tuned for, and every screenshot taken at random looked
  // like dusk. A long day with a bias towards light fixes the whole class of
  // "the water looks dead" complaint without touching a single shader.
  time: {
    dayLength: 1800,        // seconds for a full day/night cycle (30 min)
    dayBias: 0.62,          // 0 = pure cosine, ->1 = ever more time in full light
    nightFloor: 0.06,       // never fully black; the deep is dark enough already
    startPhase: 0.0,        // 0 = start at noon
  },

  perf: {
    maxCreatures: 150,      // hard cap on simultaneous NPC creatures
    fullDetailCreatures: 8, // how many may run full mesh deformation per frame
    plankton: 1400,         // ambient drifting particle count
    godRays: 14,            // number of light shafts near surface
    // Multiplier on the caustic net. The caustic function runs per fragment
    // over the seabed, which fills most of the screen in shallow biomes, so
    // it is the first thing to give up on a slow GPU.
    causticStrength: 1.0,
    // Hard ceiling on device pixel ratio. A HiDPI laptop reports 2, which is
    // four times the pixels, and with MSAA on top an integrated GPU has no
    // chance. 1.5 is visually near-identical and roughly halves fill cost.
    pixelRatioCap: 1.5,
  },
};

// Adaptive quality tiers, highest first. adaptQuality() in main.js walks this
// list in BOTH directions — the old version only ever stepped down and never
// recovered, so one unlucky half-second (a chunk build, an alt-tab) locked the
// player into the lowest tier for the rest of the session and they judged the
// game on it.
export const QUALITY_TIERS = [
  { name: 'high',   pixelRatio: null, renderRadius: 3, maxCreatures: 150, fullDetail: 8, caustics: 1.0,  godRays: 14 },
  { name: 'medium', pixelRatio: 1.15, renderRadius: 3, maxCreatures: 110, fullDetail: 6, caustics: 0.85, godRays: 12 },
  { name: 'low',    pixelRatio: 1.0,  renderRadius: 2, maxCreatures: 80,  fullDetail: 4, caustics: 0.55, godRays: 8 },
  { name: 'potato', pixelRatio: 0.85, renderRadius: 2, maxCreatures: 55,  fullDetail: 3, caustics: 0.0,  godRays: 5 },
];

// Cruise speed scaled by body size: a 9 cm clownfish should not cross the
// ocean at whale speed. sqrt keeps big species from being absurdly fast too.
export function cruiseFor(species) {
  const sizeScale = Math.min(1.2, Math.max(0.15, Math.sqrt(species.length) / 1.5));
  return CONFIG.player.baseSpeed * species.speedFactor * sizeScale;
}

// Creature-density presets the player can pick in the menu. The adaptive
// quality system can still step this down automatically on a slow machine.
export const DENSITY = {
  low:    { maxCreatures: 70,  plankton: 900,  renderRadius: 2, fullDetailCreatures: 5 },
  medium: { maxCreatures: 150, plankton: 1400, renderRadius: 3, fullDetailCreatures: 8 },
  high:   { maxCreatures: 240, plankton: 2000, renderRadius: 3, fullDetailCreatures: 12 },
};

export function applyDensity(level) {
  const d = DENSITY[level] || DENSITY.medium;
  CONFIG.perf.maxCreatures = d.maxCreatures;
  CONFIG.perf.plankton = d.plankton;
  CONFIG.perf.fullDetailCreatures = d.fullDetailCreatures;
  CONFIG.chunk.renderRadius = d.renderRadius;
  return d;
}

// Real-world-ish depth zones. Used for biome blending + HUD labels.
export const DEPTH_ZONES = [
  { name: 'Sunlight (Epipelagic)', to: -200, viet: 'Tầng có ánh sáng' },
  { name: 'Twilight (Mesopelagic)', to: -1000, viet: 'Tầng chạng vạng' },
  { name: 'Midnight (Bathypelagic)', to: -4000, viet: 'Tầng nửa đêm' },
];
