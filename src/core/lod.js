// lod.js — Level of detail for creature animation.
//
// Measured cost before this existed: 1.81 ms to animate ONE shark, of which
// 1.09 ms (91%) was computeVertexNormals(). At 60 creatures that is 108 ms a
// frame — about 9 FPS. The models are worth keeping, so the fix is to stop
// paying full price for every animal at every distance.
//
// Four tiers:
//   0  full  — deform the mesh, refresh normals (throttled)
//   1  mid   — deform the mesh, keep the original normals
//   2  far   — no vertex work at all; only fins/limbs move
//   3  idle  — nothing
//
// Tier 0 is additionally rationed: only the handful of creatures nearest the
// camera get it, no matter how many are on screen.

export const LOD = { FULL: 0, MID: 1, FAR: 2, IDLE: 3 };

// Refresh normals only every Nth frame at tier 0. The swim wave is gentle, so
// 20 updates a second is indistinguishable from 60 and costs a third as much.
const NORMAL_INTERVAL = 3;

export function lodOf(root) {
  return root._lod ?? LOD.FULL;
}

/** Should this creature's vertices be moved this frame? */
export function wantsDeform(root) {
  return lodOf(root) <= LOD.MID;
}

/** Should its normals be rebuilt this frame? Throttled, tier 0 only. */
export function wantsNormals(root) {
  if (lodOf(root) !== LOD.FULL) return false;
  root._nTick = ((root._nTick | 0) + 1) % NORMAL_INTERVAL;
  return root._nTick === 0;
}

/** Convenience used by every animate function. */
export function refreshNormals(root, geometry) {
  if (wantsNormals(root)) geometry.computeVertexNormals();
}

/**
 * Assign tiers across every live creature.
 * @param {Iterable} meshes  creature root objects
 * @param {THREE.Vector3} eye  the camera/player position
 * @param {number} budget  how many may run at tier 0
 */
export function assignLOD(meshes, eye, budget = 10) {
  const list = [];
  for (const m of meshes) {
    const dx = m.position.x - eye.x, dy = m.position.y - eye.y, dz = m.position.z - eye.z;
    m._d2 = dx * dx + dy * dy + dz * dz;
    list.push(m);
  }
  // nearest first; the sort is trivial next to the work it saves
  list.sort((a, b) => a._d2 - b._d2);

  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const d = Math.sqrt(m._d2);
    // a big animal stays detailed further out — it fills more of the screen
    const size = m.userData.sizeRef || 1;
    const near = 22 + size * 6;
    const mid = 70 + size * 16;
    const far = 200 + size * 40;

    if (i < budget && d < near) m._lod = LOD.FULL;
    else if (d < mid) m._lod = LOD.MID;
    else if (d < far) m._lod = LOD.FAR;
    else m._lod = LOD.IDLE;
  }
  return list.length;
}

/** Mesh resolution presets. NPCs do not need the player's vertex count. */
export const DETAIL = {
  high: { swim: [80, 48], whale: [96, 56], odd: [76, 52] },
  med: { swim: [46, 28], whale: [56, 34], odd: [44, 30] },
  low: { swim: [30, 20], whale: [36, 24], odd: [30, 22] },
};

export function resFor(detail, kind) {
  const d = DETAIL[detail] || DETAIL.med;
  return d[kind] || d.swim;
}
