import type { Company } from '../../domain/entities';
import { h, splitWords } from '../dom';
import { pattern } from '../icons';
import { MediaView } from './shared';

export const InteriorDesign = (company: Company): HTMLElement => {
  const { intro, traits, images } = company.interiorDesign;
  const pair = images.map((m, i) => {
    const view = MediaView(m, 'reveal');
    view.dataset.parallax = i % 2 === 0 ? '0.04' : '0.12';
    return view;
  });
  return h('section', { class: 'idz band', id: 'interior' },
    pattern(),
    h('div', { class: 'wrap' },
      h('div', { class: 'grid' },
        h('div', {},
          h('p', { class: 'latin kicker reveal' }, 'INTERIOR DESIGN'),
          h('h2', { class: 'split reveal' }, splitWords('التصميم الداخلي')),
          h('p', { class: 'reveal' }, intro),
          h('ul', { class: 'reveal' }, traits.map((t) => h('li', {}, t)))),
        h('div', { class: 'pair' }, pair))));
};
