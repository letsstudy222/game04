// main.js — Bootstraps the whole game and runs the loop.

import * as THREE from 'three';
import { CONFIG, applyDensity } from './config.js';
import { Input } from './core/input.js';
import { OceanAudio } from './core/audio.js';
import { Ocean } from './world/ocean.js';
import { ChunkManager } from './world/chunkManager.js';
import { Player } from './entities/player.js';
import { SPECIES } from './data/species.js';
import { buildMenu } from './ui/menu.js';
import { HUD } from './ui/hud.js';
import { Journal, ACHIEVEMENTS } from './core/journal.js';
import { Toasts } from './ui/toast.js';
import { renderJournal } from './ui/journalPanel.js';
import { Minimap } from './ui/minimap.js';
import { WorldMap } from './ui/worldmap.js';
import { lonLatAt } from './world/earth.js';
import { seaAt } from './world/seas.js';
import { buildRig } from './core/lighting.js';
import { RIG } from './core/lighting.js';
import { renderEncyclopedia } from './ui/encyclopedia.js';
import { BIOME_DEF } from './world/biomes.js';
import { SPECIES_ORDER } from './data/species.js';

// World seed can come from the URL: ?seed=anything (shareable worlds).
try {
  const urlSeed = new URLSearchParams(location.search).get('seed');
  if (urlSeed) CONFIG.seed = urlSeed.slice(0, 32);
} catch (e) { /* ignore */ }

const canvas = document.getElementById('game');
const menuEl = document.getElementById('menu');
const menuCards = document.getElementById('menu-cards');
const hudEl = document.getElementById('hud');
const hintEl = document.getElementById('hint');
const loadingEl = document.getElementById('loading');

// --- renderer / scene / camera ---
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
// Filmic tone mapping: rolls highlights off gently -> much softer look
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  CONFIG.camera.fov, window.innerWidth / window.innerHeight, CONFIG.camera.near, CONFIG.camera.far
);

// --- lights: the exact rig models are reviewed under (see core/lighting.js) ---
const rig = buildRig(THREE, scene);

const ocean = new Ocean(scene);
// the water's sun and the scene's key light must be the same direction, or
// the specular streak on the surface will not line up with the god rays
ocean.surfaceUniforms.uSunDir.value.set(...RIG.key.dir).normalize();
const chunks = new ChunkManager(scene);
const input = new Input(canvas);
const hud = new HUD(hudEl);

let player = null;
let state = 'menu';   // 'menu' | 'playing' | 'photo'
let clock = new THREE.Clock();

const journal = new Journal();
const toasts = new Toasts(document.getElementById('toasts'));
const journalEl = document.getElementById('journal');
const journalBody = document.getElementById('journal-body');
const minimapEl = document.getElementById('minimap');
const encycEl = document.getElementById('encyclopedia');
const statsEl = document.getElementById('stats');
const minimap = new Minimap(
  document.getElementById('minimap-canvas'),
  (x, z) => chunks.getBiome(x, z)
);
const worldMap = new WorldMap(journal);

// --- menu wiring (rebuilt on each visit so ✓ badges stay fresh) ---
function rebuildMenu() {
  menuCards.innerHTML = '';
  buildMenu(menuCards, startGame, journal);
}
rebuildMenu();

function findSpawn(species) {
  // search for a spot whose biome matches the species' home biome
  const target = species.homeBiome;
  for (let i = 0; i < 400; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 200 + Math.random() * 6000;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (chunks.getBiome(x, z) === target) {
      const floor = chunks.getFloorY(x, z);
      const [dTop, dBot] = species.depth;
      // start comfortably inside the species' range but above the seabed
      const colTop = Math.min(dTop, -species.length * 0.8);
      const colBot = Math.max(dBot, floor + species.length * 2.5);
      let y = colBot > colTop ? colTop : (colTop + colBot) * 0.5;
      y = Math.max(floor + species.length * 2, Math.min(colTop, y));
      return new THREE.Vector3(x, y, z);
    }
  }
  // fallback: origin at a safe depth
  const floor = chunks.getFloorY(0, 0);
  return new THREE.Vector3(0, Math.max(floor + species.length * 2, species.depth[0]), 0);
}

function startGame(speciesId) {
  const species = SPECIES[speciesId];
  loadingEl.classList.remove('hidden');
  menuEl.classList.add('hidden');

  // let the browser paint the loading screen before heavy chunk build
  setTimeout(() => {
    const start = findSpawn(species);
    chunks.clearAll();
    chunks.primeAround(start);
    player = new Player(species, camera, input, start);
    scene.add(player.mesh);
    hud.setSpecies(species);

    loadingEl.classList.add('hidden');
    hudEl.classList.remove('hidden');
    minimapEl.classList.remove('hidden');
    minimap.invalidate();
    hintEl.classList.remove('hidden');
    setTimeout(() => hintEl.classList.add('fade'), 6000);
    state = 'playing';
    clock.getDelta(); // reset dt

    // journal: playing as a species counts as meeting it
    if (journal.meet(speciesId)) {
      toasts.show(`🐟 Ghi nhận loài mới: <b>${species.viet}</b>`);
    }
    const startBiome = chunks.getBiome(start.x, start.z);
    if (journal.visit(startBiome)) {
      toasts.show(`🌊 Khám phá vùng mới: <b>${BIOME_DEF[startBiome].label}</b>`);
    }
  }, 60);
}

function returnToMenu() {
  state = 'menu';
  if (player) { scene.remove(player.mesh); player = null; }
  chunks.clearAll();
  hudEl.classList.add('hidden');
  minimapEl.classList.add('hidden');
  hintEl.classList.add('hidden');
  hintEl.classList.remove('fade');
  journalEl.classList.add('hidden');
  encycEl.classList.add('hidden');
  rebuildMenu();
  menuEl.classList.remove('hidden');
  document.exitPointerLock?.();
}

// --- world seed input (menu) ---
const seedInput = document.getElementById('seed-input');
const seedBtn = document.getElementById('seed-btn');
seedInput.value = CONFIG.seed;
function applySeed() {
  const v = (seedInput.value || '').trim().slice(0, 32) || 'blue-planet-01';
  if (v === CONFIG.seed) return;
  CONFIG.seed = v;
  chunks.setSeed(v);
  minimap.invalidate();
  chunks.primeAround(new THREE.Vector3(0, -8, 0));   // rebuild menu backdrop
  try {
    history.replaceState(null, '', location.pathname + '?seed=' + encodeURIComponent(v));
  } catch (e) { /* file:// etc. */ }
  toasts.show(`🌍 Thế giới mới — seed: <b>${v}</b>`);
}
seedBtn.addEventListener('click', applySeed);
seedInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applySeed(); });

// --- encyclopedia (key E) ---
function drawEncyc() { renderEncyclopedia(encycEl, journal, drawEncyc); }
function toggleEncyc() {
  if (encycEl.classList.contains('hidden')) {
    drawEncyc();
    encycEl.classList.remove('hidden');
  } else {
    encycEl.classList.add('hidden');
  }
}
encycEl.addEventListener('click', (e) => { if (e.target === encycEl) toggleEncyc(); });

// --- creature density selector ---
const densitySel = document.getElementById('density-select');
densitySel.addEventListener('change', () => {
  applyDensity(densitySel.value);
  chunks.clearAll();
  minimap.invalidate();
  chunks.primeAround(new THREE.Vector3(0, -8, 0));
  toasts.show(`🐠 Mật độ sinh vật: <b>${densitySel.options[densitySel.selectedIndex].text}</b>`);
});

// --- journal panel (key J) ---
function toggleJournal() {
  if (journalEl.classList.contains('hidden')) {
    renderJournal(journalBody, journal);
    journalEl.classList.remove('hidden');
  } else {
    journalEl.classList.add('hidden');
  }
}
journalEl?.addEventListener('click', (e) => { if (e.target === journalEl) toggleJournal(); });
minimapEl?.addEventListener('click', () => toggleWorldMap());

// The chart needs the cursor, but swimming holds a pointer lock. Releasing it
// on open and asking for it back on close is what makes the map clickable.
function toggleWorldMap() {
  if (!player || (state !== 'playing' && state !== 'photo')) return;
  if (worldMap.open) {
    worldMap.hide();
    canvas.requestPointerLock?.();
  } else {
    document.exitPointerLock?.();
    worldMap.show(player.position);
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyN') { toggleWorldMap(); return; }
  if (e.code === 'Escape' && worldMap.open) { toggleWorldMap(); return; }
  if (e.code === 'KeyM' && (state === 'playing' || state === 'photo')) returnToMenu();
  if (e.code === 'KeyB') toggleSound();
  if (e.code === 'KeyJ') toggleJournal();
  if (e.code === 'KeyE') toggleEncyc();
  if (e.code === 'KeyG') statsEl.classList.toggle('hidden');
  if (e.code === 'KeyF' && player && (state === 'playing' || state === 'photo')) {
    const on = player.toggleFirstPerson();
    toasts.show(on ? '👁 Góc nhìn thứ nhất — nhấn <b>F</b> để quay lại'
                   : '🎥 Góc nhìn thứ ba', 2600);
  }
});

// --- ambient sound ---
const audio = new OceanAudio();
const soundBtn = document.getElementById('sound-btn');
function toggleSound() {
  const on = audio.toggle();
  soundBtn.textContent = on ? '🔊' : '🔇';
  soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
}
soundBtn.addEventListener('click', toggleSound);

// --- resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- adaptive quality: step down if the machine can't hold framerate ---
let fpsN = 0, fpsT = 0, qualityTier = 2;
let shownFps = 60, statsT = 0;

function drawStats(dt, pos) {
  statsT += dt;
  if (statsT < 0.25 || statsEl.classList.contains('hidden')) return;
  statsT = 0;
  const cls = shownFps >= 50 ? 'good' : (shownFps >= 30 ? 'warn' : 'bad');
  const info = renderer.info;
  statsEl.innerHTML = `
    <div>FPS <b class="${cls}">${shownFps.toFixed(0)}</b></div>
    <div>Tam giác <b>${(info.render.triangles / 1000).toFixed(0)}k</b></div>
    <div>Lệnh vẽ <b>${info.render.calls}</b></div>
    <div>Sinh vật <b>${chunks.liveCreatures ?? 0}</b></div>
    <div>Chunk <b>${chunks.loaded.size}</b></div>
    <div>Chi tiết đầy đủ <b>${CONFIG.perf.fullDetailCreatures}</b></div>`;
}
function adaptQuality(dt) {
  fpsN++; fpsT += dt;
  if (fpsT < 0.5) return;
  const fps = fpsN / fpsT;
  shownFps = fps;
  fpsN = 0; fpsT = 0;
  if (fps < 38 && qualityTier === 2) {
    qualityTier = 1;
    renderer.setPixelRatio(1);                    // cheapest big win
  } else if (fps < 30 && qualityTier === 1) {
    qualityTier = 0;
    CONFIG.chunk.renderRadius = Math.min(CONFIG.chunk.renderRadius, 2);
    CONFIG.perf.maxCreatures = Math.min(CONFIG.perf.maxCreatures, 80);
    chunks._lastChunk = null;                     // force ring rebuild
  }
}

// --- day/night cycle (full cycle = 6 minutes, starts at noon) ---
const DAY_LENGTH = 360; // seconds
function daylightAt(t) {
  // 1 at noon -> 0 at midnight, smooth cosine
  const phase = (t / DAY_LENGTH) * Math.PI * 2;
  return THREE.MathUtils.clamp(0.5 + 0.5 * Math.cos(phase), 0.04, 1);
}

// --- photo mode: orbiting camera, UI hidden ---
let photoAngle = 0;
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyP') return;
  if (state === 'playing') {
    state = 'photo';
    hudEl.classList.add('hidden');
    minimapEl.classList.add('hidden');
    hintEl.classList.add('hidden');
  } else if (state === 'photo') {
    state = 'playing';
    hudEl.classList.remove('hidden');
    minimapEl.classList.remove('hidden');
  }
});

// --- discovery detection (throttled, cheap) ---
let discoverTimer = 0;
let lastBiome = null;
function unlockAch(id) {
  if (journal.unlock(id)) {
    toasts.show(`🏆 Danh hiệu mới: <b>${ACHIEVEMENTS[id].viet}</b>`, 5200);
  }
}

let lastSea = null;
function checkDiscoveries(dt, pos, biome) {
  // Fill in the chart as you swim, and announce a sea the first time you enter
  // it — on a real Earth "which water is this" is a more meaningful landmark
  // than which habitat type happens to be underneath.
  const { lon, lat } = lonLatAt(pos.x, pos.z);
  journal.explore(lon, lat);
  const sea = seaAt(lon, lat);
  if (sea.vi !== lastSea) {
    lastSea = sea.vi;
    toasts.show(`🧭 <b>${sea.vi}</b>`, 3200);
  }

  // biome first-visit
  if (biome !== lastBiome) {
    lastBiome = biome;
    if (journal.visit(biome)) {
      toasts.show(`🌊 Khám phá vùng mới: <b>${BIOME_DEF[biome].label}</b>`);
    }
    if (journal.biomes.size >= Object.keys(BIOME_DEF).length) unlockAch('all_biomes');
  }
  // depth milestone
  if (-pos.y > 500) unlockAch('abyss');

  // species + wreck proximity, every 0.5 s
  discoverTimer += dt;
  if (discoverTimer < 0.5) return;
  discoverTimer = 0;
  for (const c of chunks.allCreatures()) {
    const id = c.species.id;
    if (journal.met.has(id)) continue;
    const near = Math.max(15, c.species.length * 3 + 8);   // big animals seen from afar
    if (c.mesh.position.distanceToSquared(pos) < near * near) {
      journal.meet(id);
      toasts.show(`🐟 Ghi nhận loài mới: <b>${c.species.viet}</b>`);
      if (journal.met.size >= SPECIES_ORDER.length) unlockAch('all_species');
    }
  }
  for (const w of chunks.wrecks) {
    if (w.pos.distanceToSquared(pos) < 34 * 34) { unlockAch('wreck'); break; }
  }
}

// --- main loop ---
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;
  if (dt > 0) adaptQuality(dt);

  const daylight = daylightAt(time);
  rig.setDaylight(daylight);

  if (state === 'playing' && player) {
    player.update(dt, (x, z) => chunks.getFloorY(x, z));
    const pos = player.position;
    const biome = chunks.getBiome(pos.x, pos.z);
    const playerInfo = { pos, length: player.species.length, id: player.species.id };
    chunks.update(dt, time, pos, playerInfo);
    ocean.update(dt, time, pos, biome, daylight);
    hud.update(pos, biome, player.yaw, player.pitch);
    minimap.update(pos, player.yaw);
    checkDiscoveries(dt, pos, biome);
    drawStats(dt, pos);
  } else if (state === 'photo' && player) {
    // slow cinematic orbit around the fish
    photoAngle += dt * 0.22;
    const pos = player.position;
    const r = player.camDist * 1.9 + 0.6;
    camera.position.set(
      pos.x + Math.cos(photoAngle) * r,
      pos.y + player.camHigh * 1.1,
      pos.z + Math.sin(photoAngle) * r
    );
    camera.lookAt(pos);
    player.idleAnimate(dt);
    const biome = chunks.getBiome(pos.x, pos.z);
    chunks.update(dt, time, pos);
    ocean.update(dt, time, pos, biome, daylight);
  } else {
    // gentle idle camera drift on the menu
    ocean.update(dt, time, new THREE.Vector3(0, -8, 0), 'coral_reef', daylight);
  }

  renderer.render(scene, camera);
}

// prime an idle menu scene so the background isn't empty
chunks.primeAround(new THREE.Vector3(0, -8, 0));
camera.position.set(0, -6, 30);
camera.lookAt(0, -12, 0);
loadingEl.classList.add('hidden');
animate();
