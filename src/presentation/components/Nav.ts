import type { Company } from '../../domain/entities';
import { h } from '../dom';
import { Mark } from './shared';

export interface NavLink { readonly id: string; readonly label: string }

export const Brand = (company: Company): HTMLElement =>
  h('a', { class: 'brand', href: '#top', 'aria-label': `${company.name.ar} ${company.name.en}` },
    Mark(),
    h('span', {}, h('b', {}, company.name.ar), h('small', { class: 'latin' }, company.name.en)));

export const Nav = (company: Company, links: readonly NavLink[]): HTMLElement =>
  h('nav', { class: 'nav', id: 'nav', 'aria-label': 'التنقل الرئيسي' },
    h('div', { class: 'wrap' },
      Brand(company),
      h('ul', {}, links.map((l) => h('li', {}, h('a', { href: `#${l.id}` }, l.label))))));
