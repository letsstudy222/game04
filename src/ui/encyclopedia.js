// encyclopedia.js — Field encyclopedia (key E). Lists every creature in the
// game with real-world data: size, weight, lifespan, diet, IUCN status, and a
// written entry. Species you haven't met yet are shown locked.

import { SPECIES, SPECIES_ORDER, ALL_SPECIES, IUCN } from '../data/species.js';
import { BIOME_DEF } from '../world/biomes.js';

function fmtSize(m) {
  if (m < 1) return Math.round(m * 100) + ' cm';
  return m.toFixed(m < 10 ? 1 : 0) + ' m';
}

let selectedId = null;

export function renderEncyclopedia(el, journal, onRerender) {
  const ids = ALL_SPECIES;
  const isMet = (id) => journal.met.has(id) || !SPECIES_ORDER.includes(id);
  if (!selectedId || !ids.includes(selectedId)) {
    selectedId = ids.find(isMet) || ids[0];
  }

  const list = ids.map((id) => {
    const s = SPECIES[id];
    const met = isMet(id);
    const st = IUCN[s.wiki?.status] || IUCN.LC;
    return `<button class="e-row ${id === selectedId ? 'active' : ''} ${met ? '' : 'locked'}"
              data-id="${id}" ${met ? '' : 'disabled'}>
        <span class="e-dot" style="background:${met ? st.color : 'transparent'};border-color:${st.color}"></span>
        <span class="e-row-name">${met ? s.viet : '???'}</span>
        <span class="e-row-size">${met ? fmtSize(s.length) : ''}</span>
      </button>`;
  }).join('');

  const s = SPECIES[selectedId];
  const met = isMet(selectedId);
  const w = s.wiki || {};
  const st = IUCN[w.status] || IUCN.DD;
  const biome = BIOME_DEF[s.homeBiome];

  const detail = met ? `
    <div class="e-head">
      <span class="e-biome" style="color:#${biome.accentColor.toString(16).padStart(6, '0')}">${biome.label}</span>
      <h2 class="e-name">${s.viet}</h2>
      <p class="e-sci">${s.name} · <em>${s.scientific}</em></p>
      <span class="e-status" style="border-color:${st.color};color:${st.color}">${st.label}</span>
    </div>
    <div class="e-stats">
      <div class="e-stat"><span>Chiều dài</span><b>${fmtSize(s.length)}</b></div>
      <div class="e-stat"><span>Cân nặng</span><b>${w.weight || '—'}</b></div>
      <div class="e-stat"><span>Tuổi thọ</span><b>${w.lifespan || '—'}</b></div>
      <div class="e-stat"><span>Độ sâu</span><b>${w.depthRange || '—'}</b></div>
    </div>
    <p class="e-diet"><span>Thức ăn</span> ${w.diet || '—'}</p>
    <p class="e-body">${w.body || s.info.fact}</p>
    ${w.records ? `<p class="e-record"><b>Kỷ lục:</b> ${w.records}</p>` : ''}
    <p class="e-habitat"><b>Môi trường sống:</b> ${s.info.habitat}</p>
  ` : `
    <div class="e-locked">
      <p class="e-locked-mark">?</p>
      <p>Bạn chưa gặp loài này.</p>
      <p class="e-locked-hint">Hãy tìm ở <b>${biome.label.toLowerCase()}</b>, độ sâu ${Math.abs(s.depth[1])}–${Math.abs(s.depth[0])} m.</p>
    </div>`;

  el.innerHTML = `
    <div class="e-inner">
      <div class="e-sidebar">
        <span class="eyebrow">Bách khoa</span>
        <p class="e-count">${journal.met.size}/${SPECIES_ORDER.length} loài đã gặp</p>
        <div class="e-list">${list}</div>
      </div>
      <div class="e-detail">${detail}</div>
    </div>
    <p class="e-hint">Nhấn <b>E</b> để đóng</p>
  `;

  el.querySelectorAll('.e-row').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      selectedId = btn.dataset.id;
      onRerender();
    });
  });
}
