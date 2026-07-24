// verify-water.mjs — the shader cannot be compiled here, so its arithmetic is
// re-implemented and swept instead. A shader that returns NaN or a negative
// alpha does not throw; it renders a black hole in the sky, and there is no way
// to notice that from Node except by checking the numbers.
import { fileURLToPath } from 'url';
import path from 'path';
process.chdir(path.dirname(fileURLToPath(import.meta.url)));
import fs from 'fs';

const src = fs.readFileSync('../src/world/waterShader.js', 'utf8');
let fail = 0;

/* ---- 1. structural checks on the GLSL itself ---------------------------- */
const need = [
  ['waveField', 'ham song dung chung cho ca vi tri lan phap tuyen'],
  ['vFold', 'Jacobian gap song -> bot'],
  ['rippleNormal', 'gon song duoi do phan giai luoi'],
  ['sss', 'tan xa duoi be mat'],
  ['rim', 'vien tan sac o mep cua so Snell'],
];
console.log('  Thanh phan shader:');
for (const [k, why] of need) {
  const ok = src.includes(k);
  if (!ok) fail++;
  console.log(`    ${ok ? 'co ' : 'THIEU'} ${k.padEnd(14)} ${why}`);
}
// moi wave train phai nam trong waveField, khong duoc lap lai o cho khac
const gerstnerCalls = (src.match(/gerstner\(xz/g) || []).length;
const inField = (src.match(/o \+= gerstner/g) || []).length;
console.log(`\n  Loi cu: song thu 4 co trong vi tri nhung THIEU trong phap tuyen.`);
console.log(`    goi gerstner ngoai waveField: ${gerstnerCalls - inField} (phai la 0)`);
if (gerstnerCalls - inField !== 0) fail++;

/* ---- 2. sweep the maths for NaN and out-of-range ------------------------ */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fract = (x) => x - Math.floor(x);

function hash22(x, y) {
  const a = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  const b = Math.sin(x * 269.5 + y * 183.3) * 43758.5453123;
  return [-1 + 2 * fract(a), -1 + 2 * fract(b)];
}
function gnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const d = (cx, cy) => { const h = hash22(ix + cx, iy + cy); return h[0] * (fx - cx) + h[1] * (fy - cy); };
  const a = d(0, 0) + (d(1, 0) - d(0, 0)) * ux;
  const b = d(0, 1) + (d(1, 1) - d(0, 1)) * ux;
  return a + (b - a) * uy;
}

// The wave field itself, so `fold` and `crest` come from the real
// distribution instead of a uniform guess. Foam looked like it covered half
// the sea when fold was sampled uniformly; almost all real sea is unbroken.
function gerstner(px, pz, dx, dz, steep, wl, t, speed) {
  const k = 6.28318530718 / wl;
  const c = Math.sqrt(9.81 / k) * speed;
  const dl = Math.hypot(dx, dz);
  const ux = dx / dl, uz = dz / dl;
  const f = k * (ux * px + uz * pz - c * t);
  const a = steep / k;
  return [ux * a * Math.cos(f), a * Math.sin(f), uz * a * Math.cos(f)];
}
const TRAINS = [
  [1.0, 0.35, 0.62, 62.0, 1.00], [-0.6, 1.0, 0.44, 31.0, 1.15],
  [0.8, -0.75, 0.32, 17.0, 1.30], [-0.3, -1.0, 0.22, 11.0, 1.60],
  [0.55, 0.9, 0.16, 7.5, 1.85],
];
function waveField(px, pz, t) {
  let o = [0, 0, 0];
  for (const [dx, dz, s, wl, sp] of TRAINS) {
    const g = gerstner(px, pz, dx, dz, s, wl, t, sp);
    o[0] += g[0]; o[1] += g[1]; o[2] += g[2];
  }
  return o;
}

let bad = 0, nan = 0, alphaMin = 9, alphaMax = -9, colMax = 0, foamHits = 0, sssHits = 0;
let foldMax = 0, crestMin = 9, crestMax = -9, hMin = 9, hMax = -9;
let foamSum = 0, foamVisible = 0;
const N = 60000;
const e = 4.0;
for (let i = 0; i < N; i++) {
  const x = (Math.random() - 0.5) * 4000, z = (Math.random() - 0.5) * 4000;
  const t = Math.random() * 500;
  const daylight = Math.random();

  const o = waveField(x, z, t);
  const px = x + o[0], py = o[1], pz = z + o[2];
  const oa = waveField(x + e, z, t), ob = waveField(x, z + e, t);
  const ax = (x + e + oa[0]) - px, az = (z + oa[2]) - pz;
  const bx = (x + ob[0]) - px, bz = (z + e + ob[2]) - pz;
  const dxdx = 1.0 + (ax - e) / e;
  const dzdz = 1.0 + (bz - e) / e;
  const fold = clamp(1.0 - dxdx * dzdz, 0, 1);
  const crest = clamp(py * 0.55 + 0.5, 0, 1);
  foldMax = Math.max(foldMax, fold);
  crestMin = Math.min(crestMin, crest); crestMax = Math.max(crestMax, crest);
  hMin = Math.min(hMin, py); hMax = Math.max(hMax, py);

  const foamN = gnoise(x * 0.55 + t * 0.25, z * 0.55 + t * 0.11) * 0.5 + 0.5;
  let foam = smoothstep(0.66, 0.90, fold) * smoothstep(0.35, 0.80, foamN);
  foam = clamp(foam + smoothstep(0.955, 1.0, crest) * 0.30 * foamN, 0, 1);
  // Counting "any trace of foam" said a quarter of the sea was white when the
  // real whiteness was 8%. The honest measures are the MEAN (how much white
  // there actually is) and how much of it is strong enough to see.
  foamSum += foam;
  if (foam > 0.40) foamVisible++;
  if (foam > 0.15) foamHits++;

  const vd = Math.random() * 2 - 1;
  const sss = Math.pow(clamp(vd * 0.5 + 0.5, 0, 1), 3) * smoothstep(0.35, 0.95, crest);
  if (sss > 0.1) sssHits++;

  const alphaAbove = 0.86 + (0.97 - 0.86) * foam;
  const up = Math.random();
  const wob = gnoise(x * 0.06 + t * 0.15, z * 0.06) * 0.05;
  const win = smoothstep(0.60 + wob, 0.80 + wob, up);
  const alphaBelow = 0.42 + (0.82 - 0.42) * win;

  for (const a of [alphaAbove, alphaBelow]) {
    if (!isFinite(a)) nan++;
    else { if (a < 0 || a > 1) bad++; alphaMin = Math.min(alphaMin, a); alphaMax = Math.max(alphaMax, a); }
  }
  const c = 0.9 * (0.30 + 0.70 * daylight) + foam * 0.85 + sss * 0.9;
  if (!isFinite(c)) nan++; else colMax = Math.max(colMax, c);
}

console.log(`\n  Quet ${N} diem tren TRUONG SONG THAT:`);
console.log(`    do cao song       : ${hMin.toFixed(2)} .. ${hMax.toFixed(2)} m`);
console.log(`    do gap lon nhat   : ${foldMax.toFixed(3)}  (1.0 = song do)`);
console.log(`    NaN / Inf         : ${nan}`);
console.log(`    alpha ngoai [0,1] : ${bad}`);
console.log(`    alpha thuc te     : ${alphaMin.toFixed(3)} .. ${alphaMax.toFixed(3)}`);
console.log(`    mau sang nhat     : ${colMax.toFixed(2)}`);
console.log(`    bot trung binh    : ${(foamSum / N * 100).toFixed(1)}%  <- ti le trang THUC SU (bien that: 2-10%)`);
console.log(`    thay ro trang     : ${(foamVisible / N * 100).toFixed(1)}%  (dinh song do)`);
console.log(`    co dau vet bot    : ${(foamHits / N * 100).toFixed(1)}%  (khong phai do trang, chi la co gia tri)`);
console.log(`    diem co SSS       : ${(sssHits / N * 100).toFixed(1)}%`);
if (nan || bad) fail++;
if (foamSum / N > 0.14) { console.log('    -> bot qua nhieu, mat bien bac trang'); fail++; }
if (foamSum / N < 0.01) { console.log('    -> gan nhu khong co bot'); fail++; }
if (colMax > 6) { console.log('    -> mau chay trang'); fail++; }

/* ---- 3. mesh resolution against the wave trains ------------------------- */
const m = src.match(/makeWaterSurface\(size = (\d+), segs = (\d+)\)/);
const size = +m[1], segs = +m[2], q = size / segs;
const trains = [...src.matchAll(/gerstner\(xz[^)]*\),\s*[\d.]+,\s*([\d.]+)/g)].map((r) => +r[1]);
const geoTrains = [...new Set(trains)].filter((wl) => wl / q >= 2);
console.log(`\n  Luoi ${size} m / ${segs} = ${q.toFixed(2)} m moi o`);
console.log(`    song phan giai duoc bang hinh hoc: ${geoTrains.join(', ')} m`);
console.log(`    song min hon -> rippleNormal o fragment (khong the alias)`);
if (geoTrains.length < 3) { console.log('    LOI: qua it song hien duoc'); fail++; }
// tam nhin xa nhat trong game la 736 m (bien trong nhat)
if (size / 2 < 736) { console.log(`    LOI: nua chieu rong ${size / 2} m < tam nhin 736 m, se thay mep`); fail++; }
else console.log(`    nua chieu rong ${size / 2} m > tam nhin xa nhat 736 m: khong lo mep`);

console.log(`\n  Tam giac mat nuoc: ${(segs * segs * 2).toLocaleString()}`);
process.exit(fail ? 1 : 0);
