import { prefersReducedMotion } from '../dom';

const clamp = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Scroll-linked effects, all measured in one animation frame:
 * - [data-fill]: words light up one after another as the paragraph is read;
 * - [data-grow]: the showreel opens from a rounded card to the full width;
 * - [data-parallax]: images drift at their own speed.
 */
export function initScrollFx(root: ParentNode): void {
  if (prefersReducedMotion()) return;
  const fills = Array.from(root.querySelectorAll<HTMLElement>('[data-fill]')).map((el) => ({
    el, words: Array.from(el.querySelectorAll<HTMLElement>('.w')), lit: -1,
  }));
  const grows = Array.from(root.querySelectorAll<HTMLElement>('[data-grow]'));
  const drifts = Array.from(root.querySelectorAll<HTMLElement>('[data-parallax]'));
  fills.forEach((f) => f.el.classList.add('filling'));

  let queued = false;
  const run = (): void => {
    queued = false;
    const vh = window.innerHeight;
    for (const f of fills) {
      const r = f.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;
      const lit = Math.round(clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3)) * f.words.length);
      if (lit === f.lit) continue;
      f.lit = lit;
      f.words.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }
    for (const el of grows) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      el.style.setProperty('--grow', clamp((vh - r.top) / (vh * 0.9)).toFixed(3));
    }
    for (const el of drifts) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const speed = Number(el.dataset.parallax) || 0.1;
      el.style.translate = `0 ${((r.top + r.height / 2 - vh / 2) * -speed).toFixed(1)}px`;
    }
  };
  const queue = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  run();
}
