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

  perf: {
    maxCreatures: 150,      // hard cap on simultaneous NPC creatures
    plankton: 1400,         // ambient drifting particle count
    godRays: 14,            // number of light shafts near surface
  },
};

// Cruise speed scaled by body size: a 9 cm clownfish should not cross the
// ocean at whale speed. sqrt keeps big species from being absurdly fast too.
export function cruiseFor(species) {
  const sizeScale = Math.min(1.2, Math.max(0.15, Math.sqrt(species.length) / 1.5));
  return CONFIG.player.baseSpeed * species.speedFactor * sizeScale;
}

// Creature-density presets the player can pick in the menu. The adaptive
// quality system can still step this down automatically on a slow machine.
export const DENSITY = {
  low:    { maxCreatures: 70,  plankton: 900,  renderRadius: 2 },
  medium: { maxCreatures: 150, plankton: 1400, renderRadius: 3 },
  high:   { maxCreatures: 240, plankton: 2000, renderRadius: 3 },
};

export function applyDensity(level) {
  const d = DENSITY[level] || DENSITY.medium;
  CONFIG.perf.maxCreatures = d.maxCreatures;
  CONFIG.perf.plankton = d.plankton;
  CONFIG.chunk.renderRadius = d.renderRadius;
  return d;
}

// Real-world-ish depth zones. Used for biome blending + HUD labels.
export const DEPTH_ZONES = [
  { name: 'Sunlight (Epipelagic)', to: -200, viet: 'Tầng có ánh sáng' },
  { name: 'Twilight (Mesopelagic)', to: -1000, viet: 'Tầng chạng vạng' },
  { name: 'Midnight (Bathypelagic)', to: -4000, viet: 'Tầng nửa đêm' },
];
