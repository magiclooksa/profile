import type { Film } from '../../domain/entities';
import { h } from '../dom';
import { Mark, MediaView } from './shared';

const Copy = (film: Film, className = ''): HTMLElement =>
  h('div', { class: `film-copy ${className}`.trim() },
    h('p', { class: 'latin film-kicker' }, film.kicker),
    h('h2', {}, film.title),
    h('p', { class: 'film-text' }, film.text));

/** Full-bleed widescreen video with the title laid over the picture. */
const cinema = (film: Film): HTMLElement[] => [
  h('div', { class: 'film-stage' },
    MediaView(film.video, 'film-media'),
    h('div', { class: 'film-shade', 'aria-hidden': 'true' }),
    h('div', { class: 'wrap' }, Copy(film, 'reveal'))),
];

/** Arch-framed video beside numbered points. */
const arch = (film: Film): HTMLElement[] => [
  h('div', { class: 'wrap film-grid' },
    h('div', { class: 'film-portal reveal' },
      h('i', { class: 'film-portal-line', 'aria-hidden': 'true' }),
      MediaView(film.video, 'film-media')),
    h('div', { class: 'reveal' },
      Copy(film),
      film.points.length > 0
        ? h('ol', { class: 'film-points' }, film.points.map((p) => h('li', {}, p)))
        : null)),
];

/** Dark band: drifting brand word behind a gold-cornered frame. */
const frame = (film: Film): HTMLElement[] => [
  h('div', { class: 'film-marquee latin', 'aria-hidden': 'true' },
    h('span', {}, 'MAGIC LOOK · MAGIC LOOK · MAGIC LOOK · '),
    h('span', {}, 'MAGIC LOOK · MAGIC LOOK · MAGIC LOOK · ')),
  h('div', { class: 'wrap' },
    Copy(film, 'film-center reveal'),
    h('div', { class: 'film-box reveal' },
      h('i', { class: 'corner tr' }), h('i', { class: 'corner bl' }),
      MediaView(film.video, 'film-media')),
    film.points.length > 0
      ? h('ul', { class: 'film-chips reveal' }, film.points.map((p) => h('li', {}, p)))
      : null),
];

/** Starts as an inset card and opens to full screen while scrolling. */
const expand = (film: Film): HTMLElement[] => [
  h('div', { class: 'film-sticky' },
    h('div', { class: 'film-window' },
      MediaView(film.video, 'film-media'),
      h('div', { class: 'film-shade', 'aria-hidden': 'true' })),
    h('div', { class: 'wrap' },
      h('div', { class: 'film-overlay' }, Mark(), Copy(film)))),
];

const LAYOUTS: Record<Film['style'], (film: Film) => HTMLElement[]> = { cinema, arch, frame, expand };

export const FilmSection = (film: Film, index: number): HTMLElement =>
  h('section', {
    class: `film film-${film.style}`, id: `film-${index + 1}`, 'aria-label': film.title,
    // The expanding film reaches full size at 60% of its scroll, then holds.
    'data-scroll-progress': film.style === 'expand', 'data-p-span': film.style === 'expand' ? '0.6' : undefined,
  }, ...LAYOUTS[film.style](film));
