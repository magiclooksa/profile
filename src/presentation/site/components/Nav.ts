import type { Company } from '../../../domain/entities';
import { h } from '../../shared/dom';
import { Logo } from '../brand';

export interface NavLink { readonly href: string; readonly label: string }

export const Brand = (company: Company): HTMLElement =>
  h('a', { class: 'brand', href: '#top', 'aria-label': `${company.name.ar} ${company.name.en}` },
    Logo('light'));

/** `search` is the site search button, shown at the end of the bar on every screen size. */
export const Nav = (company: Company, links: readonly NavLink[], search: HTMLElement | null = null): HTMLElement =>
  h('nav', { class: 'nav', id: 'nav', 'aria-label': 'التنقل الرئيسي' },
    h('div', { class: 'wrap' },
      Brand(company),
      h('ul', {}, links.map((l) => h('li', {}, h('a', { href: l.href }, l.label)))),
      search));
