/**
 * Domain model of a villa catalogue: its spaces, the pieces in them and the materials they are made of.
 * Pieces, spaces and materials refer to each other by id.
 */

export const PHOTO_RATIOS = ['16:9', '3:4', '9:16', '1:1'] as const;
export type PhotoRatio = (typeof PHOTO_RATIOS)[number];

/** A photo with its shape, so its frame keeps the right size before the file loads. */
export interface VillaPhoto {
  readonly src: string;
  readonly ratio: PhotoRatio;
  readonly caption: string;
}

/** A photo in a chapter's spread; `span` is its width in columns out of 12. */
export interface SpreadPhoto extends VillaPhoto {
  readonly span: number;
}

/** A close-up, optionally pointing at the piece it shows. */
export interface CloseUp extends VillaPhoto {
  readonly product: string | null;
}

export interface Material {
  readonly id: string;
  readonly name: string;
  readonly en: string;
  readonly color: string;
  /** A square crop of the material itself. */
  readonly swatch: string;
  readonly note: string;
}

/** A point on a room photo, in percent from its left and top edges, marking one piece. */
export interface LookSpot {
  readonly x: number;
  readonly y: number;
  readonly product: string;
}

export interface Space {
  readonly id: string;
  readonly name: string;
  readonly en: string;
  readonly intro: string;
  readonly look: { readonly image: VillaPhoto; readonly spots: readonly LookSpot[] };
  readonly gallery: readonly SpreadPhoto[];
  readonly details: readonly CloseUp[];
}

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly en: string;
  readonly category: string;
  /** Spaces it stands in; the first is where it belongs. */
  readonly spaces: readonly string[];
  /** Made to measure for the villa, such as built-in joinery and curtains. */
  readonly custom: boolean;
  readonly materials: readonly string[];
  readonly finish: string;
  readonly text: string;
  /** A square catalogue crop. */
  readonly card: string;
  readonly views: readonly VillaPhoto[];
  readonly details: readonly VillaPhoto[];
  readonly inSitu: readonly VillaPhoto[];
}

export interface Villa {
  readonly name: { readonly ar: string; readonly en: string };
  readonly kicker: string;
  readonly tagline: string;
  readonly cover: VillaPhoto;
  readonly intro: {
    readonly lead: string;
    readonly paragraphs: readonly string[];
    readonly words: readonly { readonly ar: string; readonly en: string }[];
    readonly image: VillaPhoto;
    readonly inset: VillaPhoto;
  };
  readonly materials: readonly Material[];
  readonly spaces: readonly Space[];
  readonly collection: { readonly intro: string; readonly image: VillaPhoto };
  readonly products: readonly Product[];
  readonly closing: { readonly title: string; readonly text: string };
}

/** Port: where a villa catalogue comes from. */
export interface VillaRepository {
  load(): Promise<Villa>;
}
