// main.js — Bootstraps the whole game and runs the loop.

import * as THREE from 'three';
import { CONFIG, applyDensity, QUALITY_TIERS } from './config.js';
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
import { SchoolManager } from './entities/school.js';
import { FrenzyManager } from './entities/baitball.js';
import { ScatteringLayer } from './world/dsl.js';
import { Creature } from './entities/creature.js';
import { lonLatAt, worldAt } from './world/earth.js';
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
// MSAA and a HiDPI backbuffer are the same tool bought twice. On a 2x display
// the backbuffer is already supersampling; paying for MSAA on top of it is
// what put an integrated GPU into the 20-30 FPS band on an empty seabed.
const _dpr = window.devicePixelRatio || 1;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: _dpr < 1.5 });
renderer.setPixelRatio(Math.min(_dpr, CONFIG.perf.pixelRatioCap));
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

// Migrating shoals. The world is geographically honest, so about half of any
// swim is open water — measured at two and a half minutes of nothing between
// anything worth seeing. These are what goes in that gap.
const schools = new SchoolManager(scene, worldAt, (name, count) => {
  toasts.show(`\u{1F41F} <b>${name}</b> — khoảng ${count} con đang đi ngang`, 5000);
});

// Feeding frenzies. Nothing here can touch you — you watch.
// The deep scattering layer: a band of motes that climbs at dusk and sinks at
// dawn, with the animals that eat it following.
const scattering = new ScatteringLayer(scene);

const frenzy = new FrenzyManager(scene, () => {
  toasts.show('\u{1F30A} <b>Tiệc săn mồi</b> — quả cầu cá mồi đang bị xé, nhìn quanh xem', 5200);
});

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
  schools.clear();
  frenzy.clear();
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
  if (e.repeat || e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
  if (e.code === 'KeyN') { toggleWorldMap(); return; }
  if (e.code === 'Escape' && worldMap.open) { toggleWorldMap(); return; }
  if (e.code === 'KeyM' && (state === 'playing' || state === 'photo')) returnToMenu();
  if (e.code === 'KeyB') toggleSound();
  if (e.code === 'KeyJ') toggleJournal();
  if (e.code === 'KeyE') toggleEncyc();
  if (e.code === 'KeyG') statsEl.classList.toggle('hidden');
  if (e.code === 'KeyR' && player && (state === 'playing' || state === 'photo')) {
    const on = player.toggleCamLock();
    toasts.show(on ? '🔒 Khoá góc camera — nhấn <b>R</b> để thả'
                   : '🔓 Camera bám theo trở lại', 2600);
  }
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

// --- adaptive quality: steps DOWN when the machine struggles and back UP when
// it recovers. The previous version only ever stepped down and never restored,
// so a single half-second stall — a chunk build, an alt-tab, a garbage
// collection — permanently locked the session into the lowest tier. Players
// then judged the game on graphics it was never meant to ship with.
let fpsN = 0, fpsT = 0;
let tierIndex = 0;                       // 0 = highest, see QUALITY_TIERS
let tierCooldown = 0;                    // seconds before another change
let shownFps = 60, statsT = 0;

function applyTier(i) {
  const t = QUALITY_TIERS[Math.max(0, Math.min(QUALITY_TIERS.length - 1, i))];
  tierIndex = QUALITY_TIERS.indexOf(t);
  const cap = t.pixelRatio === null ? CONFIG.perf.pixelRatioCap : t.pixelRatio;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  CONFIG.perf.maxCreatures = t.maxCreatures;
  CONFIG.perf.fullDetailCreatures = t.fullDetail;
  CONFIG.perf.causticStrength = t.caustics;
  if (CONFIG.chunk.renderRadius !== t.renderRadius) {
    CONFIG.chunk.renderRadius = t.renderRadius;
    chunks._lastChunk = null;            // force the ring to rebuild
  }
  tierCooldown = 4;                      // let the change settle before judging
}

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
    <div>Chi tiết đầy đủ <b>${CONFIG.perf.fullDetailCreatures}</b></div>
    <div>Chất lượng <b>${QUALITY_TIERS[tierIndex].name}</b></div>`;
}
function adaptQuality(dt) {
  fpsN++; fpsT += dt;
  if (tierCooldown > 0) tierCooldown -= dt;
  if (fpsT < 1.0) return;                         // a full second, not half:
  const fps = fpsN / fpsT;                        // half a second is short
  shownFps = fps;                                 // enough to be one hitch
  fpsN = 0; fpsT = 0;
  if (tierCooldown > 0) return;

  // Wide dead band between the two thresholds. Stepping down at 34 and up at
  // 55 means a machine sitting at 45 FPS stays where it is instead of
  // oscillating between tiers every few seconds, which reads as flickering.
  if (fps < 34 && tierIndex < QUALITY_TIERS.length - 1) applyTier(tierIndex + 1);
  else if (fps > 55 && tierIndex > 0) applyTier(tierIndex - 1);
}

// --- day/night cycle ---
// A raw cosine day has a mean of 0.5, and ocean.js multiplies the water tint
// by (0.22 + 0.78 * daylight). At the old six-minute cycle that meant the
// average frame rendered the sea at 61% of its intended colour and the player
// saw the light the art was tuned for for about thirty seconds out of every
// six minutes. Two changes: a much longer cycle, and a bias curve that spends
// most of it in usable light. Night still happens — it is just an event you
// swim into rather than the default state of the world.
function daylightAt(t) {
  const { dayLength, dayBias, nightFloor, startPhase } = CONFIG.time;
  const phase = ((t / dayLength) + startPhase) * Math.PI * 2;
  const raw = 0.5 + 0.5 * Math.cos(phase);          // 0..1, cosine day
  // pow with an exponent < 1 lifts the middle of the curve without touching
  // either end: noon stays 1, midnight stays 0, dusk stops being a brownout.
  const shaped = Math.pow(raw, 1 - THREE.MathUtils.clamp(dayBias, 0, 0.9));
  return THREE.MathUtils.clamp(shaped, nightFloor, 1);
}

// --- photo mode: orbiting camera, UI hidden ---
let photoAngle = 0;
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyP' || e.repeat || e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
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
let lastCurrent = null;
function checkDiscoveries(dt, pos, biome) {
  // Entering a current is the most useful thing that can happen in open water,
  // so it gets announced the way a new sea does.
  const cur = player?.current || null;
  if (cur !== lastCurrent) {
    lastCurrent = cur;
    if (cur) toasts.show(`\u{1F30A} Bạn vào <b>${cur}</b> — thả người trôi theo`, 4200);
  }

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

  // Landmarks: rare, fixed places worth swimming to. Reported out of buildChunk
  // rather than read off the meshes, because merging strips their userData.
  for (const L of chunks.landmarks) {
    const d = Math.hypot(pos.x - L.x, pos.y - L.y, pos.z - L.z);
    if (d > 55) continue;
    if (L.kind === 'whale_fall' && journal.unlock('whale_fall')) {
      toasts.show('\u{1F40B} <b>Xác cá voi</b> — một thân xác nuôi cả quần xã dưới đáy hàng chục năm', 6000);
    } else if (L.kind === 'cleaning' && journal.unlock('cleaning')) {
      toasts.show('\u{1F41F} <b>Trạm vệ sinh</b> — nơi duy nhất kẻ săn mồi đứng yên cạnh con mồi', 6000);
    }
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
  const dt = Math.min(0.1, clock.getDelta());
  input.setEnabled(state === 'playing' && !worldMap.open
    && journalEl.classList.contains('hidden') && encycEl.classList.contains('hidden'));
  time += dt;
  if (dt > 0) adaptQuality(dt);

  const daylight = daylightAt(time);
  Creature.daylight = daylight;
  rig.setDaylight(daylight);

  if (state === 'playing' && player) {
    player.update(dt, (x, z) => chunks.getFloorY(x, z));
    const pos = player.position;
    const biome = chunks.getBiome(pos.x, pos.z);
    const playerInfo = { pos, length: player.species.length, id: player.species.id };
    chunks.update(dt, time, pos, playerInfo);
    schools.update(dt, time, pos);
    frenzy.update(dt, time, pos, biome);
    scattering.update(dt, time, pos, daylight);
    ocean.update(dt, time, pos, biome, daylight, player?.currentVec || null);
    hud.update(pos, biome, player.yaw, player.pitch, player?.current || null, player?.currentStrength || 0);
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
    ocean.update(dt, time, pos, biome, daylight, player?.currentVec || null);
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
