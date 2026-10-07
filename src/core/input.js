// input.js — Keyboard + mouse (pointer lock) state.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.locked = false;
    this.enabled = false;

    window.addEventListener('keydown', (e) => {
      if (!this.enabled || e.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (e.repeat && !this.keys.has(e.code)) return;
      this.keys.add(e.code);
      // prevent page scroll on space/arrows while playing — but don't swallow
      // Space/Enter when a menu button is focused (keyboard accessibility).
      const onUi = e.target !== document.body && e.target !== canvas;
      if (!onUi && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });

    canvas.addEventListener('click', () => {
      if (this.enabled && !this.locked) canvas.requestPointerLock?.();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.reset();
    });
    window.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.wheel += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (this.locked) e.preventDefault();
    }, { passive: false });

    document.addEventListener('mousemove', (e) => {
      if (this.enabled && this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
  }

  setEnabled(enabled) {
    if (this.enabled !== enabled) this.reset();
    this.enabled = enabled;
  }

  reset() {
    this.keys.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }

  down(code) { return this.enabled && this.keys.has(code); }

  // consume accumulated wheel delta for this frame
  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  // consume accumulated mouse delta for this frame
  consumeMouse() {
    const dx = this.mouseDX, dy = this.mouseDY;
    this.mouseDX = 0; this.mouseDY = 0;
    return [dx, dy];
  }
}
