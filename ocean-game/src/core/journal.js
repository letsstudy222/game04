// journal.js — Discovery journal: which species you've met, which biomes
// you've entered. Persists in localStorage across sessions (works on GitHub
// Pages). All storage access is guarded so private mode / headless never breaks.

const KEY = 'abyssal-journal-v1';

export class Journal {
  constructor() {
    this.met = new Set();       // species ids
    this.biomes = new Set();    // biome ids
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
    } catch (e) { /* storage unavailable — play without persistence */ }
  }

  _save() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(KEY, JSON.stringify({ met: [...this.met], biomes: [...this.biomes] }));
    } catch (e) { /* ignore */ }
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

  reset() {
    this.met.clear();
    this.biomes.clear();
    this._save();
  }
}
