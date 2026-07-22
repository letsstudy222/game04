// toast.js — Small discovery notifications sliding in at the top.

export class Toasts {
  constructor(el) { this.el = el; }

  show(html, ms = 4200) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    this.el.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      t.classList.add('out');
      setTimeout(() => t.remove(), 700);
    }, ms);
  }
}
