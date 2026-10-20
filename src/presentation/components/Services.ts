import type { Services as ServicesData } from '../../domain/entities';
import { h, pad2 } from '../dom';
import { icon } from '../icons';
import { Section, stagger } from './shared';

/** Services as full-width rows; ink rises through a row on hover. */
export const Services = (data: ServicesData, number: number): HTMLElement =>
  Section({ id: 'services', number, title: 'خدماتنا', intro: data.intro, className: 'services' },
    h('ol', { class: 'svc-list' },
      data.items.map((s, i) => stagger(
        h('li', { class: 'svc-row' },
          h('span', { class: 'no latin' }, pad2(i + 1)),
          h('p', {}, s.text),
          icon(s.icon)), i, 6))),
    h('p', { class: 'note reveal' }, data.note));
