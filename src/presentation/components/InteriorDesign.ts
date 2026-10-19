import type { Company } from '../../domain/entities';
import { h } from '../dom';
import { pattern } from '../icons';
import { MediaView } from './shared';

export const InteriorDesign = (company: Company): HTMLElement => {
  const { intro, traits, images } = company.interiorDesign;
  return h('section', { class: 'idz band', id: 'interior' },
    pattern(),
    h('div', { class: 'wrap' },
      h('div', { class: 'grid' },
        h('div', { class: 'reveal' },
          h('p', { class: 'latin kicker' }, 'INTERIOR DESIGN'),
          h('h2', {}, 'التصميم الداخلي'),
          h('p', {}, intro),
          h('ul', {}, traits.map((t) => h('li', {}, t)))),
        h('div', { class: 'pair' }, images.map((m) => MediaView(m, 'reveal'))))));
};
