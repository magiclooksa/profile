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

const LAYOUTS: Record<Collection['style'], (c: Collection) => HTMLElement[]> = {
  panels, collage, switch: switcher, stagger,
};

export const CollectionSection = (c: Collection, index: number): HTMLElement =>
  h('section', { class: `set set--${c.style}`, id: `collection-${index + 1}`, 'aria-label': c.title },
    ...LAYOUTS[c.style](c));
