import type { ServicePage, Services as ServicesData } from '../../domain/entities';
import { h } from '../dom';
import { icon } from '../icons';
import { Section, stagger } from './shared';

/** Links to the page of each service, which search engines also follow. */
const ServiceLinks = (pages: readonly ServicePage[]): HTMLElement | null =>
  pages.length === 0 ? null :
    h('nav', { class: 'svc-pages reveal', 'aria-label': 'صفحات الخدمات' },
      h('h3', {}, 'خدماتنا بالتفصيل'),
      h('ul', {}, pages.map((p) => h('li', {}, h('a', { href: `services/${p.slug}.html` }, p.heading)))));

export const Services = (data: ServicesData, pages: readonly ServicePage[], number: number): HTMLElement =>
  Section({ id: 'services', number, title: 'خدماتنا', intro: data.intro, className: 'services' },
    h('div', { class: 'svc-grid' },
      data.items.map((s, i) => stagger(h('div', { class: 'svc' }, icon(s.icon), h('p', {}, s.text)), i, 3))),
    h('p', { class: 'note' }, data.note),
    ServiceLinks(pages));
