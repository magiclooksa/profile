import type { Advantages as AdvantagesData, Company } from '../../domain/entities';
import { h, pad2 } from '../dom';
import { Section } from './shared';

export const Advantages = (data: AdvantagesData, company: Company, number: number): HTMLElement =>
  Section({ id: 'why', number, title: `لماذا ${company.name.ar}؟`, className: 'why' },
    h('div', { class: 'grid' },
      h('ol', {}, data.items.map((a, i) =>
        h('li', { class: 'reveal' },
          h('span', { class: 'latin' }, pad2(i + 1)),
          h('div', {}, h('h3', {}, a.title), h('p', {}, a.text)))))));
