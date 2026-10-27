import type { Product, Villa, VillaPhoto } from '../../domain/villa';
import { h, pad2 } from '../dom';
import { zoomInto } from './parts';

export interface ProductSheet {
  open(id: string): void;
}

/**
 * One catalogue page per piece, in a modal dialog: its photos (the piece, close-ups and in the villa)
 * beside its materials, finish and place. Arrows page through the whole catalogue.
 */
export function createProductSheet(villa: Villa, goToSpace: (spaceId: string) => void): ProductSheet {
  const n = villa.products.length;
  let index = 0;
  let current: VillaPhoto | null = null;
  let trigger: Element | null = null;
  let previousOverflow = '';

  const counter = h('span', { class: 'latin v-sheet-count' });
  const category = h('span', { class: 'v-sheet-cat' });
  // Right to left: the previous piece sits on the right, the next on the left.
  const prev = h('button', { type: 'button', class: 'v-sheet-nav', 'aria-label': 'القطعة السابقة' },
    h('span', { 'aria-hidden': 'true' }, '→'), h('span', { class: 'v-sheet-nav-text' }, 'السابقة'));
  const next = h('button', { type: 'button', class: 'v-sheet-nav', 'aria-label': 'القطعة التالية' },
    h('span', { class: 'v-sheet-nav-text' }, 'التالية'), h('span', { 'aria-hidden': 'true' }, '←'));
  const close = h('button', { type: 'button', class: 'v-sheet-close', 'aria-label': 'إغلاق صفحة القطعة' }, '×');

  const stageImg = h('img', { alt: '', decoding: 'async' });
  const zoom = h('button', { type: 'button', class: 'v-zoom', 'aria-label': 'تكبير الصورة' }, h('span', { 'aria-hidden': 'true' }, '⤢'));
  const frame = h('span', { class: 'v-sheet-frame' }, stageImg, zoom);
  const stageCaption = h('figcaption', {});
  const thumbs = h('div', { class: 'v-sheet-thumbs' });

  const no = h('p', { class: 'latin v-sheet-no', 'aria-hidden': 'true' });
  const title = h('h2', { id: 'v-sheet-title' });
  const en = h('p', { class: 'latin v-sheet-en' });
  const text = h('p', { class: 'v-sheet-text' });
  const specs = h('dl', { class: 'v-specs' });
  const body = h('div', { class: 'v-sheet-body' },
    h('div', { class: 'v-sheet-gallery' }, h('figure', { class: 'v-sheet-stage' }, frame, stageCaption), thumbs),
    h('div', { class: 'v-sheet-info' }, no, title, en, text, specs,
      h('a', { class: 'v-btn', href: 'index.html#contact' }, 'اطلب قطعة مماثلة', h('span', { 'aria-hidden': 'true' }, '←'))));
  const dialog = h('dialog', { class: 'v-sheet', 'aria-labelledby': 'v-sheet-title' },
    h('div', { class: 'v-sheet-bar' }, counter, category, h('span', { class: 'v-sheet-navs' }, prev, next), close),
    body);

  stageImg.addEventListener('load', () => frame.classList.remove('is-loading'));
  zoom.addEventListener('click', () => { if (current) zoomInto(current) });

  const show = (photo: VillaPhoto, button: HTMLButtonElement | null): void => {
    current = photo;
    if (stageImg.getAttribute('src') !== photo.src) {
      frame.classList.add('is-loading');
      stageImg.src = photo.src;
    }
    stageImg.alt = photo.caption;
    stageCaption.textContent = photo.caption;
    zoom.setAttribute('aria-label', `تكبير الصورة: ${photo.caption}`);
    thumbs.querySelectorAll('.v-thumb').forEach((t) => t.setAttribute('aria-pressed', String(t === button)));
  };

  const group = (label: string, photos: readonly VillaPhoto[]): HTMLElement | null => photos.length === 0 ? null
    : h('div', { class: 'v-thumb-group' }, h('p', {}, label),
      h('div', {}, photos.map((photo) => {
        const b = h('button', { type: 'button', class: 'v-thumb', 'aria-pressed': 'false', 'aria-label': photo.caption },
          h('img', { src: photo.src, alt: '', loading: 'lazy', decoding: 'async' }));
        b.addEventListener('click', () => show(photo, b));
        return b;
      })));

  const row = (label: string, ...content: (Node | string)[]): HTMLElement =>
    h('div', {}, h('dt', {}, label), h('dd', {}, ...content));

  const places = (p: Product): (Node | string)[] => p.spaces.flatMap((id, i) => {
    const space = villa.spaces.find((s) => s.id === id);
    if (!space) return [];
    const link = h('button', { type: 'button', class: 'v-link' }, space.name);
    link.addEventListener('click', () => { dialog.close(); goToSpace(id) });
    return i === 0 ? [link] : ['، ', link];
  });

  const render = (i: number): void => {
    index = (i + n) % n;
    const p = villa.products[index];
    if (!p) return;
    counter.textContent = `N° ${pad2(index + 1)} / ${pad2(n)}`;
    category.textContent = p.custom ? `${p.category} · بالمقاس` : p.category;
    no.textContent = `N° ${pad2(index + 1)}`;
    title.textContent = p.name;
    en.textContent = p.en;
    text.textContent = p.text;
    thumbs.replaceChildren(...[
      group(p.views.length > 1 ? 'من كل زاوية' : 'القطعة', p.views),
      group('عن قرب', p.details),
      group('في الفيلا', p.inSitu),
    ].filter((g): g is HTMLElement => g !== null));
    const materials = p.materials.flatMap((id) => villa.materials.filter((m) => m.id === id));
    specs.replaceChildren(
      row('الخامات', h('ul', { class: 'v-spec-mats' }, materials.map((m) =>
        h('li', {}, h('img', { src: m.swatch, alt: '', loading: 'lazy', decoding: 'async' }), m.name)))),
      row('التشطيب', p.finish),
      row(p.spaces.length > 1 ? 'الأماكن' : 'المكان', ...places(p)),
      row('التنفيذ', p.custom ? 'مصنوعة بمقاس المكان' : 'قطعة مستقلة من مجموعة الفيلا'));
    const first = p.views[0] ?? p.inSitu[0] ?? p.details[0];
    if (first) show(first, thumbs.querySelector<HTMLButtonElement>('.v-thumb'));
    body.scrollTo({ top: 0 });
    // Each piece has its own address, so it can be shared.
    history.replaceState(null, '', `#piece-${p.id}`);
  };

  prev.addEventListener('click', () => render(index - 1));
  next.addEventListener('click', () => render(index + 1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close() });
  dialog.addEventListener('keydown', (e) => {
    if (document.querySelector('.image-viewer[open]')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); render(index + 1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); render(index - 1) }
  });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    history.replaceState(null, '', location.pathname + location.search);
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
  });
  document.body.append(dialog);

  return {
    open(id: string): void {
      const i = villa.products.findIndex((p) => p.id === id);
      if (i < 0) return;
      render(i);
      if (dialog.open) return;
      trigger = document.activeElement;
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal();
      close.focus();
    },
  };
}
