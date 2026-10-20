import type { Company } from '../../domain/entities';
import { h } from '../dom';
import { Brand } from './Nav';
import { RoundButton } from './shared';

export const Footer = (company: Company): HTMLElement =>
  h('footer', { class: 'site-footer' },
    h('div', { class: 'wrap' },
      h('div', { class: 'foot-top' }, Brand(company), RoundButton('للأعلى ↑', '#top')),
      h('p', { class: 'foot-word latin', 'aria-hidden': 'true' }, company.name.en),
      h('div', { class: 'foot-bottom' },
        h('p', {}, `© ${new Date().getFullYear()} ${company.name.ar} · ${company.name.en}`),
        h('p', {}, `${company.entityType} ${company.name.ar} ${company.field}`))));
