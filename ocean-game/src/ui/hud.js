// hud.js — Live readouts: depth, biome, zone, coords, compass.

import { DEPTH_ZONES } from '../config.js';
import { BIOME_DEF } from '../world/biomes.js';

function zoneFor(depth) {
  for (const z of DEPTH_ZONES) if (depth >= z.to) return z;
  return DEPTH_ZONES[DEPTH_ZONES.length - 1];
}

export class HUD {
  constructor(el) {
    this.el = el;
    el.innerHTML = `
      <div class="hud-line"><span class="hud-k">Loài</span><span id="hud-species" class="hud-v"></span></div>
      <div class="hud-line"><span class="hud-k">Vùng biển</span><span id="hud-biome" class="hud-v"></span></div>
      <div class="hud-line"><span class="hud-k">Độ sâu</span><span id="hud-depth" class="hud-v"></span></div>
      <div class="hud-line"><span class="hud-k">Tầng</span><span id="hud-zone" class="hud-v"></span></div>
      <div class="hud-line"><span class="hud-k">Toạ độ</span><span id="hud-coord" class="hud-v"></span></div>
      <div class="hud-compass"><div id="hud-needle" class="needle"></div><span class="compass-n">N</span></div>
    `;
    this.$species = el.querySelector('#hud-species');
    this.$biome = el.querySelector('#hud-biome');
    this.$depth = el.querySelector('#hud-depth');
    this.$zone = el.querySelector('#hud-zone');
    this.$coord = el.querySelector('#hud-coord');
    this.$needle = el.querySelector('#hud-needle');
  }

  setSpecies(sp) { this.$species.textContent = `${sp.viet} (${sp.name})`; }

  update(pos, biome, yaw) {
    const depth = Math.max(0, -pos.y);
    this.$biome.textContent = BIOME_DEF[biome]?.label || biome;
    this.$depth.textContent = depth.toFixed(0) + ' m';
    const z = zoneFor(pos.y);
    this.$zone.textContent = z.viet;
    this.$coord.textContent = `${pos.x.toFixed(0)}, ${pos.z.toFixed(0)}`;
    // compass needle points to heading
    this.$needle.style.transform = `rotate(${(-yaw * 180 / Math.PI).toFixed(1)}deg)`;
  }
}
