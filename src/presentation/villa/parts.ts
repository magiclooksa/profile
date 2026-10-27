import type { PhotoRatio, Product, Villa, VillaPhoto } from '../../domain/villa';
import { h, pad2 } from '../dom';
import { openImageViewer } from '../components/ImageViewer';

export const RATIO_CSS: Record<PhotoRatio, string> = { '16:9': '16 / 9', '3:4': '3 / 4', '9:16': '9 / 16', '1:1': '1 / 1' };
export const RATIO_VALUE: Record<PhotoRatio, number> = { '16:9': 16 / 9, '3:4': 3 / 4, '9:16': 9 / 16, '1:1': 1 };

/** The image viewer only knows the two video formats; any other shape is read from the file. */
const viewerRatio = (r: PhotoRatio): '16:9' | '9:16' | 'auto' => (r === '16:9' || r === '9:16' ? r : 'auto');

export const zoomInto = (photo: VillaPhoto): void => openImageViewer(photo.src, photo.caption, viewerRatio(photo.ratio));

interface PhotoOptions {
  readonly className?: string;
  /** Show the caption under the photo, after this small label (such as "Fig. 1.2"). */
  readonly label?: string;
  readonly caption?: boolean;
  readonly eager?: boolean;
}

/** A photo in a frame of its own shape, with a button that opens it full screen. */
export function Photo(photo: VillaPhoto, opts: PhotoOptions = {}): HTMLElement {
  const zoom = h('button', { type: 'button', class: 'v-zoom', 'aria-label': `تكبير الصورة: ${photo.caption}` },
    h('span', { 'aria-hidden': 'true' }, '⤢'));
  zoom.addEventListener('click', () => zoomInto(photo));
  const showCaption = opts.caption ?? opts.label !== undefined;
  return h('figure', { class: `v-photo ${opts.className ?? ''}`.trim(), style: `--ratio: ${RATIO_VALUE[photo.ratio]}` },
    h('span', { class: 'v-frame', style: `aspect-ratio: ${RATIO_CSS[photo.ratio]}` },
      h('img', { src: photo.src, alt: photo.caption, loading: opts.eager ? 'eager' : 'lazy', decoding: 'async' }),
      zoom),
    showCaption
      ? h('figcaption', {}, opts.label ? h('span', { class: 'latin v-fig' }, opts.label) : null, photo.caption)
      : null);
}

/** A running head, like the top line of a printed catalogue page. */
export const Folio = (right: string, left: string): HTMLElement =>
  h('p', { class: 'v-folio', 'aria-hidden': 'true' }, h('span', {}, right), h('i'), h('span', { class: 'latin' }, left));

interface Forms { readonly one: string; readonly two: string; readonly few: string; readonly many: string }

/** Arabic counting: one and two have their own words, 3 to 10 take the plural, 11 and up the singular. */
export const plural = (n: number, f: Forms): string => {
  if (n === 1) return f.one;
  if (n === 2) return f.two;
  return `${n} ${n >= 3 && n <= 10 ? f.few : f.many}`;
};

export const PIECES: Forms = { one: 'قطعة واحدة', two: 'قطعتان', few: 'قطع', many: 'قطعة' };
export const SPACES: Forms = { one: 'مساحة واحدة', two: 'مساحتان', few: 'مساحات', many: 'مساحة' };
export const MATERIALS: Forms = { one: 'خامة واحدة', two: 'خامتان', few: 'خامات', many: 'خامة' };

/** Catalogue numbers follow the order of the pieces: N° 01, N° 02… */
export const pieceNo = (villa: Villa, id: string): string => pad2(villa.products.findIndex((p) => p.id === id) + 1);

export const piecesIn = (villa: Villa, spaceId: string): Product[] => villa.products.filter((p) => p.spaces.includes(spaceId));

/** The materials of these pieces, in the order of the materials library. */
export const materialsOf = (villa: Villa, pieces: readonly Product[]): Villa['materials'][number][] =>
  villa.materials.filter((m) => pieces.some((p) => p.materials.includes(m.id)));

/** Small coloured dots for a piece's materials. */
export const MaterialDots = (villa: Villa, product: Product): HTMLElement =>
  h('span', { class: 'v-dots', 'aria-hidden': 'true' },
    product.materials.map((id) => {
      const m = villa.materials.find((x) => x.id === id);
      return m ? h('i', { style: `--swatch: ${m.color}`, title: m.name }) : null;
    }));
