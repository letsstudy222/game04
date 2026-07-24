// worldmap.js — Full-screen chart. An orthographic globe showing the real
// Earth, coloured by the same biome function the world is built from, centred
// on wherever you happen to be swimming.
//
// The globe is drawn pixel by pixel into a canvas rather than as vector paths.
// That sounds expensive, but it is a few hundred thousand array lookups against
// a precomputed grid, done once per rotation — and it means the map cannot
// drift from the world, because both read the same classifier.

import { biomeAt, BIOME_DEF, BLUE_HOLES } from '../world/biomes.js';
import { worldAt, lonLatAt, isLand, WORLD_W, WORLD_H } from '../world/earth.js';
import { seaAt } from '../world/seas.js';

const GRID_RES = 1;                       // degrees per lookup cell
const GW = 360 / GRID_RES, GH = 180 / GRID_RES;

const LAND = 0xff;
let _grid = null;                         // Uint8Array of biome indices
let _keys = null;                         // index -> biome id

/** Build the lookup grid once. Uses no noise: the chart shows clean geography. */
function buildGrid(onProgress) {
  if (_grid) return;
  _keys = Object.keys(BIOME_DEF);
  const idx = {};
  _keys.forEach((k, i) => { idx[k] = i; });
  _grid = new Uint8Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) {
    const lat = 90 - (gy + 0.5) * GRID_RES;
    for (let gx = 0; gx < GW; gx++) {
      const lon = -180 + (gx + 0.5) * GRID_RES;
      if (isLand(lon, lat)) { _grid[gy * GW + gx] = LAND; continue; }
      const { x, z } = worldAt(lon, lat);
      _grid[gy * GW + gx] = idx[biomeAt(null, x, z).biome] ?? 0;
    }
    if (onProgress && (gy & 31) === 0) onProgress(gy / GH);
  }
}

function sampleAt(lon, lat) {
  let gx = Math.floor((lon + 180) / GRID_RES);
  let gy = Math.floor((90 - lat) / GRID_RES);
  gx = ((gx % GW) + GW) % GW;
  gy = Math.max(0, Math.min(GH - 1, gy));
  return _grid[gy * GW + gx];
}

const hexToRgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

export class WorldMap {
  constructor(journal) {
    this.journal = journal;
    this.open = false;
    this.spin = 0;                        // extra rotation the player drags in
    this.tilt = 0;
    this.el = document.createElement('div');
    this.el.id = 'worldmap';
    this.el.className = 'hidden';
    this.el.innerHTML = `
      <div class="wm-inner">
        <div class="wm-head">
          <h2>Hải đồ thế giới</h2>
          <div class="wm-sub" id="wm-sub">—</div>
        </div>
        <canvas id="wm-canvas" width="560" height="560"></canvas>
        <div class="wm-side">
          <div class="wm-pos" id="wm-pos"></div>
          <div class="wm-legend" id="wm-legend"></div>
          <div class="wm-hint">Kéo chuột để xoay địa cầu · <b>N</b> hoặc <b>Esc</b> để đóng</div>
        </div>
      </div>`;
    document.body.appendChild(this.el);
    this.canvas = this.el.querySelector('#wm-canvas');
    this.ctx = this.canvas.getContext('2d');

    // drag to spin
    let dragging = false, lastX = 0, lastY = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.spin += (e.clientX - lastX) * 0.35;
      this.tilt = Math.max(-70, Math.min(70, this.tilt - (e.clientY - lastY) * 0.35));
      lastX = e.clientX; lastY = e.clientY;
      this.draw();
    });
    const stop = () => { dragging = false; };
    this.canvas.addEventListener('pointerup', stop);
    this.canvas.addEventListener('pointercancel', stop);
  }

  toggle(playerPos) {
    this.open ? this.hide() : this.show(playerPos);
    return this.open;
  }

  show(playerPos) {
    this.open = true;
    this.el.classList.remove('hidden');
    this.playerPos = playerPos;
    this.spin = 0; this.tilt = 0;
    if (!_grid) {
      this.el.querySelector('#wm-sub').textContent = 'Đang dựng hải đồ…';
      // let the browser paint the panel before the grid build blocks it
      setTimeout(() => { buildGrid(); this.draw(); }, 16);
    } else {
      this.draw();
    }
  }

  hide() {
    this.open = false;
    this.el.classList.add('hidden');
  }

  draw() {
    if (!_grid || !this.playerPos) return;
    const { lon: plon, lat: plat } = lonLatAt(this.playerPos.x, this.playerPos.z);
    const sea = seaAt(plon, plat);

    const c = this.canvas, ctx = this.ctx;
    const W = c.width, H = c.height;
    const R = Math.min(W, H) * 0.46;
    const cx = W / 2, cy = H / 2;
    // the globe faces the player's position, plus whatever the player dragged
    const lon0 = plon + this.spin;
    const lat0 = Math.max(-80, Math.min(80, plat + this.tilt));
    const rad = Math.PI / 180;
    const sinLat0 = Math.sin(lat0 * rad), cosLat0 = Math.cos(lat0 * rad);

    const img = ctx.createImageData(W, H);
    const d = img.data;
    const colours = {};
    for (const k of _keys) colours[k] = hexToRgb(BIOME_DEF[k].floorColor ?? 0x336699);
    // map colours read better than seabed colours; override the few that matter
    const MAP_COL = {
      coral_reef: [242, 205, 120], kelp_forest: [46, 120, 82], open_ocean: [38, 92, 158],
      polar: [214, 228, 240], deep_sea: [12, 30, 62], mangrove: [116, 88, 52],
      seagrass: [124, 182, 118], blue_hole: [18, 56, 122],
    };
    const landCol = [64, 60, 54];

    for (let py = 0; py < H; py++) {
      const y = (py + 0.5 - cy) / R;
      for (let px = 0; px < W; px++) {
        const x = (px + 0.5 - cx) / R;
        const rho2 = x * x + y * y;
        const o = (py * W + px) * 4;
        if (rho2 > 1) { d[o + 3] = 0; continue; }        // outside the globe
        // inverse orthographic projection
        const rho = Math.sqrt(rho2);
        const cc = Math.asin(Math.min(1, rho));
        const sinC = Math.sin(cc), cosC = Math.cos(cc);
        const lat = Math.asin(cosC * sinLat0 + (rho ? (-y * sinC * cosLat0) / rho : 0)) / rad;
        const lon = lon0 + Math.atan2(x * sinC, rho * cosLat0 * cosC + y * sinLat0 * sinC) / rad;
        const lonW = ((lon + 180) % 360 + 360) % 360 - 180;

        const v = sampleAt(lonW, lat);
        let col = v === LAND ? landCol : (MAP_COL[_keys[v]] || colours[_keys[v]] || [40, 80, 140]);

        // unexplored water is dimmed — the chart fills in as you swim it
        let shade = 1;
        if (v !== LAND && !this.journal.explored(lonW, lat)) shade = 0.42;
        // sphere shading: darken toward the limb so it reads as a ball
        shade *= 0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - rho2));

        d[o] = col[0] * shade;
        d[o + 1] = col[1] * shade;
        d[o + 2] = col[2] * shade;
        d[o + 3] = 255;
      }
    }
    ctx.clearRect(0, 0, W, H);
    ctx.putImageData(img, 0, 0);

    // --- overlays, in globe coordinates ---
    const project = (lon, lat) => {
      const dl = (lon - lon0) * rad, la = lat * rad;
      const cosLa = Math.cos(la), sinLa = Math.sin(la);
      const cosDl = Math.cos(dl);
      const visible = sinLat0 * sinLa + cosLat0 * cosLa * cosDl > 0;
      return {
        x: cx + R * cosLa * Math.sin(dl),
        y: cy - R * (cosLat0 * sinLa - sinLat0 * cosLa * cosDl),
        visible,
      };
    };

    // graticule: equator and the two tropics
    ctx.lineWidth = 1;
    for (const [lat, style] of [[0, 'rgba(255,255,255,0.28)'], [23.5, 'rgba(255,255,255,0.13)'], [-23.5, 'rgba(255,255,255,0.13)']]) {
      ctx.strokeStyle = style;
      ctx.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 2) {
        const p = project(lon, lat);
        if (!p.visible) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // blue holes
    ctx.fillStyle = '#ff5a5a';
    for (const h of BLUE_HOLES) {
      const p = project(h.lon, h.lat);
      if (!p.visible) continue;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
    }

    // the player
    const pp = project(plon, plat);
    if (pp.visible) {
      ctx.strokeStyle = '#ffe6a8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pp.x, pp.y, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffe6a8';
      ctx.beginPath(); ctx.arc(pp.x, pp.y, 2.6, 0, Math.PI * 2); ctx.fill();
    }

    // --- side panel text ---
    const ns = plat >= 0 ? 'B' : 'N', ew = plon >= 0 ? 'Đ' : 'T';
    this.el.querySelector('#wm-sub').textContent = sea.vi;
    this.el.querySelector('#wm-pos').innerHTML = `
      <div class="wm-coord">${Math.abs(plat).toFixed(1)}° ${ns} · ${Math.abs(plon).toFixed(1)}° ${ew}</div>
      <div class="wm-explored">Đã khám phá <b>${this.journal.cells.size}</b> ô biển</div>`;

    const seen = new Set();
    let legend = '';
    for (const k of _keys) {
      if (seen.has(k)) continue; seen.add(k);
      const col = MAP_COL[k] || colours[k];
      legend += `<div class="wm-key"><i style="background:rgb(${col})"></i>${BIOME_DEF[k].label}</div>`;
    }
    legend += `<div class="wm-key"><i style="background:#ff5a5a"></i>Hố xanh</div>`;
    this.el.querySelector('#wm-legend').innerHTML = legend;
  }
}
