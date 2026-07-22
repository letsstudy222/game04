// input.js — Keyboard + mouse (pointer lock) state.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      // prevent page scroll on space/arrows while playing — but don't swallow
      // Space/Enter when a menu button is focused (keyboard accessibility).
      const onUi = e.target !== document.body && e.target !== canvas;
      if (!onUi && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    canvas.addEventListener('click', () => {
      if (!this.locked) canvas.requestPointerLock?.();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
  }

  down(code) { return this.keys.has(code); }

  // consume accumulated mouse delta for this frame
  consumeMouse() {
    const dx = this.mouseDX, dy = this.mouseDY;
    this.mouseDX = 0; this.mouseDY = 0;
    return [dx, dy];
  }
}
