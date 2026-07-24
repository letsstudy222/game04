// currents.js — The great surface currents, as real rivers in the sea.
//
// Half of any swim in a geographically honest ocean is open water. Measured on
// real paths that came to two and a half minutes of nothing between anything
// worth looking at. Shoals fill some of that, but currents change what the gap
// FEELS like: instead of holding W across empty blue, you slip into a moving
// band, stop swimming, and get carried. The emptiness becomes the point.
//
// Positions follow the actual currents — the Gulf Stream really does run up the
// American seaboard and across to Norway, and the Antarctic Circumpolar really
// does encircle the globe. Speeds do not: a real current runs well under a
// metre per second, which against a 14 m/s swimmer would be imperceptible.
// They are tuned to be felt.

import { worldAt, WORLD_W } from './earth.js';

// Band widths are set for coverage, not realism: at true width a current is a
// thread on a 33 km world and you would essentially never find one. These put
// about a third of the ocean surface inside some current, which is what makes
// them a feature of travel rather than a curiosity.
export const CURRENTS = [
  { name: 'Hải lưu Gulf Stream', speed: 6.0, width: 700,
    via: [[-80, 26], [-75, 34], [-65, 39], [-45, 44], [-25, 50], [-12, 58], [-6, 62]] },
  { name: 'Hải lưu Kuroshio', speed: 5.4, width: 650,
    via: [[123, 23], [130, 30], [140, 35], [152, 38], [170, 40]] },
  { name: 'Hải lưu California', speed: 3.6, width: 550,
    via: [[-129, 47], [-126, 39], [-121, 31], [-114, 24]] },
  { name: 'Hải lưu Vòng Nam Cực', speed: 5.0, width: 950,
    via: [[-170, -56], [-100, -58], [-30, -56], [30, -57], [100, -58], [170, -56]] },
  { name: 'Hải lưu Agulhas', speed: 5.2, width: 500,
    via: [[42, -18], [38, -26], [30, -34], [22, -38]] },
  { name: 'Hải lưu Humboldt', speed: 3.4, width: 550,
    via: [[-76, -42], [-80, -28], [-83, -14], [-85, -4]] },
  { name: 'Hải lưu Xích đạo', speed: 3.2, width: 600,
    via: [[-95, 6], [-130, 5], [-165, 4], [165, 5]] },
  { name: 'Hải lưu Bắc Đại Tây Dương', speed: 3.0, width: 600,
    via: [[-18, 22], [-35, 16], [-52, 12], [-64, 11]] },
];

let _segs = null;

function build() {
  if (_segs) return _segs;
  _segs = [];
  for (const c of CURRENTS) {
    const pts = c.via.map(([lon, lat]) => worldAt(lon, lat));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      let dx = b.x - a.x;
      // the world wraps east-west; take the short way so a segment spanning the
      // dateline does not stretch back across the entire map
      if (dx > WORLD_W / 2) dx -= WORLD_W;
      if (dx < -WORLD_W / 2) dx += WORLD_W;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      _segs.push({
        name: c.name, speed: c.speed, width: c.width,
        ax: a.x, az: a.z, dx, dz, len,
        ux: dx / len, uz: dz / len,
      });
    }
  }
  return _segs;
}

const _out = { vx: 0, vz: 0, strength: 0, name: null };

/**
 * Flow at a world position.
 * Strength falls off smoothly to zero at the edge of the band, so you drift
 * into a current rather than hitting a wall of motion.
 */
export function currentAt(x, z) {
  const segs = build();
  _out.vx = 0; _out.vz = 0; _out.strength = 0; _out.name = null;
  let best = 0;
  for (const s of segs) {
    let px = x - s.ax;
    if (px > WORLD_W / 2) px -= WORLD_W;
    if (px < -WORLD_W / 2) px += WORLD_W;
    const pz = z - s.az;
    let t = (px * s.dx + pz * s.dz) / (s.len * s.len);
    t = Math.max(0, Math.min(1, t));
    const cx = px - s.dx * t, cz = pz - s.dz * t;
    const d = Math.hypot(cx, cz);
    if (d >= s.width) continue;
    // smoothstep falloff, plus a taper at the two ends of the segment run
    const u = 1 - d / (s.width);
    const f = u * u * (3 - 2 * u);
    if (f <= best) continue;
    best = f;
    _out.strength = f;
    _out.vx = s.ux * s.speed * f;
    _out.vz = s.uz * s.speed * f;
    _out.name = s.name;
  }
  return _out;
}

/** Depth profile: surface currents weaken with depth and die below ~220 m. */
export function currentFactorAtDepth(y) {
  const d = Math.max(0, -y);
  if (d > 220) return 0;
  return 1 - (d / 220) * (d / 220);
}
