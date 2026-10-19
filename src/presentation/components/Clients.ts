import type { Clients as ClientsData } from '../../domain/entities';
import { h, orPlaceholder } from '../dom';
import { MediaView, Section, stagger } from './shared';

export const Clients = (data: ClientsData, number: number): HTMLElement =>
  Section({ id: 'clients', number, title: 'عملاؤنا', className: 'clients' },
    h('div', { class: 'segs' },
      data.segments.map((s, i) => stagger(h('div', { class: 'seg' }, h('h3', {}, s.title), h('p', {}, s.text)), i))),
    h('h3', { class: 'sub-h' }, 'شركاؤنا'),
    h('div', { class: 'logos' },
      data.partners.map((p) => p.logo
        ? h('div', { class: 'logo-slot' }, h('img', { src: p.logo, alt: p.name ?? 'شعار شريك', loading: 'lazy' }))
        : h('div', { class: 'logo-slot empty' }, orPlaceholder(p.name, 'شعار')))),
    h('h3', { class: 'sub-h' }, 'الشهادات والمشاركات'),
    h('div', { class: 'certs' },
      data.credentials.map((c, i) => stagger(
        h('figure', { class: 'cert' },
          MediaView(c.image),
          h('figcaption', {}, orPlaceholder(c.title, 'شهادة أو اعتماد'))), i))));
