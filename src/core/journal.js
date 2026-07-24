// journal.js — Discovery journal: which species you've met, which biomes
// you've entered. Persists in localStorage across sessions (works on GitHub
// Pages). All storage access is guarded so private mode / headless never breaks.

const KEY = 'abyssal-journal-v1';

// Achievements — unlocked once, persisted, shown in the journal panel.
export const ACHIEVEMENTS = {
  all_species: { viet: 'Nhà hải dương học', desc: 'Ghi nhận đủ mọi loài' },
  all_biomes: { viet: 'Người vẽ hải đồ', desc: 'Đặt vây tới mọi vùng biển' },
  wreck: { viet: 'Thợ săn xác tàu', desc: 'Tìm thấy một con tàu đắm' },
  abyss: { viet: 'Chạm vực thẳm', desc: 'Lặn sâu quá 500 m' },
};

export class Journal {
  constructor() {
    this.met = new Set();       // species ids
    this.biomes = new Set();    // biome ids
    this.achievements = new Set();
    // Explored patches of the real globe, as "lon5,lat5" cell keys. The world
    // map dims everything you have not swum through, so this has to be spatial
    // — knowing you once saw a reef says nothing about WHERE.
    this.cells = new Set();
    this._load();
  }

  _load() {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      (d.met || []).forEach((x) => this.met.add(x));
      (d.biomes || []).forEach((x) => this.biomes.add(x));
      (d.ach || []).forEach((x) => this.achievements.add(x));
      (d.cells || []).forEach((x) => this.cells.add(x));
    } catch (e) { /* storage unavailable — play without persistence */ }
  }

  _save() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(KEY, JSON.stringify({
        met: [...this.met], biomes: [...this.biomes], ach: [...this.achievements],
        cells: [...this.cells],
      }));
    } catch (e) { /* ignore */ }
  }

  // Returns true only on FIRST unlock.
  unlock(achId) {
    if (this.achievements.has(achId)) return false;
    this.achievements.add(achId);
    this._save();
    return true;
  }

  // Returns true only on FIRST meeting (so callers know to show a toast).
  meet(speciesId) {
    if (this.met.has(speciesId)) return false;
    this.met.add(speciesId);
    this._save();
    return true;
  }

  // Returns true only on FIRST visit to this biome.
  visit(biome) {
    if (this.biomes.has(biome)) return false;
    this.biomes.add(biome);
    this._save();
    return true;
  }

  // Mark a patch of the globe as explored. Cells are 5 degrees, which is a
  // few minutes of swimming at 1:400 — fine enough to draw a trail, coarse
  // enough that the saved set stays small.
  static cellKey(lon, lat) {
    return `${Math.floor(lon / 5)},${Math.floor(lat / 5)}`;
  }

  explore(lon, lat) {
    const k = Journal.cellKey(lon, lat);
    if (this.cells.has(k)) return false;
    this.cells.add(k);
    this._save();
    return true;
  }

  explored(lon, lat) { return this.cells.has(Journal.cellKey(lon, lat)); }

  reset() {
    this.met.clear();
    this.biomes.clear();
    this.cells.clear();
    this.achievements.clear();
    this._save();
  }
}
