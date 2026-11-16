import type { Ceo as CeoData } from '../../domain/entities';
import { h, orPlaceholder } from '../dom';
import { MediaView, Section } from './shared';

/** A 4:5 portrait, cropped to fill; the branded placeholder until a photo is added. */
const Portrait = (data: CeoData): HTMLElement =>
  data.photo.src
    ? h('figure', { class: 'media ceo-portrait reveal' },
      h('img', { src: data.photo.src, alt: data.photo.caption, loading: 'lazy', decoding: 'async' }))
    : MediaView(data.photo, 'ceo-portrait reveal');

export const Ceo = (data: CeoData, number: number): HTMLElement => {
  const name = orPlaceholder(data.name, 'اسم الرئيس التنفيذي');
  return Section({ id: 'ceo', number, title: data.title, className: 'ceo' },
    h('div', { class: 'ceo-grid' },
      Portrait(data),
      h('div', { class: 'ceo-copy' },
        data.quote ? h('blockquote', { class: 'ceo-quote reveal' }, h('p', {}, data.quote)) : null,
        data.message.map((p) => h('p', { class: 'reveal' }, p)),
        h('footer', { class: 'ceo-sign reveal' },
          data.signature ? h('img', { class: 'ceo-signature', src: data.signature, alt: `توقيع ${name}`, loading: 'lazy' }) : null,
          h('strong', {}, name),
          h('span', {}, data.role)))));
};
