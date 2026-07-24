// fishMesh.js — Entry point for building and animating creatures.
//
// This file used to hold every creature builder. Those were replaced by three
// continuous-surface modules and now live there instead:
//   whale.js     — the blue whale
//   swimmers.js  — sharks, dolphins, porpoises, tuna, reef fish
//   oddities.js  — rays, turtle, sunfish, squid, anglerfish, sea snake,
//                  sea star, crabs, dugong, seahorse, sea cucumber
// What remains here is only the dispatch: pick the right builder for a
// species' `shape`, and route animation to the matching updater.
//
// Convention: long axis = +Z. Head at +0.5, tail at -0.5, unit length ~1.

import { buildBlueWhale, animateWhale } from './whale.js';
import { buildSwimmer, animateSwimmer } from './swimmers.js';
import { buildOddity, animateOddity } from './oddities.js';
import { applyCaustics } from '../world/waterShader.js';

function litSkin(root) {

  // caustics ripple across an animal's back near the surface, just as they do
  // on the seabed; skip unlit materials (glowing lures, eye highlights)
  root.traverse((o) => {
    if (o.isMesh && o.material && o.material.type !== 'MeshBasicMaterial') {
      applyCaustics(o.material);
    }
  });
  return root;
}

export function buildCreature(species, variant = Math.random(), detail = 'med') {
  // Continuous-surface builds. These apply their own scaling, so return early.
  if (species.shape === 'whale') return litSkin(buildBlueWhale(species, { detail }));
  const SWIM = {
    shark: 'shark', dolphin: 'dolphin', porpoise: 'porpoise',
    tuna: 'tuna', fish: 'reeffish',
  }[species.shape];
  if (SWIM) {
    const g = buildSwimmer(species, SWIM, { detail });
    // small individual variation in size for the schooling species
    if (species.schooling) g.scale.multiplyScalar(0.86 + variant * 0.28);
    return litSkin(g);
  }
  const ODD = { ray: 'ray', turtle: 'turtle', sunfish: 'sunfish',
                squid: 'squid', angler: 'angler', snake: 'snake',
                star: 'star', crab: 'crab', dugong: 'dugong',
                seahorse: 'seahorse', cucumber: 'cucumber' }[species.shape];
  if (ODD) return litSkin(buildOddity(species, ODD, { variant, detail }));

  // Every shape in species.js is handled by one of the three builders above.
  // Reaching this line means a species declared a shape nobody builds.
  throw new Error(`buildCreature: khong co builder cho shape "${species.shape}"`);
}

export function animateCreature(root, dt, speed01 = 1) {
  const a = root._anim;
  if (!a) return;
  if (a.kind === 'whaleSpine') { animateWhale(root, dt, speed01); return; }
  if (a.kind === 'spineVert') { animateSwimmer(root, dt, speed01); return; }
  if (a.kind === 'spineSide') {
    // shared name: swimmers deform via their own path, oddities via theirs
    (root._bodyLength !== undefined ? animateOddity : animateSwimmer)(root, dt, speed01);
    return;
  }
  if (['wingwave', 'flipperFlap', 'sunScull', 'jetArms', 'starCurl', 'scuttle',
       'seahorseHover'].includes(a.kind)) {
    animateOddity(root, dt, speed01); return;
  }
  a.t += dt * (0.55 + speed01 * a.freq);
  const s = Math.sin(a.t * Math.PI * 2);

  switch (a.kind) {
    case 'flipper':
      if (root._flippers) {
        const f = s * a.amp;
        root._flippers[0].rotation.x = -0.12 + f;
        root._flippers[1].rotation.x = -0.12 + f;
        if (root._flippers[2]) root._flippers[2].rotation.x = -0.1 - f * 0.45;
        if (root._flippers[3]) root._flippers[3].rotation.x = -0.1 - f * 0.45;
      }
      break;
    case 'wings':
      if (root._wings) for (const w of root._wings) w.mesh.rotation.z = w.side * s * a.amp;
      break;
    case 'jet':
      if (root._arms) for (const arm of root._arms) {
        arm.mesh.rotation.x = Math.sin(a.t * Math.PI * 2 + arm.phase) * arm.amp;
        arm.mesh.rotation.y = Math.cos(a.t * Math.PI * 1.3 + arm.phase) * arm.amp * 0.6;
      }
      break;
    case 'sunfin':
      if (root._fins) for (const f of root._fins) f.mesh.rotation.y = s * a.amp * f.dir;
      break;
    case 'undulate':
      if (root._segs) for (const sg of root._segs) {
        sg.mesh.position.x = Math.sin(a.t * Math.PI * 2 - sg.offset) * a.amp;
      }
      if (root._paddle) root._paddle.position.x = Math.sin(a.t * Math.PI * 2 - 9.9) * a.amp * 1.3;
      break;
    case 'still':
      break;
    case 'scuttle':
      if (root._legs) for (const l of root._legs) {
        l.mesh.rotation.x = Math.sin(a.t * Math.PI * 2 + l.phase) * a.amp;
      }
      break;
    case 'fluke':
      if (a.rear) a.rear.rotation.x = s * a.amp;
      break;
    default: // 'tail'
      if (a.rear) a.rear.rotation.y = s * a.amp;
      break;
  }

  // Anglerfish lure pulses in the dark.
  if (root._lure) {
    const p = 0.75 + Math.sin(a.t * 2.4) * 0.25;
    root._lure.halo.scale.setScalar(p);
    root._lure.halo.material.opacity = 0.14 + p * 0.12;
  }

  // Subtle whole-body roll for life (not applied to benthic/static shapes).
  if (a.kind !== 'still' && a.kind !== 'scuttle') {
    root.rotation.z = Math.sin(a.t * Math.PI) * 0.025;
  }
}
