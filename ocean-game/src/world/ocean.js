// ocean.js — Atmosphere: water surface, depth-based fog, god rays, plankton.
// These sell the "underwater" feeling much more than geometry does.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { BIOME_DEF } from './biomes.js';

function lerpColor(a, b, t) {
  return a.clone().lerp(b, THREE.MathUtils.clamp(t, 0, 1));
}

export class Ocean {
  constructor(scene) {
    this.scene = scene;
    this.surfaceColor = new THREE.Color(CONFIG.fog.surfaceColor);
    this.deepColor = new THREE.Color(CONFIG.fog.deepColor);

    scene.fog = new THREE.Fog(this.surfaceColor.getHex(), 30, 600);
    scene.background = this.surfaceColor.clone();

    this._buildSurface();
    this._buildGodRays();
    this._buildPlankton();
    this._buildBubbles();
    this._currentTint = new THREE.Color(0x2f80a0);
  }

  _buildSurface() {
    // Big translucent plane at y=0 with animated wave vertices.
    const geo = new THREE.PlaneGeometry(6000, 6000, 60, 60);
    geo.rotateX(-Math.PI / 2);
    this._surfBase = geo.attributes.position.array.slice();
    const m = new THREE.MeshStandardMaterial({
      color: 0x8fd4ee, transparent: true, opacity: 0.35,
      roughness: 0.15, metalness: 0.0, side: THREE.DoubleSide,
    });
    this.surface = new THREE.Mesh(geo, m);
    this.surface.position.y = CONFIG.world.surfaceY;
    this.scene.add(this.surface);
  }

  _buildGodRays() {
    this.rays = new THREE.Group();
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xbdeaff, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 0; i < CONFIG.perf.godRays; i++) {
      const h = 260 + Math.random() * 140;
      const g = new THREE.ConeGeometry(6 + Math.random() * 10, h, 5, 1, true);
      const cone = new THREE.Mesh(g, rayMat.clone());
      cone.position.y = -h / 2 + 2;
      cone.userData.wobble = Math.random() * Math.PI * 2;
      this.rays.add(cone);
    }
    this.scene.add(this.rays);
  }

  _buildPlankton() {
    const n = CONFIG.perf.plankton;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    this._plankRange = 220;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * this._plankRange * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * this._plankRange * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * this._plankRange * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color: 0xdff4ff, size: 0.25, transparent: true, opacity: 0.5,
      depthWrite: false, sizeAttenuation: true,
    });
    this.plankton = new THREE.Points(geo, m);
    this.scene.add(this.plankton);
  }

  _buildBubbles() {
    const n = 140;
    this._bubbleRange = 30;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 48;
      pos[i * 3 + 1] = (Math.random() - 0.5) * this._bubbleRange * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 48;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color: 0xcfefff, size: 0.14, transparent: true, opacity: 0.4,
      depthWrite: false, sizeAttenuation: true,
    });
    this.bubbles = new THREE.Points(geo, m);
    this.scene.add(this.bubbles);
  }

  // Called each frame with player position + current biome + daylight (0 night..1 noon).
  update(dt, time, playerPos, biome, daylight = 1) {
    // --- Fog & tint by depth + biome clarity + time of day ---
    const def = BIOME_DEF[biome] || BIOME_DEF.open_ocean;
    const depth = Math.max(0, -playerPos.y);
    const depth01 = THREE.MathUtils.clamp(depth / 350, 0, 1);
    const tint = lerpColor(new THREE.Color(def.waterTint), this.deepColor, depth01);
    tint.multiplyScalar(0.22 + 0.78 * daylight);       // night darkens the water
    this._currentTint.lerp(tint, 0.05);

    const clarity = def.clarity || 1;
    const near = 18 + (1 - depth01) * 12;
    const far = (120 + (1 - depth01) * 520) * clarity;
    this.scene.fog.color.copy(this._currentTint);
    this.scene.fog.near = near;
    this.scene.fog.far = far;
    this.scene.background.copy(this._currentTint);

    // --- Animate surface waves ---
    const p = this.surface.geometry.attributes.position;
    const base = this._surfBase;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      p.array[i * 3 + 1] = Math.sin(x * 0.02 + time) * 1.2 + Math.cos(z * 0.03 + time * 0.8) * 1.0;
    }
    p.needsUpdate = true;
    this.surface.position.x = playerPos.x;
    this.surface.position.z = playerPos.z;

    // --- God rays follow surface, gently sway ---
    this.rays.position.set(playerPos.x, 0, playerPos.z);
    this.rays.children.forEach((c, i) => {
      c.rotation.z = Math.sin(time * 0.3 + c.userData.wobble) * 0.06;
      c.position.x = ((i * 37) % 200) - 100 + Math.sin(time * 0.1 + i) * 6;
      c.position.z = ((i * 71) % 200) - 100;
      c.material.opacity = 0.05 * (1 - depth01) * daylight; // fade with depth & night
    });

    // --- Plankton drifts + wraps around player (infinite feel) ---
    this.plankton.position.set(playerPos.x, playerPos.y, playerPos.z);
    const arr = this.plankton.geometry.attributes.position.array;
    const R = this._plankRange;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += Math.sin(time * 0.5 + i) * 0.004; // gentle vertical drift
      arr[i] += Math.cos(time * 0.3 + i) * 0.003;
      // wrap
      for (let k = 0; k < 3; k++) {
        if (arr[i + k] > R) arr[i + k] -= R * 2;
        else if (arr[i + k] < -R) arr[i + k] += R * 2;
      }
    }
    this.plankton.geometry.attributes.position.needsUpdate = true;

    // --- Bubbles rise + wobble, wrapping vertically around the player ---
    this.bubbles.position.copy(playerPos);
    const bArr = this.bubbles.geometry.attributes.position.array;
    const bR = this._bubbleRange;
    for (let i = 0; i < bArr.length; i += 3) {
      bArr[i + 1] += (0.9 + ((i / 3) % 7) * 0.12) * dt;         // rise
      bArr[i] += Math.sin(time * 1.4 + i) * 0.006;               // wobble
      if (bArr[i + 1] > bR || playerPos.y + bArr[i + 1] > -0.5) {
        bArr[i + 1] = -bR;                                       // recycle below
        bArr[i] = (Math.random() - 0.5) * 48;
        bArr[i + 2] = (Math.random() - 0.5) * 48;
      }
    }
    this.bubbles.geometry.attributes.position.needsUpdate = true;
  }
}
