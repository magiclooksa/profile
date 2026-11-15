import type { Company } from '../../domain/entities';
import { h } from '../dom';
import { pattern } from '../icons';
import { Logo } from '../brand';

export const Footer = (company: Company): HTMLElement =>
  h('footer', { class: 'site-footer' },
    pattern(),
    h('div', { class: 'wrap' },
      h('a', { class: 'footer-brand', href: '#top', 'aria-label': `${company.name.ar} ${company.name.en}` }, Logo('stacked')),
      h('p', { class: 'footer-tag' }, company.tagline),
      h('p', { class: 'footer-copy' }, `© ${new Date().getFullYear()} ${company.name.ar} · ${company.name.en}`)));
