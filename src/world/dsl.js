// dsl.js — The deep scattering layer, and the nightly climb that follows it.
//
// Every evening the largest migration on Earth happens vertically: a dense band
// of small organisms that sits several hundred metres down through the day
// rises almost to the surface after dark, and sinks again at dawn. Everything
// that eats them goes with it — the compendium records diel vertical migration
// for bluefin tuna, ocean sunfish and giant manta.
//
// This is close to free content. Nothing new is modelled: the same animals in
// the same ocean simply hold a different depth, so a stretch of water you swam
// through at noon is a different place at midnight.

import * as THREE from 'three';

// Where the layer sits, in metres, at midday and at midnight.
export const DSL_DAY = -420;
export const DSL_NIGHT = -55;

/** Depth of the layer for a given daylight value (0 night .. 1 noon). */
export function dslDepth(daylight) {
  // ease so the climb happens quickly around dusk rather than linearly
  const k = daylight * daylight * (3 - 2 * daylight);
  return DSL_NIGHT + (DSL_DAY - DSL_NIGHT) * k;
}

/**
 * Depth an animal should be drifting towards.
 * `dvm` is how strongly the species follows the layer: a tuna tracks it almost
 * completely, an anglerfish barely notices. The result is clamped into the
 * animal's own depth range so nothing is dragged somewhere it cannot live.
 */
export function preferredDepth(species, daylight) {
  const dvm = species.dvm || 0;
  if (dvm <= 0) return null;
  const [top, bot] = species.depth;
  const mid = (top + bot) * 0.5;
  const target = mid + (dslDepth(daylight) - mid) * dvm;
  return Math.max(bot, Math.min(top, target));
}

/**
 * The layer as something you can actually see: a band of drifting motes that
 * thickens as it rises. Drawn as one Points cloud, so it costs a single call.
 */
export class ScatteringLayer {
  constructor(scene, count = 900, range = 150) {
    this.range = range;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * range * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 26;      // thickness of the band
      pos[i * 3 + 2] = (Math.random() - 0.5) * range * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.PointsMaterial({
      color: 0xbfe6d8, size: 0.4, transparent: true, opacity: 0,
      depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.scene = scene;
  }

  /** @param {number} daylight 0 night .. 1 noon */
  update(dt, time, playerPos, daylight) {
    const depth = dslDepth(daylight);
    this.points.position.set(playerPos.x, depth, playerPos.z);

    // Only visible when the player is actually near the band. Fading on
    // proximity rather than drawing it everywhere keeps it a thing you swim
    // INTO, and keeps the motes from cluttering open water.
    const near = 1 - THREE.MathUtils.clamp(Math.abs(playerPos.y - depth) / 70, 0, 1);
    this.mat.opacity = near * near * (0.30 + 0.35 * (1 - daylight));

    const arr = this.points.geometry.attributes.position.array;
    const R = this.range;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += Math.sin(time * 0.25 + i) * 0.006;
      arr[i + 2] += Math.cos(time * 0.21 + i) * 0.006;
      if (arr[i] > R) arr[i] -= R * 2; else if (arr[i] < -R) arr[i] += R * 2;
      if (arr[i + 2] > R) arr[i + 2] -= R * 2; else if (arr[i + 2] < -R) arr[i + 2] += R * 2;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}
