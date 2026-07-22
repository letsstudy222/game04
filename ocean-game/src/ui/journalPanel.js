// journalPanel.js — The field journal overlay (key J).
// Met species show full identity; unmet ones show a hint of where to look.

import { SPECIES, SPECIES_ORDER } from '../data/species.js';
import { BIOME_DEF } from '../world/biomes.js';

function fmtSize(m) {
  if (m < 1) return Math.round(m * 100) + ' cm';
  return m.toFixed(m < 10 ? 1 : 0) + ' m';
}

export function renderJournal(el, journal) {
  const total = SPECIES_ORDER.length;
  const bTotal = Object.keys(BIOME_DEF).length;

  const items = SPECIES_ORDER.map((id) => {
    const s = SPECIES[id];
    const met = journal.met.has(id);
    const biomeLabel = BIOME_DEF[s.homeBiome].label;
    return `
      <div class="j-item ${met ? 'met' : ''}">
        <span class="j-mark">${met ? '✓' : '?'}</span>
        <span class="j-body">
          <span class="j-name">${met ? s.viet : '???'}</span>
          <span class="j-sub">${met
            ? `${s.name} · ${fmtSize(s.length)} · ${biomeLabel}`
            : `Chưa gặp — hãy tìm ở ${biomeLabel.toLowerCase()}`}</span>
        </span>
      </div>`;
  }).join('');

  const biomeRows = Object.entries(BIOME_DEF).map(([id, d]) =>
    `<span class="j-biome ${journal.biomes.has(id) ? 'met' : ''}">${journal.biomes.has(id) ? d.label : '· · ·'}</span>`
  ).join('');

  el.innerHTML = `
    <div class="j-head">
      <span class="eyebrow">Nhật ký thám hiểm</span>
      <h2 class="j-title">${journal.met.size}<span class="j-of">/${total} loài</span> · ${journal.biomes.size}<span class="j-of">/${bTotal} vùng biển</span></h2>
    </div>
    <div class="j-grid">${items}</div>
    <div class="j-biomes">${biomeRows}</div>
    <p class="j-hint">Bơi gần một sinh vật để ghi nhận nó · Nhấn <b>J</b> để đóng</p>
  `;
}
