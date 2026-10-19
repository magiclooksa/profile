import type { Media } from '../../domain/entities';
import { h } from '../dom';
import { pattern } from '../icons';

/** The LM mark, drawn from the logo's alpha so it follows the theme colour. */
export const Mark = (className = ''): HTMLElement =>
  h('i', { class: `mark ${className}`.trim(), 'aria-hidden': 'true' });

/** A photo, or a branded placeholder naming the photo still needed. */
export function MediaView(media: Media, className = ''): HTMLElement {
  if (media.src) {
    return h('figure', { class: `media ${className}`.trim() },
      h('img', { src: media.src, alt: media.caption, loading: 'lazy', decoding: 'async' }));
  }
  return h('div', { class: `media ph ${className}`.trim(), role: 'img', 'aria-label': `صورة مطلوبة: ${media.caption}` },
    pattern(),
    h('div', { class: 'ph-in' }, Mark(), h('span', {}, `صورة: ${media.caption}`)));
}

interface SectionOptions {
  readonly id: string;
  readonly number?: number;
  readonly title: string;
  readonly intro?: string;
  readonly className?: string;
  readonly withPattern?: boolean;
}

export function Section(opts: SectionOptions, ...content: (Node | null)[]): HTMLElement {
  const head = h('div', { class: 's-head reveal' },
    opts.number !== undefined ? h('span', { class: 'no latin' }, String(opts.number).padStart(2, '0')) : null,
    h('h2', {}, opts.title),
    opts.intro ? h('p', {}, opts.intro) : null);
  return h('section', { id: opts.id, class: opts.className ?? '', 'aria-labelledby': undefined },
    opts.withPattern ? pattern() : null,
    h('div', { class: 'wrap' }, head, ...content));
}

/** Staggers reveal animations inside a group. */
export const stagger = (el: HTMLElement, index: number, every = 5): HTMLElement => {
  el.classList.add('reveal');
  el.style.setProperty('--i', String(index % every));
  return el;
};
