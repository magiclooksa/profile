import type { Media } from '../../domain/entities';
import { h } from '../dom';
import { MediaView } from '../components/shared';

/** A horizontal strip of tall photos, scrolled by drag, swipe or the arrows. */
export function Filmstrip(images: readonly Media[]): HTMLElement {
  const strip = h('div', {
    class: 'strip', tabindex: 0, role: 'group', 'aria-label': 'صور المشروع', 'data-cursor': 'اسحب',
  }, images.map((m) => MediaView(m)));
  enableMouseDrag(strip);
  const step = (): number => strip.clientWidth * 0.7;
  // RTL: later photos sit to the left, so "next" scrolls towards negative x.
  const prev = h('button', { type: 'button', 'aria-label': 'الصور السابقة' }, '→');
  const next = h('button', { type: 'button', 'aria-label': 'الصور التالية' }, '←');
  prev.addEventListener('click', () => strip.scrollBy({ left: step(), behavior: 'smooth' }));
  next.addEventListener('click', () => strip.scrollBy({ left: -step(), behavior: 'smooth' }));
  return h('div', { class: 'g g-strip' }, strip, h('div', { class: 'strip-ctl' }, prev, next));
}

/** Lets a mouse drag the strip sideways; a real drag swallows the click that ends it. */
function enableMouseDrag(strip: HTMLElement): void {
  let startX = 0, startScroll = 0, moved = 0, dragging = false;
  strip.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragging = true;
    moved = 0;
    startX = event.clientX;
    startScroll = strip.scrollLeft;
  });
  strip.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (moved < 6) return;
    if (!strip.hasPointerCapture(event.pointerId)) strip.setPointerCapture(event.pointerId);
    strip.classList.add('dragging');
    strip.scrollLeft = startScroll - dx;
  });
  const end = (): void => { dragging = false; strip.classList.remove('dragging') };
  strip.addEventListener('pointerup', end);
  strip.addEventListener('pointercancel', end);
  strip.addEventListener('click', (event) => {
    if (moved < 6) return;
    event.preventDefault();
    event.stopPropagation();
    moved = 0;
  }, true);
}
