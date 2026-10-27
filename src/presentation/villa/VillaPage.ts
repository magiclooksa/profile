import type { Space, SpreadPhoto, Villa } from '../../domain/villa';
import { initReveal } from '../behaviors/reveal';
import { h, pad2 } from '../dom';
import { createProductSheet } from './ProductSheet';
import {
  Folio, MATERIALS, MaterialDots, PIECES, Photo, SPACES, materialsOf, pieceNo, piecesIn, plural,
} from './parts';

type OpenPiece = (id: string) => void;

/** One line of the contents: a chapter of the catalogue. */
interface Entry {
  readonly id: string;
  readonly no: string;
  readonly title: string;
  readonly en: string;
  readonly meta: string;
  readonly image: string;
}

const entriesOf = (v: Villa): Entry[] => [
  ...v.spaces.map((s, i) => ({
    id: `space-${s.id}`, no: pad2(i + 1), title: s.name, en: s.en,
    meta: plural(piecesIn(v, s.id).length, PIECES), image: s.look.image.src,
  })),
  {
    id: 'materials', no: pad2(v.spaces.length + 1), title: 'مكتبة الخامات', en: 'Materials',
    meta: plural(v.materials.length, MATERIALS), image: v.materials[0]?.swatch ?? v.cover.src,
  },
  {
    id: 'collection', no: pad2(v.spaces.length + 2), title: 'كتالوج القطع', en: 'The collection',
    meta: plural(v.products.length, PIECES), image: v.collection.image.src,
  },
];

/** The word that goes after a big number, without repeating the number. */
const noun = (n: number, f: typeof PIECES): string => {
  if (n === 1) return f.one.split(' ')[0] ?? f.one;
  if (n === 2) return f.two;
  return n <= 10 ? f.few : f.many;
};

const Intro = (v: Villa): HTMLElement => {
  const custom = v.products.filter((p) => p.custom).length;
  const stat = (n: number, label: string): HTMLElement => h('li', {}, h('b', { class: 'latin' }, pad2(n)), h('span', {}, label));
  return h('section', { class: 'v-sec v-intro', id: 'intro', 'data-title': 'المقدمة' },
    h('div', { class: 'wrap' },
      Folio('المقدمة', 'Preface'),
      h('div', { class: 'v-intro-grid' },
        h('div', { class: 'v-intro-text' },
          h('p', { class: 'v-lead reveal' }, v.intro.lead),
          h('div', { class: 'v-intro-body reveal' }, v.intro.paragraphs.map((p) => h('p', {}, p))),
          h('ul', { class: 'v-words reveal', 'aria-label': 'الفيلا في كلمات' },
            v.intro.words.map((w, i) => h('li', {},
              h('span', { class: 'latin v-words-no' }, pad2(i + 1)), h('b', {}, w.ar), h('span', { class: 'latin' }, w.en))))),
        h('div', { class: 'v-intro-media reveal' },
          Photo(v.intro.image, { className: 'v-intro-main', caption: true }),
          Photo(v.intro.inset, { className: 'v-intro-inset' }))),
      h('ul', { class: 'v-stats reveal' },
        stat(v.spaces.length, noun(v.spaces.length, SPACES)),
        stat(v.products.length, noun(v.products.length, PIECES)),
        stat(v.materials.length, noun(v.materials.length, MATERIALS)),
        stat(custom, 'صُنعت بالمقاس'))));
};

const Contents = (entries: readonly Entry[]): HTMLElement => {
  const previewImg = h('img', { alt: '', decoding: 'async', src: entries[0]?.image ?? '' });
  const preview = h('figure', { class: 'v-toc-preview', 'aria-hidden': 'true', 'data-no': entries[0]?.no ?? '' }, previewImg);
  const rows = entries.map((e) => {
    const link = h('a', { class: 'v-toc-row', href: `#${e.id}` },
      h('span', { class: 'latin v-toc-no' }, e.no),
      h('span', { class: 'v-toc-name' }, h('b', {}, e.title), h('small', { class: 'latin' }, e.en)),
      h('span', { class: 'v-toc-dots', 'aria-hidden': 'true' }),
      h('span', { class: 'v-toc-meta' }, e.meta));
    const show = (): void => {
      if (previewImg.getAttribute('src') !== e.image) previewImg.src = e.image;
      preview.dataset.no = e.no;
    };
    link.addEventListener('mouseenter', show);
    link.addEventListener('focus', show);
    return h('li', {}, link);
  });
  return h('section', { class: 'v-sec v-contents', id: 'contents', 'data-title': 'الفهرس' },
    h('div', { class: 'wrap' },
      Folio('الفهرس', 'Contents'),
      h('div', { class: 'v-toc' },
        h('div', {}, h('h2', { class: 'v-sec-title reveal' }, 'الفهرس'), h('ol', { class: 'v-toc-list reveal' }, rows)),
        preview)));
};

/** Splits a spread into rows of 12 columns; each row is laid out at one height. */
const rowsOf = (photos: readonly SpreadPhoto[]): SpreadPhoto[][] => {
  const rows: SpreadPhoto[][] = [];
  let row: SpreadPhoto[] = [];
  let width = 0;
  for (const p of photos) {
    row.push(p);
    width += p.span;
    if (width >= 12) { rows.push(row); row = []; width = 0 }
  }
  if (row.length > 0) rows.push(row);
  return rows;
};

/** A horizontal strip that a mouse can also drag. */
const dragScroll = (track: HTMLElement): void => {
  let startX = 0;
  let startScroll = 0;
  let moved = false;
  let dragging = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target as Element).closest('button')) return;
    dragging = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) { moved = true; track.classList.add('is-dragging') }
    track.scrollLeft = startScroll - dx;
  });
  const end = (): void => { dragging = false; track.classList.remove('is-dragging') };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);
  // A drag that ends over a photo must not count as a click on it.
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }, true);
};

const Chapter = (v: Villa, s: Space, i: number, openPiece: OpenPiece): HTMLElement => {
  const no = pad2(i + 1);
  const pieces = piecesIn(v, s.id);
  const spotsByPiece = new Map<string, HTMLElement[]>();
  const itemsByPiece = new Map<string, HTMLElement>();
  const hint = (id: string, on: boolean): void => {
    spotsByPiece.get(id)?.forEach((el) => el.classList.toggle('is-hint', on));
    itemsByPiece.get(id)?.classList.toggle('is-hint', on);
  };

  const spots = s.look.spots.flatMap((spot) => {
    const p = v.products.find((x) => x.id === spot.product);
    if (!p) return [];
    const tipSide = `${spot.x > 72 ? ' to-left' : spot.x < 28 ? ' to-right' : ''}${spot.y < 26 ? ' to-bottom' : ''}`;
    const b = h('button', {
      type: 'button', class: 'v-spot', style: `left: ${spot.x}%; top: ${spot.y}%`,
      'aria-label': `N° ${pieceNo(v, p.id)} ${p.name}: افتح صفحة القطعة`,
    },
    h('span', { class: 'latin v-spot-no', 'aria-hidden': 'true' }, pieceNo(v, p.id)),
    h('span', { class: `v-spot-tip${tipSide}`, 'aria-hidden': 'true' }, h('b', {}, p.name), h('small', {}, p.category)));
    b.addEventListener('click', () => openPiece(p.id));
    b.addEventListener('mouseenter', () => hint(p.id, true));
    b.addEventListener('mouseleave', () => hint(p.id, false));
    spotsByPiece.set(p.id, [...(spotsByPiece.get(p.id) ?? []), b]);
    return [b];
  });

  const list = pieces.map((p) => {
    const b = h('button', { type: 'button', class: 'v-look-item' },
      h('span', { class: 'v-look-thumb' }, h('img', { src: p.card, alt: '', loading: 'lazy', decoding: 'async' })),
      h('span', { class: 'latin v-no' }, pieceNo(v, p.id)),
      h('b', {}, p.name),
      h('small', {}, p.category));
    b.addEventListener('click', () => openPiece(p.id));
    b.addEventListener('mouseenter', () => hint(p.id, true));
    b.addEventListener('mouseleave', () => hint(p.id, false));
    b.addEventListener('focus', () => hint(p.id, true));
    b.addEventListener('blur', () => hint(p.id, false));
    itemsByPiece.set(p.id, b);
    return h('li', {}, b);
  });

  let fig = 0;
  const spread = h('div', { class: 'v-spread' }, rowsOf(s.gallery).map((row) =>
    h('div', { class: 'v-spread-row reveal' }, row.map((photo) => Photo(photo, { label: `Fig. ${i + 1}.${++fig}` })))));

  const track = h('div', { class: 'v-close-track', tabindex: '0', role: 'region', 'aria-label': `${s.name}: تفاصيل عن قرب` },
    s.details.map((d) => {
      const figure = Photo(d, { className: 'v-close', caption: true });
      const p = d.product ? v.products.find((x) => x.id === d.product) : undefined;
      if (p) {
        const link = h('button', { type: 'button', class: 'v-close-link' },
          h('span', { class: 'latin' }, `N° ${pieceNo(v, p.id)}`), p.name, h('span', { 'aria-hidden': 'true' }, '←'));
        link.addEventListener('click', () => openPiece(p.id));
        figure.append(link);
      }
      return figure;
    }));
  dragScroll(track);
  const step = (dir: 1 | -1): void => {
    // In this right-to-left strip, "next" scrolls towards the left.
    track.scrollBy({ left: -dir * track.clientWidth * 0.8, behavior: 'smooth' });
  };
  const prev = h('button', { type: 'button', class: 'v-arrow', 'aria-label': 'التفاصيل السابقة' }, '→');
  const next = h('button', { type: 'button', class: 'v-arrow', 'aria-label': 'التفاصيل التالية' }, '←');
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  return h('section', { class: `v-sec v-chapter v-chapter-${s.id}`, id: `space-${s.id}`, 'data-title': s.name, 'data-no': no },
    h('div', { class: 'wrap' },
      Folio(`الفصل ${no}`, s.en),
      h('header', { class: 'v-chap-head' },
        h('span', { class: 'latin v-chap-no reveal', 'aria-hidden': 'true' }, no),
        h('div', { class: 'v-chap-title reveal' },
          h('p', { class: 'v-kicker' }, `الفصل ${no}`), h('h2', {}, s.name), h('p', { class: 'latin v-chap-en' }, s.en)),
        h('div', { class: 'v-chap-intro reveal' },
          h('p', {}, s.intro),
          h('ul', { class: 'v-chips', 'aria-label': 'خامات هذه المساحة' },
            materialsOf(v, pieces).map((m) => h('li', {}, h('i', { style: `--swatch: ${m.color}`, 'aria-hidden': 'true' }), m.name))))),
      h('div', { class: 'v-look reveal' },
        h('figure', { class: 'v-look-photo' },
          h('span', { class: 'v-look-frame' },
            h('img', { src: s.look.image.src, alt: s.look.image.caption, loading: 'lazy', decoding: 'async' }),
            ...spots),
          h('figcaption', {}, h('span', { class: 'v-look-hint' }, 'اضغط على الأرقام لتفتح القطع'), s.look.image.caption)),
        h('aside', { class: 'v-look-list', 'aria-label': `قطع ${s.name}` },
          h('p', { class: 'v-label' }, `في ${s.name}`),
          h('p', { class: 'v-look-count' }, plural(pieces.length, PIECES)),
          h('ol', {}, list))),
      spread,
      s.details.length > 0
        ? h('div', { class: 'v-close-ups' },
            h('div', { class: 'v-close-head reveal' },
              h('h3', {}, 'عن قرب'), h('p', { class: 'latin' }, 'Close-ups'), h('div', { class: 'v-arrows' }, prev, next)),
            track)
        : null));
};

const Materials = (v: Villa, no: string, pick: (id: string) => void): HTMLElement =>
  h('section', { class: 'v-sec v-materials', id: 'materials', 'data-title': 'مكتبة الخامات', 'data-no': no },
    h('div', { class: 'wrap' },
      Folio(`الفصل ${no}`, 'Materials'),
      h('header', { class: 'v-sec-head reveal' },
        h('span', { class: 'latin v-chap-no', 'aria-hidden': 'true' }, no),
        h('div', {},
          h('p', { class: 'v-kicker' }, `الفصل ${no}`),
          h('h2', {}, 'مكتبة الخامات'),
          h('p', {}, `${plural(v.materials.length, MATERIALS)} طبيعية تتكرر في أرجاء الفيلا وتربط مساحاتها ببعض. اضغط على أي خامة لترى القطع المصنوعة منها.`))),
      h('ul', { class: 'v-mats' }, v.materials.map((m, i) => {
        const count = v.products.filter((p) => p.materials.includes(m.id)).length;
        const b = h('button', { type: 'button', class: 'v-mat', 'aria-label': `${m.name}: اعرض القطع المصنوعة منها` },
          h('span', { class: 'v-mat-swatch' }, h('img', { src: m.swatch, alt: '', loading: 'lazy', decoding: 'async' })),
          h('span', { class: 'latin v-mat-no' }, pad2(i + 1)),
          h('b', {}, m.name),
          h('small', { class: 'latin' }, m.en),
          h('span', { class: 'v-mat-note' }, m.note),
          h('span', { class: 'v-mat-count' }, `في ${plural(count, PIECES)}`, h('i', { 'aria-hidden': 'true' }, '←')));
        b.addEventListener('click', () => pick(m.id));
        return h('li', { class: 'reveal' }, b);
      }))));

interface CollectionView {
  readonly el: HTMLElement;
  showMaterial(id: string): void;
}

const Collection = (v: Villa, no: string, openPiece: OpenPiece): CollectionView => {
  let space: string | null = null;
  let customOnly = false;
  let material: string | null = null;

  const cards = v.products.map((p, i) => {
    const alt = p.inSitu[0] ?? p.details[0];
    const b = h('button', { type: 'button', class: 'v-card', 'aria-label': `N° ${pad2(i + 1)} ${p.name}: افتح صفحة القطعة` },
      h('span', { class: 'v-card-media' },
        h('img', { src: p.card, alt: '', loading: 'lazy', decoding: 'async' }),
        alt ? h('img', { class: 'v-card-alt', src: alt.src, alt: '', loading: 'lazy', decoding: 'async' }) : null,
        p.custom ? h('span', { class: 'v-card-badge' }, 'بالمقاس') : null),
      h('span', { class: 'v-card-meta' }, h('span', { class: 'latin v-card-no' }, `N° ${pad2(i + 1)}`), MaterialDots(v, p)),
      h('b', {}, p.name),
      h('small', {}, p.category));
    b.addEventListener('click', () => openPiece(p.id));
    return { p, li: h('li', {}, b) };
  });

  const filter = (label: string): HTMLButtonElement =>
    h('button', { type: 'button', class: 'v-filter', 'aria-pressed': 'false' }, label);
  const spaceFilters = [null, ...v.spaces.map((s) => s.id)].map((id) => {
    const b = filter(id === null ? 'الكل' : v.spaces.find((s) => s.id === id)?.name ?? id);
    b.addEventListener('click', () => { space = id; apply() });
    return { id, b };
  });
  const customFilter = filter('صُنعت بالمقاس');
  customFilter.addEventListener('click', () => { customOnly = !customOnly; apply() });
  const materialFilter = h('button', { type: 'button', class: 'v-filter v-filter-mat', hidden: true });
  materialFilter.addEventListener('click', () => { material = null; apply() });
  const count = h('p', { class: 'v-filter-count', 'aria-live': 'polite' });
  const empty = h('p', { class: 'v-empty', hidden: true }, 'لا توجد قطع بهذا الاختيار.');

  const apply = (): void => {
    let shown = 0;
    for (const { p, li } of cards) {
      const match = (space === null || p.spaces.includes(space)) && (!customOnly || p.custom)
        && (material === null || p.materials.includes(material));
      li.hidden = !match;
      if (match) shown += 1;
    }
    spaceFilters.forEach(({ id, b }) => b.setAttribute('aria-pressed', String(id === space)));
    customFilter.setAttribute('aria-pressed', String(customOnly));
    const m = material === null ? undefined : v.materials.find((x) => x.id === material);
    materialFilter.hidden = !m;
    if (m) {
      materialFilter.replaceChildren(h('i', { style: `--swatch: ${m.color}`, 'aria-hidden': 'true' }), `الخامة: ${m.name}`,
        h('span', { 'aria-hidden': 'true' }, '×'));
      materialFilter.setAttribute('aria-label', `إلغاء تصفية الخامة: ${m.name}`);
    }
    count.textContent = plural(shown, PIECES);
    empty.hidden = shown > 0;
  };
  apply();

  const el = h('section', { class: 'v-sec v-collection', id: 'collection', 'data-title': 'كتالوج القطع', 'data-no': no },
    h('div', { class: 'wrap' },
      Folio(`الفصل ${no}`, 'The collection'),
      h('header', { class: 'v-sec-head reveal' },
        h('span', { class: 'latin v-chap-no', 'aria-hidden': 'true' }, no),
        h('div', {}, h('p', { class: 'v-kicker' }, `الفصل ${no}`), h('h2', {}, 'كتالوج القطع'), h('p', {}, v.collection.intro))),
      Photo(v.collection.image, { className: 'v-collection-banner reveal', caption: true }),
      h('div', { class: 'v-filters', role: 'group', 'aria-label': 'تصفية القطع' },
        ...spaceFilters.map(({ b }) => b), customFilter, materialFilter, count),
      h('ol', { class: 'v-cards' }, cards.map(({ li }) => li)),
      empty));
  return {
    el,
    showMaterial(id: string): void {
      material = id; space = null; customOnly = false;
      apply();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  };
};

const Closing = (v: Villa): HTMLElement =>
  h('section', { class: 'v-sec v-closing', id: 'closing', 'data-title': 'الخاتمة' },
    h('div', { class: 'wrap' },
      h('p', { class: 'latin v-closing-mark', 'aria-hidden': 'true' }, 'Magic Look'),
      h('h2', { class: 'reveal' }, v.closing.title),
      h('p', { class: 'reveal' }, v.closing.text),
      h('div', { class: 'v-closing-ctas reveal' },
        h('a', { class: 'v-btn solid', href: 'index.html#contact' }, 'تواصل معنا'),
        h('a', { class: 'v-btn ghost', href: 'index.html' }, 'العودة إلى الملف التعريفي')),
      h('p', { class: 'v-colophon' }, `© ${new Date().getFullYear()} النظرة الساحرة · كتالوج ${v.name.ar}`)));

/** The top bar turns solid after the cover, shows reading progress and names the chapter in view. */
function initBar(sections: readonly HTMLElement[]): void {
  const bar = document.getElementById('vbar');
  const now = document.getElementById('vbar-now');
  const cover = document.getElementById('cover');
  if (!bar) return;
  let frame = 0;
  const update = (): void => {
    frame = 0;
    bar.classList.toggle('is-solid', scrollY > (cover?.offsetHeight ?? 0) - bar.offsetHeight - 1);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', (max > 0 ? Math.min(1, scrollY / max) : 0).toFixed(4));
  };
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update) }, { passive: true });
  addEventListener('resize', update);
  update();
  if (!now) return;
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      now.textContent = el.dataset.no ? `${el.dataset.no} · ${el.dataset.title ?? ''}` : el.dataset.title ?? '';
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => observer.observe(s));
}

/** The "contents" button in the top bar opens the chapters as a menu. */
function initIndexMenu(v: Villa, entries: readonly Entry[]): void {
  const button = document.getElementById('vbar-index');
  if (!button) return;
  const all = [
    { id: 'cover', no: '', title: 'الغلاف', meta: v.name.ar },
    { id: 'intro', no: '', title: 'المقدمة', meta: '' },
    ...entries,
    { id: 'closing', no: '', title: 'الخاتمة', meta: '' },
  ];
  const close = h('button', { type: 'button', class: 'v-index-close', 'aria-label': 'إغلاق الفهرس' }, '×');
  const dialog = h('dialog', { class: 'v-index', 'aria-labelledby': 'v-index-title' },
    h('div', { class: 'v-index-top' }, h('p', { id: 'v-index-title' }, 'فهرس الكتالوج'), close),
    h('ol', {}, all.map((e) => {
      const link = h('a', { href: `#${e.id}` },
        h('span', { class: 'latin' }, e.no), h('b', {}, e.title), e.meta ? h('small', {}, e.meta) : null);
      link.addEventListener('click', () => dialog.close());
      return h('li', {}, link);
    })));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close() });
  button.addEventListener('click', () => dialog.showModal());
  document.body.append(dialog);
}

/** Builds the catalogue below the static cover and wires its behaviours. */
export function renderVilla(root: HTMLElement, v: Villa): void {
  const facts = document.getElementById('cover-facts');
  facts?.replaceChildren(
    h('li', {}, plural(v.spaces.length, SPACES)),
    h('li', {}, plural(v.products.length, PIECES)),
    h('li', {}, plural(v.materials.length, MATERIALS)));

  const entries = entriesOf(v);
  const goToSpace = (id: string): void =>
    document.getElementById(`space-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const sheet = createProductSheet(v, goToSpace);
  const openPiece: OpenPiece = (id) => sheet.open(id);
  const collection = Collection(v, pad2(v.spaces.length + 2), openPiece);
  const chapters = v.spaces.map((s, i) => Chapter(v, s, i, openPiece));
  const materials = Materials(v, pad2(v.spaces.length + 1), (id) => collection.showMaterial(id));
  const closing = Closing(v);
  const sections = [Intro(v), Contents(entries), ...chapters, materials, collection.el, closing];

  root.replaceChildren(...sections);
  root.removeAttribute('aria-busy');

  initBar([document.getElementById('cover'), ...sections].filter((s): s is HTMLElement => s !== null));
  initIndexMenu(v, entries);
  initReveal(root);

  // The page is drawn after loading, so follow the address now: a piece opens its page.
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash.startsWith('piece-')) sheet.open(hash.slice('piece-'.length));
  else if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  // A piece's address typed or pasted while the page is open.
  addEventListener('hashchange', () => {
    const next = decodeURIComponent(location.hash.slice(1));
    if (next.startsWith('piece-')) sheet.open(next.slice('piece-'.length));
  });
}

export function renderVillaError(root: HTMLElement, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  root.replaceChildren(
    h('div', { class: 'load-error', role: 'alert' },
      h('h1', {}, 'تعذّر عرض الكتالوج'),
      h('p', {}, message),
      h('p', {}, 'راجع ملف البيانات public/data/villa-wood.json ثم أعد تحميل الصفحة.')));
}
