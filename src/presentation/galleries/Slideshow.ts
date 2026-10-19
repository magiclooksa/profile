import type { Media } from '../../domain/entities';
import { h, prefersReducedMotion } from '../dom';
import { MediaView } from '../components/shared';

const AUTOPLAY_MS = 4500;

/** A large stage that cycles through the photos, with thumbnails below. */
export function Slideshow(images: readonly Media[]): HTMLElement {
  const slides = images.map((m, i) => {
    const el = MediaView(m, i === 0 ? 'slide on' : 'slide');
    el.setAttribute('aria-hidden', String(i !== 0));
    return el;
  });
  const counter = h('span', { class: 'count latin', 'aria-live': 'polite' }, `1 / ${images.length}`);
  const prev = h('button', { class: 'nav-b prev', type: 'button', 'aria-label': 'الصورة السابقة' }, '›');
  const next = h('button', { class: 'nav-b next', type: 'button', 'aria-label': 'الصورة التالية' }, '‹');
  const thumbs = images.map((m, i) =>
    h('button', { type: 'button', class: i === 0 ? 'on' : '', 'aria-label': m.caption, 'aria-pressed': String(i === 0) }, m.caption));

  let current = 0;
  let timer: number | undefined;

  const show = (index: number): void => {
    current = (index + images.length) % images.length;
    slides.forEach((s, i) => { s.classList.toggle('on', i === current); s.setAttribute('aria-hidden', String(i !== current)) });
    thumbs.forEach((t, i) => { t.classList.toggle('on', i === current); t.setAttribute('aria-pressed', String(i === current)) });
    counter.textContent = `${current + 1} / ${images.length}`;
  };
  const stop = (): void => window.clearInterval(timer);
  const userGo = (index: number): void => { stop(); show(index) };

  prev.addEventListener('click', () => userGo(current - 1));
  next.addEventListener('click', () => userGo(current + 1));
  thumbs.forEach((t, i) => t.addEventListener('click', () => userGo(i)));

  const root = h('div', { class: 'g g-show' },
    h('div', { class: 'stage' }, slides, prev, next, counter),
    h('div', { class: 'thumbs' }, thumbs));

  if (images.length > 1 && !prefersReducedMotion()) {
    timer = window.setInterval(() => show(current + 1), AUTOPLAY_MS);
    root.addEventListener('mouseenter', stop, { once: true });
    root.addEventListener('focusin', stop, { once: true });
  }
  return root;
}
