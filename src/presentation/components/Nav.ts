import type { Company } from '../../domain/entities';
import { h, pad2 } from '../dom';
import { pattern } from '../icons';
import { Mark, RollText } from './shared';

export interface NavLink { readonly id: string; readonly label: string }

export const Brand = (company: Company): HTMLElement =>
  h('a', { class: 'brand', href: '#top', 'aria-label': `${company.name.ar} ${company.name.en}` },
    Mark(),
    h('span', {}, h('b', {}, company.name.ar), h('small', { class: 'latin' }, company.name.en)));

export const Nav = (company: Company, links: readonly NavLink[]): HTMLElement =>
  h('nav', { class: 'nav', id: 'nav', 'aria-label': 'التنقل الرئيسي' },
    h('div', { class: 'wrap' },
      Brand(company),
      h('ul', { class: 'nav-links' },
        links.map((l) => h('li', {}, h('a', { href: `#${l.id}` }, RollText(l.label))))),
      h('button', {
        type: 'button', class: 'menu-btn', id: 'menu-btn', 'aria-expanded': 'false',
        'aria-controls': 'site-menu', 'aria-label': 'فتح القائمة', 'data-magnetic': '0.4',
      }, h('span', { class: 'mag-inner' },
        h('span', { class: 'menu-lbl' }, 'القائمة'),
        h('i', { class: 'burger', 'aria-hidden': 'true' }, h('b'), h('b'))))));

/** The full-screen menu panel, wired by initMenu. */
export const Menu = (company: Company, links: readonly NavLink[]): HTMLElement =>
  h('div', { class: 'menu', id: 'site-menu', 'aria-hidden': 'true', inert: true },
    h('div', { class: 'menu-shade' }),
    h('div', { class: 'menu-panel', role: 'dialog', 'aria-label': 'القائمة' },
      pattern(),
      h('p', { class: 'menu-kicker' }, 'القائمة'),
      h('ol', { class: 'menu-links' },
        links.map((l, i) => h('li', { style: `--i:${i}` },
          h('a', { href: `#${l.id}` }, h('span', { class: 'latin' }, pad2(i + 1)), RollText(l.label))))),
      h('div', { class: 'menu-foot' },
        Mark(),
        h('div', {}, h('p', { class: 'latin' }, company.name.en), h('p', {}, company.tagline)))));
