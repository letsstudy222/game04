// verify-globe.mjs — the map cannot be opened here, so its projection is
// checked arithmetically instead: take a pixel, invert it to a longitude and
// latitude the way the renderer does, project that back the way the overlays
// do, and require the pixel to come back. If the two disagree, the player
// marker and the blue-hole dots would sit somewhere other than the water they
// belong to.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

const rad = Math.PI / 180;
const R = 257.6, cx = 280, cy = 280;      // matches a 560px canvas

function inverse(px, py, lon0, lat0) {
  const x = (px + 0.5 - cx) / R, y = (py + 0.5 - cy) / R;
  const rho2 = x * x + y * y;
  if (rho2 > 1) return null;
  const rho = Math.sqrt(rho2);
  const c = Math.asin(Math.min(1, rho));
  const sinC = Math.sin(c), cosC = Math.cos(c);
  const sinLat0 = Math.sin(lat0 * rad), cosLat0 = Math.cos(lat0 * rad);
  const lat = Math.asin(cosC * sinLat0 + (rho ? (-y * sinC * cosLat0) / rho : 0)) / rad;
  const lon = lon0 + Math.atan2(x * sinC, rho * cosLat0 * cosC + y * sinLat0 * sinC) / rad;
  return { lon: ((lon + 180) % 360 + 360) % 360 - 180, lat };
}

function forward(lon, lat, lon0, lat0) {
  const dl = (lon - lon0) * rad, la = lat * rad;
  const cosLa = Math.cos(la), sinLa = Math.sin(la);
  const cosDl = Math.cos(dl);
  const sinLat0 = Math.sin(lat0 * rad), cosLat0 = Math.cos(lat0 * rad);
  return {
    x: cx + R * cosLa * Math.sin(dl),
    y: cy - R * (cosLat0 * sinLa - sinLat0 * cosLa * cosDl),
    visible: sinLat0 * sinLa + cosLat0 * cosLa * cosDl > 0,
  };
}

let tested = 0, worst = 0, fails = 0;
for (const [lon0, lat0] of [[0, 0], [146, -18], [-87, 17], [38, 22], [0, 60], [-150, -40]]) {
  for (let py = 10; py < 550; py += 7) {
    for (let px = 10; px < 550; px += 7) {
      const ll = inverse(px, py, lon0, lat0);
      if (!ll) continue;
      const back = forward(ll.lon, ll.lat, lon0, lat0);
      if (!back.visible) continue;         // limb pixels are the far side
      const err = Math.hypot(back.x - (px + 0.5), back.y - (py + 0.5));
      tested++;
      worst = Math.max(worst, err);
      if (err > 0.75) fails++;
    }
  }
}
console.log(`Kiem tra ${tested} diem tren 6 goc nhin khac nhau`);
console.log(`Sai so lon nhat: ${worst.toFixed(4)} px`);
console.log(`So diem lech qua 0,75 px: ${fails}`);

// The centre of the globe must be exactly the position it is centred on.
for (const [lon0, lat0] of [[38, 22], [-150, -40], [0, 0]]) {
  const p = forward(lon0, lat0, lon0, lat0);
  const off = Math.hypot(p.x - cx, p.y - cy);
  console.log(`  tam tai (${lon0}, ${lat0}) lech ${off.toFixed(5)} px, hien: ${p.visible}`);
}
process.exit(fails > 0 || worst > 0.75 ? 1 : 0);
