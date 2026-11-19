/**
 * The site search: a button that opens a full search panel (also on Ctrl/⌘+K or "/").
 * The index (search-index.json) loads the first time the panel opens or the button is hovered.
 */
import { SEARCH_KINDS, type SearchDoc, type SearchKind } from '../../../domain/search';
import { highlight, SearchIndex, type SearchHit } from '../../../application/search';
import { glyph } from '../behaviors/share';
import { h } from '../../shared/dom';

const KIND_LABEL: Record<SearchKind, string> = {
  piece: 'قطعة', catalogue: 'كتالوج', service: 'خدمة', work: 'من أعمالنا',
  space: 'مساحة', category: 'منتجاتنا', faq: 'سؤال', section: 'قسم',
};
const FILTER_LABEL: Record<SearchKind, string> = {
  piece: 'القطع', catalogue: 'الكتالوجات', service: 'الخدمات', work: 'أعمالنا',
  space: 'المساحات', category: 'المنتجات', faq: 'الأسئلة', section: 'الأقسام',
};
const IDEAS = ['مجالس', 'كنب منحني', 'غرف نوم', 'وحدات تلفزيون', 'خشب الجوز', 'رخام', 'مجلس مغربي', 'طاولة طعام', 'ستائر', 'مخمل'];
const RECENT_KEY = 'ml-search-recent';

const searchIcon = (): SVGSVGElement => glyph(['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'], 'search-ic');
const micIcon = (): SVGSVGElement => glyph(['M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z', 'M5 11a7 7 0 0 0 14 0', 'M12 18v3'], 'search-ic');

const readRecent = (): string[] => {
  try { return (JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown[]).filter((x): x is string => typeof x === 'string') } catch { return [] }
};
const saveRecent = (q: string): void => {
  const query = q.trim();
  if (query.length < 2) return;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...readRecent().filter((r) => r !== query)].slice(0, 6))) } catch { /* private mode */ }
};

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechCtor = new () => SpeechRecognitionLike;
const speechCtor = (): SpeechCtor | null => {
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export interface SiteSearch {
  /** The button that opens the panel; place it in the page's header. */
  readonly button: HTMLButtonElement;
  open(query?: string): void;
}

/**
 * @param root The site root relative to this page: "./" for top-level pages, "../" for services/.
 */
export function createSiteSearch(root: string): SiteSearch {
  let index: SearchIndex | null = null;
  let loading: Promise<SearchIndex> | null = null;
  let kind: SearchKind | null = null;
  let hits: readonly SearchHit[] = [];
  let active = -1;

  const load = (): Promise<SearchIndex> => {
    loading ??= fetch(`${root}search-index.json`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<SearchDoc[]> })
      .then((docs) => (index = new SearchIndex(docs)))
      .catch((e: unknown) => { loading = null; throw e });
    return loading;
  };

  // ─── elements ─────────────────────────────────────────────────────────────────────────────────

  const button = h('button', { type: 'button', class: 'search-trigger', 'aria-haspopup': 'dialog', 'aria-label': 'البحث في الموقع' },
    searchIcon(), h('span', { class: 'search-trigger-label' }, 'بحث'), h('kbd', { class: 'search-trigger-kbd', 'aria-hidden': 'true' }, 'Ctrl K'));

  const input = h('input', {
    type: 'search', class: 'search-input', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'search-results',
    'aria-autocomplete': 'list', 'aria-label': 'ابحث في الموقع', placeholder: 'ابحث عن مجلس، كنبة، خشب الجوز، غرفة نوم…',
    autocomplete: 'off', spellcheck: false, enterkeyhint: 'search',
  });
  const Speech = speechCtor();
  const mic = Speech ? h('button', { type: 'button', class: 'search-icon-btn', 'aria-label': 'البحث بالصوت', 'aria-pressed': 'false' }, micIcon()) : null;
  const close = h('button', { type: 'button', class: 'search-close' }, 'إغلاق');
  const filters = h('div', { class: 'search-filters', role: 'group', 'aria-label': 'نوع النتائج' });
  const status = h('p', { class: 'search-status', role: 'status', 'aria-live': 'polite' });
  const list = h('ul', { class: 'search-results', id: 'search-results', role: 'listbox', 'aria-label': 'نتائج البحث' });
  const idle = h('div', { class: 'search-idle' });

  const dialog = h('dialog', { class: 'search-dialog', 'aria-label': 'البحث في الموقع' },
    h('div', { class: 'search-panel' },
      h('form', { class: 'search-bar', role: 'search' }, searchIcon(), input, mic, close),
      filters, status, list, idle,
      h('p', { class: 'search-help', 'aria-hidden': 'true' },
        h('span', {}, h('kbd', {}, '↑'), h('kbd', {}, '↓'), ' للتنقل'),
        h('span', {}, h('kbd', {}, 'Enter'), ' للفتح'),
        h('span', {}, h('kbd', {}, 'Esc'), ' للإغلاق'))));

  // ─── rendering ────────────────────────────────────────────────────────────────────────────────

  const chip = (label: string, onClick: () => void, extra = ''): HTMLButtonElement => {
    const b = h('button', { type: 'button', class: `search-chip ${extra}`.trim() }, label);
    b.addEventListener('click', onClick);
    return b;
  };

  const setQuery = (q: string): void => { input.value = q; kind = null; run(); input.focus() };

  function renderIdle(): void {
    const recent = readRecent();
    const groups: HTMLElement[] = [];
    if (recent.length > 0) {
      groups.push(h('div', { class: 'search-idle-group' }, h('h2', {}, 'عمليات بحث سابقة'),
        h('div', { class: 'search-chips' }, recent.map((r) => chip(r, () => setQuery(r))))));
    }
    groups.push(h('div', { class: 'search-idle-group' }, h('h2', {}, 'جرّب البحث عن'),
      h('div', { class: 'search-chips' }, IDEAS.map((r) => chip(r, () => setQuery(r))))));
    idle.replaceChildren(...groups);
  }

  const resultId = (i: number): string => `search-hit-${i}`;

  function setActive(i: number): void {
    const items = list.querySelectorAll<HTMLElement>('[role="option"]');
    if (items.length === 0) { active = -1; input.removeAttribute('aria-activedescendant'); return }
    active = (i + items.length) % items.length;
    items.forEach((el, j) => el.setAttribute('aria-selected', String(j === active)));
    input.setAttribute('aria-activedescendant', resultId(active));
    items[active]?.scrollIntoView({ block: 'nearest' });
  }

  function hitView(hit: SearchHit, i: number): HTMLElement {
    const d = hit.doc;
    const title = h('span', { class: 'search-hit-title' },
      highlight(d.title, hit.matched).map((part) => (part.hit ? h('mark', {}, part.text) : part.text)));
    const link = h('a', { class: 'search-hit', href: `${root}${d.href}`, tabindex: '-1' },
      d.image
        ? h('img', { class: 'search-hit-img', src: `${root}${d.image}`, alt: '', loading: 'lazy', decoding: 'async' })
        : h('span', { class: `search-hit-img search-hit-ph kind-${d.kind}`, 'aria-hidden': 'true' }, searchIcon()),
      h('span', { class: 'search-hit-body' },
        title,
        h('span', { class: 'search-hit-sub' }, d.subtitle)),
      h('span', { class: `search-hit-kind kind-${d.kind}` }, KIND_LABEL[d.kind]));
    link.addEventListener('click', (e) => { e.preventDefault(); go(d) });
    const item = h('li', { role: 'option', id: resultId(i), 'aria-selected': 'false' }, link);
    item.addEventListener('mousemove', () => { if (active !== i) setActive(i) });
    return item;
  }

  function run(): void {
    const q = input.value;
    if (q.trim() === '') {
      hits = [];
      list.replaceChildren();
      filters.replaceChildren();
      status.textContent = '';
      idle.hidden = false;
      input.setAttribute('aria-expanded', 'false');
      renderIdle();
      return;
    }
    idle.hidden = true;
    if (!index) {
      status.textContent = 'جارٍ تجهيز البحث…';
      load().then(run).catch(() => { status.textContent = 'تعذّر تحميل البحث، تحقّق من الاتصال وحاول مرة أخرى.' });
      return;
    }
    const result = index.search(q, kind);
    hits = result.hits;

    const total = SEARCH_KINDS.reduce((n, k) => n + result.counts[k], 0);
    filters.replaceChildren(
      chip(`الكل ${total}`, () => { kind = null; run() }, kind === null ? 'is-on' : ''),
      ...SEARCH_KINDS.filter((k) => result.counts[k] > 0)
        .map((k) => chip(`${FILTER_LABEL[k]} ${result.counts[k]}`, () => { kind = k; run() }, kind === k ? 'is-on' : '')));
    filters.querySelectorAll('.search-chip').forEach((b) => b.setAttribute('aria-pressed', String(b.classList.contains('is-on'))));

    const suggestion = result.suggestion && normalizeSpaces(result.suggestion) !== normalizeSpaces(q)
      ? h('span', {}, ' هل تقصد: ', chip(result.suggestion, () => setQuery(result.suggestion ?? ''), 'search-suggest'), '؟')
      : null;
    if (hits.length === 0) {
      status.replaceChildren(`لا توجد نتائج لـ «${q.trim()}».`, suggestion ?? ' جرّب كلمة أخرى، مثل: مجلس، كنبة، خشب.');
    } else {
      const found = kind ? result.counts[kind] : total;
      const count = found > hits.length ? `عرض ${hits.length} من ${found} نتيجة` : `${found} نتيجة`;
      status.replaceChildren(
        result.partial ? `لا توجد نتائج تطابق كل الكلمات؛ هذه أقرب النتائج (${count}).` : count,
        suggestion ?? '');
    }
    list.replaceChildren(...hits.map(hitView));
    input.setAttribute('aria-expanded', String(hits.length > 0));
    setActive(hits.length > 0 ? 0 : -1);
  }

  const normalizeSpaces = (s: string): string => s.trim().replace(/\s+/g, ' ');

  // ─── opening a result ─────────────────────────────────────────────────────────────────────────

  function go(doc: SearchDoc): void {
    saveRecent(input.value);
    const url = new URL(`${root}${doc.href}`, location.href);
    const page = (p: string): string => p.replace(/index\.html$/, '');
    dialog.close();
    if (page(url.pathname) === page(location.pathname) && url.hash) {
      // Same page: follow the anchor (a catalogue opens the piece's sheet on hashchange).
      if (location.hash === url.hash) document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
      else location.hash = url.hash;
    } else {
      location.href = url.href;
    }
  }

  // ─── events ───────────────────────────────────────────────────────────────────────────────────

  input.addEventListener('input', () => { kind = null; run() });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1) }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[active];
      if (hit) go(hit.doc);
    }
  });
  dialog.querySelector('form')?.addEventListener('submit', (e) => e.preventDefault());
  close.addEventListener('click', () => dialog.close());
  // A click on the dimmed backdrop closes the panel.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close() });
  dialog.addEventListener('close', () => { document.documentElement.classList.remove('search-open'); button.focus({ preventScroll: true }) });

  if (mic && Speech) {
    let rec: SpeechRecognitionLike | null = null;
    mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return }
      rec = new Speech();
      rec.lang = 'ar-SA';
      rec.interimResults = true;
      mic.setAttribute('aria-pressed', 'true');
      mic.classList.add('is-listening');
      rec.onresult = (e) => {
        input.value = Array.from(e.results).map((r) => r[0]?.transcript ?? '').join(' ');
        kind = null;
        run();
      };
      const done = (): void => { rec = null; mic.setAttribute('aria-pressed', 'false'); mic.classList.remove('is-listening'); input.focus() };
      rec.onend = done;
      rec.onerror = done;
      rec.start();
    });
  }

  function open(query?: string): void {
    if (!dialog.isConnected) document.body.append(dialog);
    if (query !== undefined) input.value = query;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('search-open');
    run();
    input.focus();
    // Reopening keeps the last search selected, ready to be typed over; a given search is left as is.
    if (query === undefined) input.select();
    void load().catch(() => undefined);
  }

  button.addEventListener('click', () => open());
  button.addEventListener('pointerenter', () => void load().catch(() => undefined), { once: true });
  button.addEventListener('focus', () => void load().catch(() => undefined), { once: true });

  document.addEventListener('keydown', (e) => {
    const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open() }
    else if (e.key === '/' && !typing && !dialog.open) { e.preventDefault(); open() }
  });

  // A shared search link: page.html?q=مجلس opens the panel with that search.
  const shared = new URLSearchParams(location.search).get('q');
  if (shared) queueMicrotask(() => open(shared));

  if (/Mac|iPhone|iPad/.test(navigator.platform)) button.querySelector('kbd')?.replaceChildren('⌘ K');

  return { button, open };
}
