/** What the site search can find. Each kind is a filter in the search panel. */
export const SEARCH_KINDS = ['piece', 'catalogue', 'service', 'work', 'space', 'category', 'faq', 'section'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

/** One searchable thing, as the build writes it to search-index.json. */
export interface SearchDoc {
  readonly id: string;
  readonly kind: SearchKind;
  readonly title: string;
  /** Where it belongs, e.g. "كنبة · مجلس النقوش المفرّغة". */
  readonly subtitle: string;
  /** Longer text that is searched but only shown as a snippet. */
  readonly text: string;
  /** Extra words to match: English names, materials, styles, categories. */
  readonly keywords: readonly string[];
  /** Relative to the site root, e.g. "floor-majlis-room.html#piece-sofa". */
  readonly href: string;
  /** A small photo, relative to the site root. */
  readonly image: string | null;
}
