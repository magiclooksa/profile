import type { Media } from '../../domain/entities';
import { h } from '../dom';
import { MediaView } from '../components/shared';

/** One large photo beside a grid of smaller ones. */
export const Mosaic = (images: readonly Media[]): HTMLElement =>
  h('div', { class: 'g g-mosaic' }, images.map((m) => MediaView(m)));
