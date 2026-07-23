// lighting.js — ONE definition of the light rig, shared by the game and by the
// offline renderer used to review models. Previously the two diverged: the
// review renders had a rim light and a brighter ambient, the game did not, so
// a model approved on an image looked flatter in play. Single source of truth
// removes that whole class of mismatch.
//
// Directions are unit vectors pointing FROM the surface TOWARDS the light.

export const RIG = {
  ambient: 0.46,                                   // uniform base
  key:  { dir: [-0.45, 0.78, 0.44], intensity: 0.82, color: 0xdff2ff },
  rim:  { dir: [0.62, 0.25, -0.74], intensity: 0.34, color: 0x7fd7c9 },
  fill: { dir: [0.20, -0.60, 0.35], intensity: 0.20, color: 0x4a7fa0 },
  ambientColor: 0x5c86a0,
  hemiSky: 0xbfe8f7,
  hemiGround: 0x0b2430,
  specPower: 26,
  specStrength: 0.5,
};

/**
 * Create the rig as THREE lights. Returns handles so the day/night cycle can
 * scale them together without breaking their relative balance.
 */
export function buildRig(THREE, scene, distance = 300) {
  const mk = (spec) => {
    const l = new THREE.DirectionalLight(spec.color, spec.intensity);
    l.position.set(spec.dir[0] * distance, spec.dir[1] * distance, spec.dir[2] * distance);
    scene.add(l);
    return l;
  };
  const key = mk(RIG.key);
  const rim = mk(RIG.rim);
  const fill = mk(RIG.fill);
  const hemi = new THREE.HemisphereLight(RIG.hemiSky, RIG.hemiGround, 0.62);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(RIG.ambientColor, RIG.ambient);
  scene.add(ambient);

  return {
    key, rim, fill, hemi, ambient,
    /** daylight 0 (midnight) .. 1 (noon) — keeps the rig's proportions */
    setDaylight(d) {
      const k = 0.16 + 0.84 * d;
      key.intensity = RIG.key.intensity * k * 2.0;
      rim.intensity = RIG.rim.intensity * (0.4 + 0.6 * d) * 2.0;
      fill.intensity = RIG.fill.intensity * k * 2.0;
      hemi.intensity = 0.62 * (0.3 + 0.7 * d);
      ambient.intensity = RIG.ambient * (0.34 + 0.66 * d);
    },
  };
}
