import { finePointer, h, prefersReducedMotion } from '../dom';

const DARK_AREAS = '.band, .menu, .site-footer';
const INTERACTIVE = 'a, button, label, input, select, textarea, summary, [role="button"]';

/**
 * A follower dot in place of the system cursor: it grows over links,
 * shows a short label over media ([data-cursor]) and turns light on dark bands.
 */
export function initCursor(): void {
  if (!finePointer() || prefersReducedMotion()) return;
  const label = h('span', {});
  const cursor = h('div', { class: 'cursor', 'aria-hidden': 'true' }, h('div', { class: 'cursor-dot' }, label));
  document.body.append(cursor);
  document.documentElement.classList.add('has-cursor');

  let x = 0, y = 0, cx = 0, cy = 0, frame = 0;
  const loop = (): void => {
    cx += (x - cx) * 0.28;
    cy += (y - cy) * 0.28;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    frame = Math.abs(x - cx) + Math.abs(y - cy) > 0.1 ? requestAnimationFrame(loop) : 0;
  };

  const update = (target: EventTarget | null): void => {
    const el = target instanceof Element ? target : null;
    const text = el?.closest('[data-cursor]')?.getAttribute('data-cursor') ?? '';
    if (label.textContent !== text) label.textContent = text;
    cursor.classList.toggle('has-label', text !== '');
    cursor.classList.toggle('is-hover', text === '' && Boolean(el?.closest(INTERACTIVE)));
    cursor.classList.toggle('on-dark', Boolean(el?.closest(DARK_AREAS)));
  };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    x = event.clientX;
    y = event.clientY;
    if (!cursor.classList.contains('on')) {
      cx = x;
      cy = y;
      cursor.classList.add('on');
    }
    if (!frame) frame = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerover', (event) => update(event.target));
  document.addEventListener('pointerout', (event) => { if (!event.relatedTarget) cursor.classList.remove('on') });
  document.addEventListener('pointerdown', () => cursor.classList.add('down'));
  document.addEventListener('pointerup', () => cursor.classList.remove('down'));
  // Content moves under a still pointer while scrolling, so re-read what is under it.
  window.addEventListener('scroll', () => {
    if (cursor.classList.contains('on')) update(document.elementFromPoint(x, y));
  }, { passive: true });
}
