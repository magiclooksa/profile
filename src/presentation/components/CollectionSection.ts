import type { Collection, CollectionItem } from '../../domain/entities';
import { h, pad2 } from '../dom';
import { MediaView } from './shared';

const Head = (c: Collection, className = ''): HTMLElement =>
  h('div', { class: `set-head ${className}`.trim() },
    h('p', { class: 'latin set-kicker' }, c.kicker),
    h('h2', {}, c.title),
    h('p', { class: 'set-text' }, c.text));

const Caption = (item: CollectionItem, i: number): HTMLElement =>
  h('figcaption', { class: 'set-cap' },
    h('span', { class: 'latin set-no' }, pad2(i + 1)),
    h('b', {}, item.title),
    h('small', {}, item.image.caption));

/** Tall side-by-side panels; the hovered or focused one widens. */
const panels = (c: Collection): HTMLElement[] => [
  h('div', { class: 'wrap' }, Head(c, 'reveal'),
    h('div', { class: 'set-panels reveal' },
      c.items.map((item, i) => h('figure', { class: 'set-panel' },
        MediaView(item.image, 'set-media'), Caption(item, i))))),
];

/** Overlapping editorial collage with large numerals. */
const collage = (c: Collection): HTMLElement[] => [
  h('div', { class: 'wrap set-collage' },
    Head(c, 'reveal'),
    ...c.items.map((item, i) => h('figure', { class: `set-tile set-tile-${(i % 2) + 1} reveal` },
      MediaView(item.image, 'set-media'), Caption(item, i)))),
];

/** One stage with buttons that cross-fade between the photos. */
const switcher = (c: Collection): HTMLElement[] => {
  const slides = c.items.map((item, i) =>
    h('figure', { class: `set-slide${i === 0 ? ' is-active' : ''}`, 'aria-hidden': i === 0 ? undefined : 'true' },
      MediaView(item.image, 'set-media')));
  slides.slice(1).forEach((s) => { s.inert = true });
  const tabs = c.items.map((item, i) => {
    const tab = h('button', { type: 'button', class: 'set-tab', 'aria-pressed': String(i === 0) },
      h('span', { class: 'latin set-no' }, pad2(i + 1)),
      h('b', {}, item.title),
      h('small', {}, item.image.caption));
    tab.addEventListener('click', () => {
      slides.forEach((s, j) => {
        const on = i === j;
        s.classList.toggle('is-active', on);
        s.inert = !on;
        if (on) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
      });
      tabs.forEach((t, j) => t.setAttribute('aria-pressed', String(i === j)));
    });
    return tab;
  });
  return [h('div', { class: 'wrap set-switch' },
    h('div', { class: 'reveal' }, Head(c), h('div', { class: 'set-tabs' }, tabs)),
    h('div', { class: 'set-stage reveal' }, slides))];
};

/** Dark band: staggered photos beside a vertical title. */
const stagger = (c: Collection): HTMLElement[] => [
  h('div', { class: 'wrap set-stagger' },
    h('p', { class: 'latin set-vertical', 'aria-hidden': 'true' }, c.kicker),
    Head(c, 'reveal'),
    h('div', { class: 'set-steps' },
      c.items.map((item, i) => h('figure', { class: 'set-step reveal' },
        MediaView(item.image, 'set-media'), Caption(item, i))))),
];

const Swatch = (item: CollectionItem): HTMLElement | null =>
  item.color ? h('i', { class: 'set-swatch', style: `--swatch: ${item.color}`, 'aria-hidden': 'true' }) : null;

/** Horizontal scroll-snap strip with arrows and a progress bar. */
const strip = (c: Collection): HTMLElement[] => {
  const track = h('div', { class: 'set-track', tabindex: '0', role: 'region', 'aria-label': c.title },
    c.items.map((item, i) => h('figure', { class: 'set-card' },
      MediaView(item.image, 'set-media'),
      h('figcaption', { class: 'set-cap' },
        h('span', { class: 'set-card-top' },
          h('span', { class: 'latin set-no' }, pad2(i + 1)),
          item.tag ? h('span', { class: 'set-tag' }, Swatch(item), item.tag) : null),
        h('b', {}, item.title),
        h('small', {}, item.image.caption)))));
  const bar = h('i', { class: 'set-bar-fill' });
  const step = (dir: 1 | -1): void => {
    const card = track.querySelector<HTMLElement>('.set-card');
    // In RTL the track scrolls towards negative scrollLeft.
    track.scrollBy({ left: -dir * (card ? card.offsetWidth + 20 : track.clientWidth * 0.8), behavior: 'smooth' });
  };
  const prev = h('button', { type: 'button', class: 'set-arrow', 'aria-label': 'السابق' }, '→');
  const next = h('button', { type: 'button', class: 'set-arrow', 'aria-label': 'التالي' }, '←');
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  const sync = (): void => {
    const max = track.scrollWidth - track.clientWidth;
    const p = max > 0 ? Math.abs(track.scrollLeft) / max : 1;
    bar.style.setProperty('--p', p.toFixed(3));
    prev.disabled = p <= 0.01;
    next.disabled = p >= 0.99;
  };
  track.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  requestAnimationFrame(sync);
  return [
    h('div', { class: 'wrap set-strip-head' }, Head(c, 'reveal'),
      h('div', { class: 'set-arrows' }, prev, next)),
    h('div', { class: 'wrap' }, track,
      h('div', { class: 'set-bar', 'aria-hidden': 'true' }, bar)),
  ];
};

/** Two looks facing each other across a centred label. */
const duo = (c: Collection): HTMLElement[] => {
  const [a, b] = c.items;
  const side = (item: CollectionItem | undefined, i: number): HTMLElement | null => item
    ? h('figure', { class: `set-side set-side-${i + 1} reveal` },
        MediaView(item.image, 'set-media'),
        h('figcaption', { class: 'set-cap' },
          h('span', { class: 'set-tag' }, Swatch(item), item.tag ?? item.title),
          h('b', {}, item.title),
          h('small', {}, item.image.caption)))
    : null;
  return [h('div', { class: 'wrap' },
    Head(c, 'set-center reveal'),
    h('div', { class: 'set-duo' },
      side(a, 0),
      h('div', { class: 'set-versus', 'aria-hidden': 'true' },
        h('span', {}, a?.tag ?? ''), h('i'), h('span', {}, b?.tag ?? '')),
      side(b, 1)))];
};

const LAYOUTS: Record<Collection['style'], (c: Collection) => HTMLElement[]> = {
  panels, collage, switch: switcher, stagger, strip, duo,
};

export const CollectionSection = (c: Collection, index: number): HTMLElement =>
  h('section', { class: `set set--${c.style}`, id: `collection-${index + 1}`, 'aria-label': c.title },
    ...LAYOUTS[c.style](c));
