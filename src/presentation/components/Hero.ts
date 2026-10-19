import type { Company } from '../../domain/entities';
import { h } from '../dom';
import { pattern } from '../icons';
import { Mark } from './shared';

export const Hero = (company: Company): HTMLElement =>
  h('header', { class: 'hero', id: 'top' },
    pattern(),
    h('div', { class: 'wrap' },
      h('div', { class: 'hero-copy' },
        h('p', { class: 'eyebrow' }, 'الملف التعريفي'),
        h('h1', {}, `${company.entityType} ${company.name.ar}`),
        h('p', { class: 'latin name-en' }, company.name.en),
        h('p', { class: 'sub' }, company.field),
        h('p', { class: 'tag' }, company.tagline),
        h('div', { class: 'ctas' },
          h('a', { class: 'btn solid', href: '#works' }, 'شاهد أعمالنا'),
          h('a', { class: 'btn ghost', href: '#contact' }, 'تواصل معنا'))),
      h('div', { class: 'hero-art', 'aria-hidden': 'true' },
        h('div', { class: 'frame' },
          h('div', { class: 'ring' }), h('div', { class: 'ring r2' }),
          h('i', { class: 'corner tr' }), h('i', { class: 'corner bl' }),
          Mark('big')))));
