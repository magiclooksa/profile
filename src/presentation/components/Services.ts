import type { Services as ServicesData } from '../../domain/entities';
import { h } from '../dom';
import { icon } from '../icons';
import { Section, stagger } from './shared';

export const Services = (data: ServicesData, number: number): HTMLElement =>
  Section({ id: 'services', number, title: 'خدماتنا', intro: data.intro, className: 'services' },
    h('div', { class: 'svc-grid' },
      data.items.map((s, i) => stagger(h('div', { class: 'svc' }, icon(s.icon), h('p', {}, s.text)), i, 3))),
    h('p', { class: 'note' }, data.note));
