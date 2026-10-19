import type { Media } from '../../domain/entities';
import { h } from '../dom';
import { MediaView } from '../components/shared';

/** A horizontal strip of tall photos, scrolled by drag, swipe or the arrows. */
export function Filmstrip(images: readonly Media[]): HTMLElement {
  const strip = h('div', { class: 'strip', tabindex: 0, role: 'group', 'aria-label': 'صور المشروع' },
    images.map((m) => MediaView(m)));
  const step = (): number => strip.clientWidth * 0.7;
  // RTL: later photos sit to the left, so "next" scrolls towards negative x.
  const prev = h('button', { type: 'button', 'aria-label': 'الصور السابقة' }, '→');
  const next = h('button', { type: 'button', 'aria-label': 'الصور التالية' }, '←');
  prev.addEventListener('click', () => strip.scrollBy({ left: step(), behavior: 'smooth' }));
  next.addEventListener('click', () => strip.scrollBy({ left: -step(), behavior: 'smooth' }));
  return h('div', { class: 'g g-strip' }, strip, h('div', { class: 'strip-ctl' }, prev, next));
}
