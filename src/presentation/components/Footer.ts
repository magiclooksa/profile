import type { Company } from '../../domain/entities';
import { h } from '../dom';
import { Brand } from './Nav';

export const Footer = (company: Company): HTMLElement =>
  h('footer', { class: 'site-footer' },
    h('div', { class: 'wrap' },
      Brand(company),
      h('p', {}, `© ${new Date().getFullYear()} ${company.name.ar} · ${company.name.en}`)));
