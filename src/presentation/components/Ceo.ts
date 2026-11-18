import type { Ceo as CeoData } from '../../domain/entities';
import { h } from '../dom';
import { Section } from './shared';

/** The portrait and the name appear once they are added to the data. */
export const Ceo = (data: CeoData, number: number): HTMLElement =>
  Section({ id: 'ceo', number, title: data.title, className: 'ceo' },
    h('div', { class: data.photo.src ? 'ceo-grid' : 'ceo-grid ceo-grid-text' },
      data.photo.src
        ? h('figure', { class: 'media ceo-portrait reveal' },
          h('img', { src: data.photo.src, alt: data.photo.caption, loading: 'lazy', decoding: 'async' }))
        : null,
      h('div', { class: 'ceo-copy' },
        data.quote ? h('blockquote', { class: 'ceo-quote reveal' }, h('p', {}, data.quote)) : null,
        data.message.map((p) => h('p', { class: 'reveal' }, p)),
        h('footer', { class: 'ceo-sign reveal' },
          data.signature && data.name ? h('img', { class: 'ceo-signature', src: data.signature, alt: `توقيع ${data.name}`, loading: 'lazy' }) : null,
          data.name ? h('strong', {}, data.name) : null,
          h('span', {}, data.role)))));
