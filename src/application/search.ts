/**
 * The site search engine. It runs in the browser over search-index.json, with no server.
 *
 * What makes it "smart":
 * - Arabic spelling is normalised: أ إ آ → ا, ة → ه, ى → ي, diacritics and tatweel removed.
 * - Words are reduced to a light stem, so كنبة, الكنبات and كنبتين meet as كنب.
 * - Synonyms, dialect and English words share a concept: كنبة = صوفا = sofa, دولاب = خزانة.
 * - Typos are forgiven (one or two letters, by word length), with a "did you mean" suggestion.
 * - The last word matches as a prefix, so results appear while typing.
 * - Results are ranked: title over keywords over text, rare words over common ones,
 *   and an exact phrase in the title counts most.
 */
import { SEARCH_KINDS, type SearchDoc, type SearchKind } from '../domain/search';

// ─── normalising and stemming ───────────────────────────────────────────────────────────────────

const DIACRITICS = /[ً-ٰٟۖ-ۭـ]/g;

/** Lower case, Arabic letters unified, digits made Latin, punctuation turned into spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const ARABIC = /[؀-ۿ]/;
const PREFIXES = ['وبال', 'وال', 'بال', 'كال', 'فال', 'لل', 'ال'];
const SUFFIXES = ['يات', 'ات', 'ون', 'ين', 'ان', 'يه', 'ها', 'هم', 'ه', 'ي'];

/** A light stem of one normalised word: the article and common endings removed. */
export function stem(word: string): string {
  if (!ARABIC.test(word)) return word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;
  let w = word;
  for (const p of PREFIXES) {
    if (w.startsWith(p) && w.length - p.length >= 2) { w = w.slice(p.length); break; }
  }
  for (const s of SUFFIXES) {
    if (w.endsWith(s) && w.length - s.length >= 3) { w = w.slice(0, -s.length); break; }
  }
  return w;
}

/** Words that carry no meaning in a search, in Arabic (with dialect) and English. */
const STOPWORDS = new Set([
  'في', 'من', 'على', 'الي', 'عن', 'مع', 'او', 'و', 'هل', 'ما', 'ماذا', 'اريد', 'ابي', 'ابغي', 'ابغا', 'بدي',
  'عندكم', 'عندك', 'لديكم', 'لي', 'ممكن', 'شي', 'شيء', 'كيف', 'اين', 'وين', 'فيه', 'يوجد', 'هذا', 'هذه',
  'the', 'a', 'an', 'of', 'for', 'with', 'in', 'and', 'or', 'i', 'want', 'need', 'show', 'me',
].map(normalize));

// ─── synonyms ───────────────────────────────────────────────────────────────────────────────────

/** Words that mean the same thing to a customer, whatever the spelling or language. */
const CONCEPTS: Record<string, readonly string[]> = {
  sofa: ['كنبة', 'كنب', 'كنبات', 'كنباية', 'صوفا', 'صوفة', 'sofa', 'couch', 'settee', 'loveseat', 'sectional'],
  majlis: ['مجلس', 'مجالس', 'جلسة', 'جلسات', 'قعدة', 'majlis'],
  bed: ['سرير', 'أسرة', 'أسرّة', 'نوم', 'bed', 'bedroom', 'headboard'],
  chair: ['كرسي', 'كراسي', 'كرسى', 'chair', 'armchair', 'wingchair'],
  table: ['طاولة', 'طاولات', 'طربيزة', 'ترابيزة', 'table'],
  dining: ['سفرة', 'طعام', 'عشاء', 'dining'],
  cabinet: ['خزانة', 'خزائن', 'دولاب', 'دواليب', 'كبت', 'كبتات', 'wardrobe', 'cabinet', 'closet', 'cupboard'],
  tv: ['تلفزيون', 'تلفاز', 'شاشة', 'tv', 'television'],
  curtain: ['ستارة', 'ستائر', 'برادي', 'برداية', 'curtain', 'drape'],
  mirror: ['مرآة', 'مرايا', 'مراية', 'mirror'],
  light: ['إضاءة', 'اضاءات', 'إنارة', 'ثريا', 'ثريات', 'نجفة', 'أباجورة', 'مصباح', 'lamp', 'light', 'lighting', 'chandelier', 'sconce', 'pendant'],
  rug: ['سجادة', 'سجاد', 'زولية', 'موكيت', 'rug', 'carpet'],
  kitchen: ['مطبخ', 'مطابخ', 'kitchen'],
  cushion: ['مخدة', 'مخدات', 'وسادة', 'وسائد', 'كوشن', 'cushion', 'pillow'],
  wood: ['خشب', 'أخشاب', 'wood', 'wooden', 'timber'],
  walnut: ['جوز', 'walnut'],
  oak: ['بلوط', 'oak'],
  marble: ['رخام', 'marble'],
  stone: ['حجر', 'ترافرتين', 'stone', 'travertine'],
  velvet: ['مخمل', 'قطيفة', 'velvet'],
  linen: ['كتان', 'linen'],
  leather: ['جلد', 'leather'],
  fabric: ['قماش', 'أقمشة', 'fabric', 'upholstery'],
  beige: ['بيج', 'beige'],
  blue: ['أزرق', 'زرقاء', 'كحلي', 'نيلي', 'blue', 'navy'],
  grey: ['رمادي', 'رصاصي', 'grey', 'gray'],
  green: ['أخضر', 'خضراء', 'زيتي', 'زيتوني', 'green', 'olive'],
  gold: ['ذهبي', 'ذهب', 'نحاسي', 'gold', 'golden', 'brass'],
  white: ['أبيض', 'بيضاء', 'white'],
  black: ['أسود', 'سوداء', 'black'],
  red: ['أحمر', 'حمراء', 'red'],
  brown: ['بني', 'brown'],
  cream: ['كريمي', 'كريم', 'عاجي', 'اوف وايت', 'ivory', 'cream'],
  yellow: ['أصفر', 'صفراء', 'yellow', 'mustard'],
  silver: ['فضي', 'silver'],
  modern: ['مودرن', 'عصري', 'حديث', 'modern', 'contemporary'],
  classic: ['كلاسيك', 'كلاسيكي', 'classic', 'classical'],
  moroccan: ['مغربي', 'moroccan'],
  custom: ['تفصيل', 'مقاس', 'مخصص', 'custom', 'bespoke', 'tailored'],
  living: ['صالة', 'صالات', 'معيشة', 'living', 'lounge'],
  wall: ['جدار', 'جدران', 'حائط', 'كسوة', 'كسوات', 'wall', 'paneling', 'panelling'],
  contact: ['تواصل', 'اتصال', 'جوال', 'رقم', 'هاتف', 'واتساب', 'عنوان', 'contact', 'phone', 'whatsapp'],
};

/** stem → concept tokens ("#sofa"). A word can belong to more than one concept. */
const CONCEPT_OF = new Map<string, string[]>();
for (const [id, words] of Object.entries(CONCEPTS)) {
  for (const w of words) {
    for (const part of normalize(w).split(' ')) {
      const s = stem(part);
      CONCEPT_OF.set(s, [...new Set([...(CONCEPT_OF.get(s) ?? []), `#${id}`])]);
    }
  }
}

/** The words of a text, as written (normalised) and as stems, without meaningless words. */
function words(text: string): { word: string; stem: string }[] {
  return normalize(text).split(' ').filter((w) => w && !STOPWORDS.has(w))
    .map((w) => ({ word: w, stem: stem(w) })).filter((w) => w.stem.length > 0);
}

/** The words of a text, as stems, without meaningless words. */
export const terms = (text: string): string[] => words(text).map((w) => w.stem);

/** A stem and the concepts it belongs to: what a word matches. */
export const wordTerms = (word: string): string[] => {
  const s = stem(normalize(word));
  return s ? [s, ...(CONCEPT_OF.get(s) ?? [])] : [];
};

// ─── typo tolerance ─────────────────────────────────────────────────────────────────────────────

/** Edit distance with swaps (Damerau–Levenshtein), stopping early once it exceeds max. */
export function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (prev2[j - 2] ?? 0) + 1);
      row[j] = v;
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
    prev2.splice(0, prev2.length, ...prev);
    prev = row;
  }
  return prev[b.length] ?? max + 1;
}

const allowedTypos = (word: string): number => (word.length >= 7 ? 2 : word.length >= 4 ? 1 : 0);

// ─── the index ──────────────────────────────────────────────────────────────────────────────────

const FIELD_WEIGHT = { title: 6, keywords: 4, subtitle: 2.5, text: 1 } as const;
type Field = keyof typeof FIELD_WEIGHT;

/** How strongly each kind shows when scores are close: whole catalogues and services first. */
const KIND_BOOST: Record<SearchKind, number> = {
  catalogue: 1.2, service: 1.2, piece: 1, work: 0.95, space: 0.9, category: 0.8, faq: 0.85, section: 0.8,
};

interface Prepared {
  readonly doc: SearchDoc;
  readonly fields: Record<Field, Set<string>>;
  readonly title: string;
}

export interface SearchHit {
  readonly doc: SearchDoc;
  readonly score: number;
  /** Index terms that matched, for highlighting. */
  readonly matched: ReadonlySet<string>;
}

export interface SearchResult {
  readonly hits: readonly SearchHit[];
  /** True when nothing matched every word, and these results match only some of them. */
  readonly partial: boolean;
  /** A corrected query when a word was misspelt, e.g. "مجلس" for "مجلص". */
  readonly suggestion: string | null;
  /** Results per kind, for the filters (before the filter is applied). */
  readonly counts: Readonly<Record<SearchKind, number>>;
}

interface Expansion { readonly term: string; readonly weight: number; readonly fuzzy: boolean }

const withConcepts = (stems: readonly string[]): Set<string> =>
  new Set(stems.flatMap((s) => [s, ...(CONCEPT_OF.get(s) ?? [])]));

export class SearchIndex {
  private readonly docs: readonly Prepared[];
  /** How many documents contain each term. */
  private readonly df = new Map<string, number>();
  /** The commonest spelling of each stem, for "did you mean". */
  private readonly surface = new Map<string, string>();

  constructor(docs: readonly SearchDoc[]) {
    const seen = new Map<string, Map<string, number>>();
    this.docs = docs.map((doc) => {
      const fields: Record<Field, Set<string>> = {
        title: withConcepts(terms(doc.title)),
        keywords: withConcepts(doc.keywords.flatMap(terms)),
        subtitle: withConcepts(terms(doc.subtitle)),
        text: withConcepts(terms(doc.text)),
      };
      for (const t of new Set(Object.values(fields).flatMap((f) => [...f]))) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      for (const word of normalize(`${doc.title} ${doc.keywords.join(' ')}`).split(' ')) {
        if (!word || STOPWORDS.has(word)) continue;
        const s = stem(word);
        const counts = seen.get(s) ?? new Map<string, number>();
        counts.set(word, (counts.get(word) ?? 0) + 1);
        seen.set(s, counts);
      }
      return { doc, fields, title: normalize(doc.title) };
    });
    for (const [s, counts] of seen) {
      this.surface.set(s, [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? s);
    }
  }

  get size(): number { return this.docs.length }

  private idf(term: string): number {
    return Math.log(1 + this.docs.length / ((this.df.get(term) ?? 0) + 1));
  }

  /** Everything a query word may match: itself, its concepts, longer words while typing, near spellings. */
  private expand(word: string, isLast: boolean): Expansion[] {
    const out = new Map<string, Expansion>();
    const add = (term: string, weight: number, fuzzy = false): void => {
      const had = out.get(term);
      if (!had || had.weight < weight) out.set(term, { term, weight, fuzzy });
    };
    add(word, 1);
    const concepts = CONCEPT_OF.get(word) ?? [];
    for (const c of concepts) add(c, 0.9);
    // A word the site already knows, directly or as a synonym, is not a typo.
    const known = this.df.has(word) || concepts.some((c) => this.df.has(c));
    const typos = known ? 0 : allowedTypos(word);
    for (const term of this.df.keys()) {
      if (term.startsWith('#') || term === word) continue;
      if (isLast && word.length >= 2 && term.startsWith(word)) { add(term, 0.75); continue; }
      if (typos > 0 && distance(word, term, typos) <= typos) {
        add(term, 0.55, true);
        for (const c of CONCEPT_OF.get(term) ?? []) add(c, 0.5, true);
      }
    }
    return [...out.values()];
  }

  search(query: string, kind: SearchKind | null = null, limit = 40): SearchResult {
    const typed = words(query);
    const emptyCounts = Object.fromEntries(SEARCH_KINDS.map((k) => [k, 0])) as Record<SearchKind, number>;
    if (typed.length === 0) return { hits: [], partial: false, suggestion: null, counts: emptyCounts };

    const expansions = typed.map((w, i) => this.expand(w.stem, i === typed.length - 1));
    const phrase = normalize(query);

    const score = (p: Prepared): { score: number; hitWords: number; matched: Set<string>; fuzzyOnly: number[] } => {
      let total = 0;
      let hitWords = 0;
      const matched = new Set<string>();
      const fuzzyOnly: number[] = [];
      expansions.forEach((options, wi) => {
        let best = 0;
        let bestFuzzy = false;
        for (const e of options) {
          for (const f of Object.keys(FIELD_WEIGHT) as Field[]) {
            if (!p.fields[f].has(e.term)) continue;
            matched.add(e.term);
            const s = FIELD_WEIGHT[f] * e.weight * this.idf(e.term);
            if (s > best) { best = s; bestFuzzy = e.fuzzy }
          }
        }
        if (best > 0) { hitWords++; total += best; if (bestFuzzy) fuzzyOnly.push(wi) }
      });
      if (phrase.length > 2 && p.title.includes(phrase)) total *= 1.6;
      return { score: total * KIND_BOOST[p.doc.kind], hitWords, matched, fuzzyOnly };
    };

    const scored = this.docs.map((p) => ({ p, ...score(p) })).filter((s) => s.hitWords > 0);
    let pool = scored.filter((s) => s.hitWords === typed.length);
    const partial = pool.length === 0;
    if (partial) pool = scored.filter((s) => s.hitWords >= Math.ceil(typed.length / 2));
    pool.sort((a, b) => b.score - a.score || a.p.doc.title.length - b.p.doc.title.length);

    const counts = { ...emptyCounts };
    for (const s of pool) counts[s.p.doc.kind]++;

    return {
      hits: pool.filter((s) => !kind || s.p.doc.kind === kind).slice(0, limit)
        .map((s) => ({ doc: s.p.doc, score: s.score, matched: s.matched })),
      partial,
      suggestion: this.suggest(typed.map((w) => w.word), pool[0]?.fuzzyOnly ?? [], expansions),
      counts,
    };
  }

  /** Replaces each misspelt word with the closest real one found in the index; keeps the others as typed. */
  private suggest(typed: readonly string[], fuzzyWords: readonly number[], expansions: readonly Expansion[][]): string | null {
    if (fuzzyWords.length === 0) return null;
    const fixed = typed.map((w, i) => {
      if (!fuzzyWords.includes(i)) return w;
      const best = (expansions[i] ?? [])
        .filter((e) => e.fuzzy && !e.term.startsWith('#'))
        .sort((a, b) => (this.df.get(b.term) ?? 0) - (this.df.get(a.term) ?? 0))[0];
      return best ? this.surface.get(best.term) ?? best.term : w;
    });
    return fixed.join(' ');
  }
}

/** Splits a title into plain and matched parts, so the matched words can be marked. */
export function highlight(text: string, matched: ReadonlySet<string>): { text: string; hit: boolean }[] {
  return text.split(/(\s+)/).map((part) => ({
    text: part,
    hit: part.trim() !== '' && wordTerms(part).some((t) => matched.has(t)),
  }));
}
