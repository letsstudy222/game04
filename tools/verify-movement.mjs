// Behavioral regressions for swim controls; physics is tested independently of
// rendering cost. The existing game-loop and browser checks cover animation.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/entities/player.js';
import { SPECIES } from '../src/data/species.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  OK ${name}`); };
function swimmer(id = 'clownfish', start = new THREE.Vector3(0, -300, 0)) {
  const input = {
    keys: new Set(), mouse: [0, 0], wheel: 0,
    down(code) { return this.keys.has(code); },
    consumeMouse() { const m = this.mouse; this.mouse = [0, 0]; return m; },
    consumeWheel() { const w = this.wheel; this.wheel = 0; return w; },
  };
  const player = new Player(SPECIES[id], new THREE.PerspectiveCamera(60, 1.5, 0.1, 4000), input, start);
  player.mesh._lod = 3;
  return player;
}
const floor = () => -1000;
function run(p, seconds, fps = 60, keys = [], mousePerSecond = [0, 0], ground = floor) {
  p.input.keys = new Set(keys);
  for (let i = 0; i < Math.ceil(seconds * fps); i++) {
    const dt = Math.min(1 / fps, seconds - i / fps);
    p.input.mouse = mousePerSecond.map(v => v * dt);
    p.update(dt, ground);
  }
}
function finite(p) {
  for (const v of [...p.position.toArray(), ...p.vel.toArray(), ...p.camera.position.toArray(), ...p.mesh.quaternion.toArray()]) assert(Number.isFinite(v));
}

for (const id of ['clownfish', 'blue_whale']) {
  test(`${id}: keyboard, mouse, travel and banking agree at 15/30/60/120/144 FPS`, () => {
    const reference = swimmer(id);
    run(reference, 2, 120, ['KeyW', 'KeyA'], [-160, -45]);
    run(reference, 0.5, 120);
    for (const fps of [15, 30, 60, 144]) {
      const p = swimmer(id);
      run(p, 2, fps, ['KeyW', 'KeyA'], [-160, -45]);
      run(p, 0.5, fps);
      assert(Math.abs(p.yaw - reference.yaw) < 0.002, `yaw differs at ${fps} FPS`);
      assert(Math.abs(p.pitch - reference.pitch) < 0.002, `pitch differs at ${fps} FPS`);
      assert(p.position.distanceTo(reference.position) < 0.03, `travel differs at ${fps} FPS`);
      assert(Math.abs(p.roll - reference.roll) < 0.006, `bank differs at ${fps} FPS`);
      finite(p);
    }
  });
}

test('release coasts smoothly; S brakes faster, then reverses', () => {
  const coast = swimmer(), brake = swimmer();
  run(coast, 2, 60, ['KeyW']); run(brake, 2, 60, ['KeyW']);
  const speed = coast.vel.length();
  run(coast, 0.3); run(brake, 0.3, 60, ['KeyS']);
  assert(coast.vel.length() > speed * 0.5 && coast.vel.length() < speed);
  assert(brake.vel.z < coast.vel.z * 0.3);
  run(brake, 1, 60, ['KeyS']);
  assert(brake.vel.z < -brake.cruise * 0.3);
});

test('vertical + forward input cannot exceed boosted cruise speed', () => {
  const p = swimmer();
  run(p, 2, 60, ['KeyW', 'Space', 'ShiftLeft']);
  assert(p.vel.length() <= p.cruise * 2.6 + 1e-6);
  assert(p.vel.y > 0);
});

test('opposing controls cancel and right Control descends', () => {
  const p = swimmer();
  run(p, 0.5, 60, ['KeyW', 'KeyS', 'Space', 'KeyC', 'KeyA', 'KeyD']);
  assert(p.vel.length() < 1e-8 && Math.abs(p.yaw) < 1e-8);
  run(p, 0.5, 60, ['ControlRight']); assert(p.vel.y < 0);
});

test('upward swimming also points the visible body upward', () => {
  const p = swimmer();
  run(p, 1, 60, ['KeyW', 'ArrowUp']);
  assert(p.vel.y > 0);
  const nose = new THREE.Vector3(0, 0, 1).applyQuaternion(p.mesh.quaternion);
  assert(nose.y > 0.3, 'model pitch must match travel pitch');
});

test('seafloor assist clears a rising slope and camera remains above terrain', () => {
  const p = swimmer('clownfish', new THREE.Vector3(0, -4.8, 0));
  const slope = (x, z) => -5 + Math.max(0, z) * 0.35;
  let lifted = false;
  for (let i = 0; i < 240; i++) {
    p.input.keys = new Set(['KeyW']); p.update(1 / 60, slope);
    assert(p.position.y >= slope(p.position.x, p.position.z) + p.clearance - 1e-6);
    assert(p.camera.position.y >= slope(p.camera.position.x, p.camera.position.z) + 0.18 - 1e-6);
    if (p.vel.y > 0.01) lifted = true;
    finite(p);
  }
  assert(lifted && p.position.z > 1);
});

test('surface and seabed contain vertical movement at different frame rates', () => {
  for (const fps of [15, 30, 60, 144]) {
    const p = swimmer('clownfish', new THREE.Vector3(0, -0.1, 0));
    run(p, 2, fps, ['Space'], [0, 0], () => -2);
    assert(p.position.y <= p.species.length * 0.12 * 0.55 + 1e-8);
    run(p, 3, fps, ['KeyC'], [0, 0], () => -2);
    assert(p.position.y >= -2 + p.clearance - 1e-8);
    finite(p);
  }
});

test('shore blocks travel onto dry land; camera modes and zoom stay finite', () => {
  const p = swimmer('clownfish', new THREE.Vector3(0, -1, 0));
  const shore = (x, z) => z > 1 ? 2 : -3;
  run(p, 2, 60, ['KeyW', 'ShiftLeft'], [0, 0], shore);
  assert(p.position.z <= 1 && p.position.z > 0.5);
  p.input.wheel = 1000;
  p.update(1 / 60, shore);
  assert(p.camZoom > 1 && p.camZoom < p._zoomTarget);
  assert(p.toggleCamLock());
  const yaw = p.camYaw;
  run(p, 0.5, 60, ['KeyA'], [0, 0], shore);
  assert(p.camYaw === yaw);
  assert(p.toggleFirstPerson());
  p.update(1 / 60, shore); finite(p);
  assert(!p.mesh.visible);
  assert(!p.toggleFirstPerson()); assert(p.mesh.visible);
  p.update(0, shore); p.update(NaN, shore); finite(p);
});
console.log(`\n  ${passed} movement checks passed.`);
