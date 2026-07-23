// menu.js — Species selection screen (a marine field guide).
// Cards are generated from SPECIES so new species appear automatically.

import { SPECIES, SPECIES_ORDER } from '../data/species.js';
import { BIOME_DEF } from '../world/biomes.js';

const DIVER_M = 1.8; // reference human diver height for the scale bar

function fmtSize(m) {
  if (m < 1) return Math.round(m * 100) + ' cm';
  return m.toFixed(m < 10 ? 1 : 0) + ' m';
}

export function buildMenu(rootEl, onSelect, journal = null) {
  const grid = document.createElement('div');
  grid.className = 'species-grid';

  SPECIES_ORDER.forEach((id) => {
    const sp = SPECIES[id];
    const biome = BIOME_DEF[sp.homeBiome];
    const met = journal ? journal.met.has(id) : false;
    const card = document.createElement('button');
    card.className = 'species-card' + (met ? ' met' : '');
    card.setAttribute('aria-label', `Chọn ${sp.viet}`);

    // scale bar: fish vs diver, capped visually
    const ratio = Math.min(1, sp.length / Math.max(sp.length, DIVER_M, 6));
    const fishPct = Math.max(4, Math.min(100, (sp.length / 30) * 100)); // 30m = full bar
    const diverPct = Math.max(2, (DIVER_M / 30) * 100);

    card.innerHTML = `
      <div class="card-top" style="--accent:#${biome.accentColor.toString(16).padStart(6, '0')}">
        <span class="card-biome">${biome.label}</span>
        <span class="card-size">${met ? '<span class="card-met">✓</span> ' : ''}${fmtSize(sp.length)}</span>
      </div>
      <h3 class="card-name">${sp.viet}</h3>
      <p class="card-sci">${sp.name} · <em>${sp.scientific}</em></p>
      <div class="scale">
        <div class="scale-row"><span class="scale-lbl">Cá</span><div class="bar"><i style="width:${fishPct}%;background:#${biome.accentColor.toString(16).padStart(6, '0')}"></i></div></div>
        <div class="scale-row"><span class="scale-lbl">Thợ lặn</span><div class="bar"><i style="width:${diverPct}%;background:#8fd4ee"></i></div></div>
      </div>
      <p class="card-habitat">${sp.info.habitat}</p>
      <p class="card-fact">${sp.info.fact}</p>
      <span class="card-cta">Bắt đầu bơi →</span>
    `;
    card.addEventListener('click', () => onSelect(id));
    grid.appendChild(card);
  });

  rootEl.appendChild(grid);
}
