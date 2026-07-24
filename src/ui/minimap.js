// minimap.js — Top-right world minimap. Samples biomeAt() on a grid around the
// player and paints each biome its map color. The expensive sampling is cached
// and only recomputed after you swim far enough; per-frame work is one blit + arrow.


// Softer cartographic palette per biome (map look, not floor look).
const MAP_COLORS = {
  coral_reef: '#e5c88f',
  kelp_forest: '#4f7a52',
  open_ocean: '#2e5f80',
  polar: '#a9c4d2',
  deep_sea: '#132433',
  mangrove: '#5c4a2e',
  blue_hole: '#1b57b8',
  seagrass: '#6fa347',
};

export class Minimap {
  /**
   * @param {HTMLCanvasElement} canvas  visible canvas (square)
   * @param {(x:number,z:number)=>string} getBiome  world query
   */
  constructor(canvas, getBiome) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.getBiome = getBiome;

    this.res = 56;        // sample grid resolution
    this.step = 50;       // meters per sample -> covers 2800 m across
    this.center = null;   // world coords the buffer was built around

    this.buf = document.createElement('canvas');
    this.buf.width = this.res;
    this.buf.height = this.res;
    this.bctx = this.buf.getContext('2d');
  }

  invalidate() { this.center = null; }

  _rebuild(pos) {
    this.center = { x: pos.x, z: pos.z };
    const R = this.res;
    const img = this.bctx.createImageData(R, R);
    const d = img.data;
    for (let py = 0; py < R; py++) {
      for (let px = 0; px < R; px++) {
        // screen up (+py small) = +z north; screen right = +x east
        const wx = pos.x + (px - R / 2) * this.step;
        const wz = pos.z + (R / 2 - py) * this.step;
        const biome = this.getBiome(wx, wz);
        const hex = MAP_COLORS[biome] || '#2e5f80';
        const i = (py * R + px) * 4;
        d[i] = parseInt(hex.slice(1, 3), 16);
        d[i + 1] = parseInt(hex.slice(3, 5), 16);
        d[i + 2] = parseInt(hex.slice(5, 7), 16);
        d[i + 3] = 255;
      }
    }
    this.bctx.putImageData(img, 0, 0);
  }

  update(pos, yaw) {
    // rebuild the sampled buffer only after moving ~ a third of its span
    if (!this.center ||
        Math.hypot(pos.x - this.center.x, pos.z - this.center.z) > this.step * this.res * 0.3) {
      this._rebuild(pos);
    }

    const ctx = this.ctx;
    const s = this.c.width;
    const scale = s / this.res;
    ctx.imageSmoothingEnabled = true;       // soft blended regions
    ctx.clearRect(0, 0, s, s);

    // draw the cached buffer offset so the player stays centered
    const offX = -((pos.x - this.center.x) / this.step) * scale;
    const offY = ((pos.z - this.center.z) / this.step) * scale;
    ctx.drawImage(this.buf, offX, offY, s, s);

    // subtle vignette ring
    const grad = ctx.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.55);
    grad.addColorStop(0, 'rgba(4,20,29,0)');
    grad.addColorStop(1, 'rgba(4,20,29,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // player arrow (heading yaw=0 -> +z -> up)
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(yaw);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fillStyle = '#57e3c9';
    ctx.shadowColor = 'rgba(87,227,201,0.8)';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }
}
