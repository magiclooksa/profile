import type { Company } from '../../domain/entities';
import { h, splitWords } from '../dom';
import { pattern } from '../icons';
import { Button, Mark, MediaView } from './shared';

/**
 * Oversized headline in the brand's ink: the name in bold, the field in light,
 * with a rounded photo pill set between them like a word.
 */
export function Hero(company: Company): HTMLElement {
  const nameWords = `${company.entityType} ${company.name.ar}`;
  const nameCount = nameWords.trim().split(/\s+/).length;
  const pillImage = company.hero?.poster ?? company.about.image.src;
  return h('header', { class: 'hero', id: 'top' },
    pattern(),
    h('div', { class: 'wrap' },
      h('p', { class: 'eyebrow' }, Mark(), 'الملف التعريفي'),
      h('h1', { class: 'hero-title split' },
        h('span', { class: 't-bold' }, splitWords(nameWords)),
        ' ',
        h('span', { class: 'w pill-w', 'aria-hidden': 'true' },
          h('span', { class: 'hero-pill' }, pillImage ? h('img', { src: pillImage, alt: '' }) : Mark())),
        ' ',
        h('span', { class: 't-light' }, splitWords(company.field, nameCount + 1))),
      h('div', { class: 'hero-foot' },
        h('p', { class: 'latin name-en' }, company.name.en),
        h('p', { class: 'tag' }, company.tagline),
        h('div', { class: 'ctas' },
          Button('شاهد أعمالنا', '#works', 'solid'),
          Button('تواصل معنا', '#contact')))));
}

/** The hero video as a showreel that opens up to the full width while scrolling. */
export function Reel(company: Company): HTMLElement | null {
  if (!company.hero?.src) return null;
  return h('section', { class: 'reel', id: 'reel', 'aria-label': company.hero.caption, 'data-grow': '' },
    h('div', { class: 'reel-frame' }, MediaView(company.hero, 'reel-media')));
}
