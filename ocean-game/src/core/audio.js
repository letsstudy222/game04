// audio.js — Procedural underwater ambience via Web Audio. No audio files.
// Brown noise -> lowpass filter (muffled water rumble) with a slow swell LFO.
// Created lazily on first toggle (browsers require a user gesture for audio).

export class OceanAudio {
  constructor() {
    this.ctx = null;
    this.gain = null;
    this.enabled = false;
  }

  _init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();

    // Brown noise buffer (4s loop) — random walk gives a deep rumble.
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 0.7;

    // Slow swell: LFO gently opens/closes the filter like distant waves.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 70;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    this.ctx = ctx;
    this.gain = gain;
  }

  // Returns the new enabled state.
  toggle() {
    if (!this.ctx) this._init();
    if (!this.ctx) return false;                 // Web Audio unavailable
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.enabled = !this.enabled;
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(this.enabled ? 0.11 : 0, t + 0.8);
    return this.enabled;
  }
}
