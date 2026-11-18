import type { Clients as ClientsData } from '../../domain/entities';
import { h } from '../dom';
import { MediaView, Section, stagger } from './shared';

/** Partners and credentials appear once they have a logo or a photo. */
export const Clients = (data: ClientsData, number: number): HTMLElement => {
  const partners = data.partners.filter((p) => p.logo);
  const credentials = data.credentials.filter((c) => c.image.src);
  return Section({ id: 'clients', number, title: 'عملاؤنا', className: 'clients' },
    h('div', { class: 'segs' },
      data.segments.map((s, i) => stagger(h('div', { class: 'seg' }, h('h3', {}, s.title), h('p', {}, s.text)), i))),
    partners.length > 0 ? h('h3', { class: 'sub-h' }, 'شركاؤنا') : null,
    partners.length > 0 ? h('div', { class: 'logos' },
      partners.map((p) => h('div', { class: 'logo-slot' }, h('img', { src: p.logo, alt: p.name ?? 'شعار شريك', loading: 'lazy' })))) : null,
    credentials.length > 0 ? h('h3', { class: 'sub-h' }, 'الشهادات والمشاركات') : null,
    credentials.length > 0 ? h('div', { class: 'certs' },
      credentials.map((c, i) => stagger(
        h('figure', { class: 'cert' },
          MediaView(c.image),
          c.title ? h('figcaption', {}, c.title) : null), i))) : null);
};
