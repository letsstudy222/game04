// earth.js — Real-world geography as the source of the world's shape.
//
// The ocean used to be three Perlin fields standing in for temperature, depth
// and distance from land. Those fields are now derived from the actual Earth:
// a rasterised coastline gives distance-to-land, latitude gives temperature,
// and depth follows the shelf-slope-abyss profile out from the coast. Every
// downstream consumer (biomeAt, biomeWeights, floorHeightAt) keeps working,
// because the fields it reads are still in the same numeric ranges.
//
// SCALE. Earth is 40,075 km around; a player cruising at 14 m/s would need
// twelve days of continuous swimming to cross the Pacific at 1:1. The world is
// therefore compressed 1:WORLD_SCALE, which puts the whole planet in 100 km of
// game space and the Pacific crossing at about 45 minutes.
//
// EXAGGERATION. Coral reefs are 0.1% of the real ocean and the interesting
// coastal habitats are a thin fringe; played straight, three quarters of the
// world is empty blue water. Reef, seagrass and mangrove bands are therefore
// widened well beyond their true extent. Their POSITIONS stay real — there are
// reefs off Queensland and none off Norway — only their width is inflated.

import { EARTH_LAND_RLE, EARTH_RES, EARTH_W, EARTH_H } from './earthData.js';

export const WORLD_SCALE = 400;                  // 1 game metre = 400 real metres
const EARTH_CIRCUM = 40075000;                   // metres at the equator
export const WORLD_W = EARTH_CIRCUM / WORLD_SCALE;        // ~100 km east-west
// Lambert cylindrical EQUAL-AREA, not the usual equirectangular. Equirectangular
// stretches the poles enormously, and on a flat game world that is not a
// drawing artefact — it genuinely makes the Arctic and Southern Ocean a huge
// slab of the playable area. Mapping z to sin(latitude) keeps every biome's
// share of the game world equal to its share of the real planet.
export const WORLD_H = WORLD_W / Math.PI;                 // ~32 km pole to pole

const KM_PER_DEG = 111;

/* ------------------------------------------------------------ decode once */

let _land = null;      // Uint8Array, 1 = land
let _dist = null;      // Float32Array, degrees from the nearest coast (ocean only)

function decode() {
  if (_land) return;
  _land = new Uint8Array(EARTH_W * EARTH_H);
  const rows = EARTH_LAND_RLE.split(';');
  for (let y = 0; y < EARTH_H; y++) {
    let x = 0, v = 0;
    for (const run of rows[y].split(',')) {
      const n = parseInt(run, 36);
      if (v) _land.fill(1, y * EARTH_W + x, y * EARTH_W + x + n);
      x += n; v ^= 1;
    }
  }
  buildDistance();
}

// Multi-source BFS out from every coastal water cell. Longitude wraps; the
// poles do not, which is correct — there is no crossing over the top.
function buildDistance() {
  const N = EARTH_W * EARTH_H;
  const d = new Int32Array(N).fill(-1);
  const queue = new Int32Array(N);
  let head = 0, tail = 0;
  for (let y = 0; y < EARTH_H; y++) {
    for (let x = 0; x < EARTH_W; x++) {
      const i = y * EARTH_W + x;
      if (_land[i]) continue;
      let coastal = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = (x + dx + EARTH_W) % EARTH_W, ny = y + dy;
        if (ny < 0 || ny >= EARTH_H) continue;
        if (_land[ny * EARTH_W + nx]) { coastal = true; break; }
      }
      if (coastal) { d[i] = 0; queue[tail++] = i; }
    }
  }
  while (head < tail) {
    const p = queue[head++], x = p % EARTH_W, y = (p / EARTH_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = (x + dx + EARTH_W) % EARTH_W, ny = y + dy;
      if (ny < 0 || ny >= EARTH_H) continue;
      const q = ny * EARTH_W + nx;
      if (_land[q] || d[q] >= 0) continue;
      d[q] = d[p] + 1; queue[tail++] = q;
    }
  }
  _dist = new Float32Array(N);
  for (let i = 0; i < N; i++) _dist[i] = d[i] < 0 ? 0 : d[i] / EARTH_RES;   // -> degrees
}

/* ------------------------------------------------------ coordinate mapping */

/** Game metres -> longitude/latitude. North is -z. */
export function lonLatAt(x, z) {
  let lon = (x / WORLD_W) * 360;
  lon = ((lon + 180) % 360 + 360) % 360 - 180;             // wrap the globe
  const s = Math.max(-1, Math.min(1, -z / (WORLD_H / 2)));
  return { lon, lat: Math.asin(s) * 180 / Math.PI };
}

/** Longitude/latitude -> game metres (used by the map to place the marker). */
export function worldAt(lon, lat) {
  return {
    x: (lon / 360) * WORLD_W,
    z: -Math.sin(lat * Math.PI / 180) * (WORLD_H / 2),
  };
}

function cellIndex(lon, lat) {
  let px = Math.floor((lon + 180) * EARTH_RES);
  let py = Math.floor((90 - lat) * EARTH_RES);
  px = ((px % EARTH_W) + EARTH_W) % EARTH_W;
  py = Math.max(0, Math.min(EARTH_H - 1, py));
  return py * EARTH_W + px;
}

export function isLand(lon, lat) { decode(); return _land[cellIndex(lon, lat)] === 1; }

/** Degrees from the nearest coastline, bilinearly smoothed. */
export function coastDistance(lon, lat) {
  decode();
  const fx = (lon + 180) * EARTH_RES - 0.5;
  const fy = (90 - lat) * EARTH_RES - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const at = (xi, yi) => {
    const px = ((xi % EARTH_W) + EARTH_W) % EARTH_W;
    const py = Math.max(0, Math.min(EARTH_H - 1, yi));
    return _dist[py * EARTH_W + px];
  };
  const a = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
  const b = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
  return a * (1 - ty) + b * ty;
}

/* ------------------------------------------------------- biome classification */

// Tuning lives here. Real coastal habitats are far too thin to swim through at
// any playable scale — a mangrove fringe is a few kilometres wide, which is
// fourteen metres of game world. So distance-from-coast is used for ORDER
// (which zone you are in) while the widths are set for play. Positions stay
// honest: reefs off Queensland, kelp off Patagonia, ice at the poles.
export const TROPIC = 32;          // warm-water limit; real tropics end at 23.5
export const POLAR_EDGE = 62;      // ice from here poleward
export const COAST_BAND = 12;     // degrees of "coastal" water
export const OPEN_BAND = 17;       // beyond this is abyssal

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Biome weights at a game-space position. `biomeAt` is the argmax of this, so
 * the two can never disagree — they used to be separate implementations of the
 * same thresholds, which is a drift waiting to happen.
 */
export function biomeWeightsAt(noise, x, z) {
  decode();
  const { lon, lat } = lonLatAt(x, z);
  const j = noise ? noise.fbm2(x * 0.0009 + 31, z * 0.0009 - 17, { octaves: 3, gain: 0.5 }) : 0;
  const d = Math.max(0, coastDistance(lon, lat) + j * 1.4);
  const absLat = Math.abs(lat);

  const w = {
    coral_reef: 0, kelp_forest: 0, open_ocean: 0, polar: 0,
    deep_sea: 0, mangrove: 0, seagrass: 0, blue_hole: 0,
  };

  // Ice first, and at ANY depth: the Arctic is both deep and frozen, and a
  // depth-first test made it open ocean.
  const polar = sm(POLAR_EDGE - 6, POLAR_EDGE + 4, absLat);
  w.polar = polar;
  const rest = 1 - polar;
  if (rest <= 0.001) return w;

  // How far out from land, and how warm.
  const coastal = 1 - sm(COAST_BAND * 0.55, COAST_BAND, d);
  const abyss = sm(OPEN_BAND * 0.7, OPEN_BAND, d);
  const open = Math.max(0, 1 - coastal - abyss);
  const warm = sm(TROPIC + 8, TROPIC - 8, absLat);

  w.deep_sea = rest * abyss;
  w.open_ocean = rest * open;

  const shelf = rest * coastal;
  if (shelf > 0.001) {
    // Cold shelves are kelp. Warm shelves are reef, broken by patches of
    // mangrove and seagrass — real mangroves sit in deltas and sheltered bays,
    // not in an unbroken ring around every tropical coast, so they are gated
    // by noise rather than by distance alone.
    const patch = noise ? noise.fbm2(x * 0.0021 - 611, z * 0.0021 + 407, { octaves: 2, gain: 0.55 }) : 0;
    const nearest = 1 - sm(0.0, 5.0, d);          // only really close in
    const mang = nearest * warm * sm(0.02, 0.10, patch);
    const sea = nearest * warm * sm(0.02, 0.10, -patch) * (1 - mang);
    w.mangrove = shelf * mang;
    w.seagrass = shelf * sea;
    const left = Math.max(0, shelf - w.mangrove - w.seagrass);
    w.coral_reef = left * warm;
    w.kelp_forest = left * (1 - warm);
  }
  return w;
}

/* -------------------------------------------------------------- public API */

/** Winning biome plus the raw geography, for HUD and map use. */
export function earthFields(noise, x, z) {
  const w = biomeWeightsAt(noise, x, z);
  let biome = 'open_ocean', best = -1;
  for (const k in w) if (w[k] > best) { best = w[k]; biome = k; }
  const { lon, lat } = lonLatAt(x, z);
  return { lon, lat, biome, weights: w, land: isLand(lon, lat), coastDeg: coastDistance(lon, lat) };
}
