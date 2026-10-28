/**
 * A form built from the content itself: objects become groups of fields, lists get
 * add / move / duplicate / delete buttons, image and video fields get upload buttons.
 * It edits the value in place and calls onChange after every edit.
 */
import { COLLECTION_STYLES, FILM_STYLES, GALLERY_LAYOUTS } from '../domain/entities';
import { PHOTO_RATIOS } from '../domain/villa';
import { h } from '../presentation/dom';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface EditorContext {
  onChange(): void;
  /** Uploads a file and returns its URL. */
  upload(file: File, onProgress: (fraction: number) => void): Promise<string>;
  /** Opens the media library and returns the chosen file's URL. */
  pick(accept: 'image' | 'video' | 'any'): Promise<string | null>;
  /** Turns a stored URL into one the browser can show from the dashboard. */
  resolve(url: string): string;
}

const LABELS: Record<string, string> = {
  about: 'من نحن', address: 'العنوان', ar: 'بالعربية', aspectRatio: 'نسبة العرض', caption: 'الوصف',
  card: 'البطاقة', category: 'الفئة', city: 'المدينة', closing: 'الختام', closingLine: 'جملة الختام',
  collection: 'المجموعة', collections: 'المعارض', color: 'اللون', colors: 'الألوان', cover: 'الغلاف',
  credentials: 'الشهادات والمشاركات', cta: 'نص الزر', custom: 'تفصيل خاص', details: 'التفاصيل', email: 'البريد الإلكتروني',
  en: 'بالإنجليزية', entityType: 'نوع الكيان', facts: 'أرقام سريعة', feature: 'المشروع المميز', field: 'المجال',
  films: 'الأفلام', finish: 'التشطيب', gallery: 'المعرض', h: 'الارتفاع %', hero: 'خلفية الواجهة',
  highlight: 'جملة مميزة', href: 'الرابط', icon: 'الأيقونة', id: 'المعرّف', image: 'الصورة', images: 'الصور',
  inSitu: 'في المكان', inset: 'صورة داخلية', interiorDesign: 'التصميم الداخلي', intro: 'المقدمة', items: 'العناصر',
  kicker: 'العنوان الصغير', layout: 'طريقة العرض', lead: 'الافتتاحية', logo: 'الشعار', look: 'الطابع',
  mapImage: 'صورة الخريطة', mapUrl: 'رابط الخريطة', materials: 'الخامات', name: 'الاسم', note: 'ملاحظة',
  pages: 'الصفحات', palette: 'لوحة الألوان', paragraphs: 'الفقرات', partners: 'الشركاء', phone: 'الجوال',
  points: 'النقاط', poster: 'صورة الغلاف للفيديو', product: 'المنتج', products: 'المنتجات', ratio: 'النسبة',
  segments: 'الفئات', spaces: 'المساحات', span: 'العرض', spots: 'نقاط التعريف', src: 'الملف',
  statements: 'الرؤية والرسالة والقيمة', steps: 'الخطوات', style: 'أسلوب العرض', swatch: 'العينة', tag: 'الوسم',
  tagline: 'الشعار النصي', text: 'النص', title: 'العنوان', traits: 'السمات', type: 'النوع', video: 'الفيديو',
  views: 'اللقطات', w: 'العرض %', website: 'الموقع الإلكتروني', words: 'الكلمات', x: 'الموضع الأفقي %', y: 'الموضع الرأسي %',
};

/** Suggested values for fields that accept a fixed list (the server still checks them). */
const OPTIONS: Record<string, readonly string[]> = {
  aspectRatio: ['auto', '16:9', '9:16'],
  type: ['image', 'video'],
  layout: GALLERY_LAYOUTS,
  style: [...COLLECTION_STYLES, ...FILM_STYLES],
  ratio: PHOTO_RATIOS,
  icon: ['sofa', 'bed', 'chair', 'table', 'tv', 'mirror', 'partition', 'cabinet', 'curtain', 'lamp',
    'space', 'plan', 'palette', 'wall', 'light', 'pin', 'mail', 'phone', 'web'],
};
/** Fields whose value picks a variant: kept when a list item is copied as a template. */
const KEEP_ON_ADD = new Set(['type', 'layout', 'style', 'ratio', 'aspectRatio', 'icon', 'span']);
const LONG_TEXT = new Set(['text', 'intro', 'lead', 'note', 'details', 'tagline', 'closingLine', 'highlight', 'paragraphs', 'traits', 'points']);
const MEDIA_KEYS = new Set(['src', 'poster']);
const MEDIA_VALUE = /(\.(webp|jpe?g|png|gif|avif|mp4|webm|mov|m4v)(?:[?#]|$))|(^|\/)api\/files\//i;
const VIDEO_VALUE = /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i;
const HEX = /^#[0-9a-f]{6}$/i;

const labelOf = (key: string | number): string =>
  typeof key === 'number' ? `${key + 1}` : LABELS[key] ?? key;

const isObject = (v: Json): v is { [key: string]: Json } => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A short line that names a list item in its collapsed header. */
function preview(v: Json): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (isObject(v)) {
    for (const k of ['title', 'name', 'caption', 'kicker', 'text', 'id', 'label']) {
      const x = v[k];
      if (typeof x === 'string' && x) return x;
    }
    for (const x of Object.values(v)) {
      const p = isObject(x) ? preview(x) : '';
      if (p) return p;
    }
  }
  return '';
}

/** An empty copy of a list item, used as the template for "add". */
function blank(v: Json, key = ''): Json {
  if (typeof v === 'string') return KEEP_ON_ADD.has(key) ? v : HEX.test(v) ? '#7B5D08' : '';
  if (typeof v === 'number') return KEEP_ON_ADD.has(key) ? v : 0;
  if (Array.isArray(v)) return [];
  if (isObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x, k)]));
  return v;
}

const clone = (v: Json): Json => structuredClone(v);

function autosize(area: HTMLTextAreaElement): void {
  const fit = (): void => { area.style.height = 'auto'; area.style.height = `${area.scrollHeight + 2}px` };
  area.addEventListener('input', fit);
  requestAnimationFrame(fit);
}

export function renderEditor(root: Json, key: string, ctx: EditorContext): HTMLElement {
  let listId = 0;

  function field(path: string, label: string, control: HTMLElement, wide = false): HTMLElement {
    return h('div', { class: `ed-field${wide ? ' wide' : ''}`, 'data-path': path }, h('span', { class: 'ed-label' }, label), control);
  }

  function scalar(value: string | number | boolean | null, k: string | number, path: string, set: (v: Json) => void): HTMLElement {
    const name = typeof k === 'string' ? k : '';
    const label = labelOf(k);

    if (typeof value === 'boolean') {
      const box = h('input', { type: 'checkbox' });
      box.checked = value;
      box.addEventListener('change', () => { set(box.checked); ctx.onChange() });
      return field(path, label, h('label', { class: 'ed-check' }, box, h('span', {}, 'مفعّل')));
    }

    if (typeof value === 'number') {
      const input = h('input', { type: 'number', step: 'any', value: String(value), dir: 'ltr' });
      input.addEventListener('input', () => {
        if (input.value.trim() === '') return;
        const n = Number(input.value);
        if (Number.isFinite(n)) { set(n); ctx.onChange() }
      });
      return field(path, label, input);
    }

    const text = value ?? '';
    const commit = (raw: string): void => { set(raw.trim() === '' ? null : raw); ctx.onChange() };

    if (MEDIA_KEYS.has(name) || (text && MEDIA_VALUE.test(text))) return mediaField(text, label, path, commit);

    if (HEX.test(text) || name === 'color') {
      const input = h('input', { value: text, dir: 'ltr', placeholder: '#7B5D08', maxlength: '7', class: 'ed-hex' });
      const swatch = h('input', { type: 'color', value: HEX.test(text) ? text : '#7B5D08', 'aria-label': 'اختيار اللون' });
      swatch.addEventListener('input', () => { input.value = swatch.value.toUpperCase(); commit(input.value) });
      input.addEventListener('input', () => { if (HEX.test(input.value)) swatch.value = input.value; commit(input.value) });
      return field(path, label, h('div', { class: 'ed-color' }, swatch, input));
    }

    const options = OPTIONS[name];
    if (options) {
      const id = `opts-${++listId}`;
      const input = h('input', { value: text, list: id, dir: 'ltr' });
      input.addEventListener('input', () => commit(input.value));
      return field(path, label, h('div', {}, input, h('datalist', { id }, ...options.map((o) => h('option', { value: o })))));
    }

    const long = text.length > 70 || text.includes('\n') || LONG_TEXT.has(name);
    if (long) {
      const area = h('textarea', { rows: 2 });
      area.value = text;
      area.addEventListener('input', () => commit(area.value));
      autosize(area);
      return field(path, label, area, true);
    }
    const input = h('input', { value: text });
    if (/^(https?:|mailto:|tel:|#)|\.html/.test(text) || ['href', 'mapUrl', 'id', 'website', 'email', 'phone'].includes(name)) input.dir = 'ltr';
    input.addEventListener('input', () => commit(input.value));
    return field(path, label, input);
  }

  function mediaField(value: string, label: string, path: string, commit: (v: string) => void): HTMLElement {
    const input = h('input', { value, dir: 'ltr', placeholder: 'اختر ملفاً أو الصق رابطاً' });
    const thumb = h('div', { class: 'ed-thumb' });
    const status = h('small', { class: 'ed-upload-status' });
    const showThumb = (): void => {
      const v = input.value.trim();
      thumb.replaceChildren(!v ? h('span', {}, 'لا يوجد ملف')
        : VIDEO_VALUE.test(v) ? h('video', { src: ctx.resolve(v), muted: true, preload: 'metadata', playsinline: true })
          : h('img', { src: ctx.resolve(v), alt: '', loading: 'lazy' }));
    };
    const setValue = (v: string): void => { input.value = v; commit(v); showThumb() };
    input.addEventListener('change', () => { commit(input.value); showThumb() });

    const file = h('input', { type: 'file', accept: 'image/*,video/*', hidden: true });
    file.addEventListener('change', () => {
      const chosen = file.files?.[0];
      if (!chosen) return;
      status.textContent = 'جارٍ الرفع… 0%';
      ctx.upload(chosen, (f) => { status.textContent = `جارٍ الرفع… ${Math.round(f * 100)}%` })
        .then((url) => { setValue(url); status.textContent = 'تم الرفع ✓' })
        .catch((e: unknown) => { status.textContent = e instanceof Error ? e.message : 'تعذّر الرفع' })
        .finally(() => { file.value = '' });
    });
    const uploadBtn = h('button', { type: 'button', class: 'ed-btn' }, 'رفع ملف');
    uploadBtn.addEventListener('click', () => file.click());
    const pickBtn = h('button', { type: 'button', class: 'ed-btn' }, 'من المكتبة');
    pickBtn.addEventListener('click', () => { void ctx.pick('any').then((url) => { if (url) setValue(url) }) });
    const clearBtn = h('button', { type: 'button', class: 'ed-btn quiet' }, 'إزالة');
    clearBtn.addEventListener('click', () => setValue(''));

    showThumb();
    return field(path, label, h('div', { class: 'ed-media' }, thumb,
      h('div', { class: 'ed-media-side' }, input, h('div', { class: 'ed-row' }, uploadBtn, pickBtn, clearBtn, file), status)), true);
  }

  function group(value: { [key: string]: Json }, path: string): HTMLElement {
    const box = h('div', { class: 'ed-group' });
    for (const k of Object.keys(value)) {
      box.append(node(value[k] ?? null, k, `${path}.${k}`, (v) => { value[k] = v }));
    }
    return box;
  }

  function list(items: Json[], k: string | number, path: string, count?: HTMLElement): HTMLElement {
    const body = h('div', { class: 'ed-list' });
    const name = typeof k === 'string' ? k : '';

    const draw = (): void => {
      if (count) count.textContent = `(${items.length})`;
      body.replaceChildren(...items.map((item, i) => {
        const itemPath = `${path}[${i}]`;
        const move = (to: number): void => {
          const [x] = items.splice(i, 1);
          items.splice(to, 0, x as Json);
          ctx.onChange(); draw();
        };
        const btn = (text: string, title: string, action: () => void, disabled = false): HTMLButtonElement => {
          const b = h('button', { type: 'button', class: 'ed-icon', title, 'aria-label': title, disabled }, text);
          b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); action() });
          return b;
        };
        const tools = h('span', { class: 'ed-tools' },
          btn('↑', 'تحريك للأعلى', () => move(i - 1), i === 0),
          btn('↓', 'تحريك للأسفل', () => move(i + 1), i === items.length - 1),
          btn('⧉', 'نسخ', () => { items.splice(i + 1, 0, clone(item)); ctx.onChange(); draw() }),
          btn('✕', 'حذف', () => {
            if (!confirm('حذف هذا العنصر؟')) return;
            items.splice(i, 1); ctx.onChange(); draw();
          }));

        if (!Array.isArray(item) && !isObject(item)) {
          return h('div', { class: 'ed-item flat' },
            node(item, i, itemPath, (v) => { items[i] = v }), tools);
        }
        const details = h('details', { class: 'ed-item', 'data-path': itemPath },
          h('summary', {}, h('b', {}, labelOf(i)), h('span', { class: 'ed-preview' }, preview(item)), tools),
          Array.isArray(item) ? list(item, i, itemPath) : group(item, itemPath));
        return details;
      }));
    };

    const add = h('button', { type: 'button', class: 'ed-btn add' }, '+ إضافة');
    add.addEventListener('click', () => {
      const last = items[items.length - 1];
      items.push(last === undefined ? '' : blank(last, name));
      ctx.onChange(); draw();
      const added = body.lastElementChild;
      if (added instanceof HTMLDetailsElement) added.open = true;
      added?.querySelector<HTMLElement>('input, textarea')?.focus();
    });

    draw();
    return h('div', { class: 'ed-list-wrap' }, body, add);
  }

  function node(value: Json, k: string | number, path: string, set: (v: Json) => void, open = false): HTMLElement {
    if (Array.isArray(value) || isObject(value)) {
      const size = Array.isArray(value) ? h('span', { class: 'ed-count' }) : null;
      const inner = Array.isArray(value) ? list(value, k, path, size ?? undefined) : group(value, path);
      return h('details', { class: 'ed-section', 'data-path': path, open },
        h('summary', {}, labelOf(k), size), inner);
    }
    return scalar(value, k, path, set);
  }

  const top = isObject(root)
    ? h('div', { class: 'ed-root' }, ...Object.keys(root).map((k) =>
      node(root[k] ?? null, k, `${key}.json.${k}`, (v) => { root[k] = v })))
    : h('div', { class: 'ed-root' }, node(root, key, `${key}.json`, () => {}, true));
  return top;
}

/** Opens the groups around a field, scrolls to it and marks it, after the server rejects a save. */
export function revealPath(container: HTMLElement, path: string): void {
  container.querySelectorAll('.ed-invalid').forEach((el) => el.classList.remove('ed-invalid'));
  let target: Element | null = null;
  // The exact field, or the closest parent group the server named.
  for (let p = path; p && !target; p = p.replace(/(\.[^.[\]]+|\[\d+\])$/, '')) {
    target = container.querySelector(`[data-path="${CSS.escape(p)}"]`);
    if (p === p.replace(/(\.[^.[\]]+|\[\d+\])$/, '')) break;
  }
  if (!target) return;
  for (let el: Element | null = target; el && el !== container; el = el.parentElement) {
    if (el instanceof HTMLDetailsElement) el.open = true;
  }
  target.classList.add('ed-invalid');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true });
}
