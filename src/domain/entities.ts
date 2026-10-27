/**
 * Domain model of the company profile.
 * `null` means "not provided yet": the UI shows a clear placeholder instead.
 */

export type Maybe<T> = T | null;

export type IconName =
  | 'sofa' | 'bed' | 'chair' | 'table' | 'tv' | 'mirror' | 'partition' | 'cabinet'
  | 'curtain' | 'lamp' | 'space' | 'plan' | 'palette' | 'wall' | 'light'
  | 'pin' | 'mail' | 'phone' | 'web';

export interface Media {
  readonly src: Maybe<string>;
  readonly caption: string;
  /** Omit to infer the kind from the file extension. */
  readonly type?: Maybe<'image' | 'video'>;
  readonly poster?: Maybe<string>;
  /** Explicit display format; omitted, null or auto uses the source dimensions. */
  readonly aspectRatio?: Maybe<'9:16' | '16:9' | 'auto'>;
}

export interface TitledText {
  readonly title: string;
  readonly text: string;
}

export const FILM_STYLES = ['cinema', 'arch', 'frame', 'expand'] as const;
export type FilmStyle = (typeof FILM_STYLES)[number];

/** A video showcased in its own section; `style` picks the section design. */
export interface Film {
  readonly style: FilmStyle;
  readonly kicker: string;
  readonly title: string;
  readonly text: string;
  readonly points: readonly string[];
  readonly video: Media;
}

export const COLLECTION_STYLES = [
  'panels', 'collage', 'switch', 'stagger', 'strip', 'duo', 'journey', 'spotlight', 'hotspots', 'coverflow', 'moodboard', 'cabinet',
  'swatches', 'tiles', 'mirror', 'blueprint', 'lights',
] as const;
export type CollectionStyle = (typeof COLLECTION_STYLES)[number];

/**
 * A labelled point on a photo; x and y are percentages from its left and top edges.
 * w and h are the half-width and half-height of the area around it, also in percent,
 * for layouts that light up that area.
 */
export interface Hotspot {
  readonly x: number;
  readonly y: number;
  readonly title: string;
  readonly text: string;
  readonly w?: Maybe<number>;
  readonly h?: Maybe<number>;
}

export interface CollectionItem {
  readonly title: string;
  readonly image: Media;
  /** Short style label, e.g. "جاباندي". */
  readonly tag?: Maybe<string>;
  /** Main colour of the piece, shown as a swatch. */
  readonly color?: Maybe<string>;
  readonly spots?: readonly Hotspot[];
  /** Named colours taken from the photo. */
  readonly palette?: readonly { readonly name: string; readonly color: string }[];
}

/** A themed photo set shown in its own section; `style` picks the section design. */
export interface Collection {
  readonly style: CollectionStyle;
  readonly kicker: string;
  readonly title: string;
  readonly text: string;
  readonly items: readonly CollectionItem[];
}

/** A featured project shown as a full-width banner that opens its own page. */
export interface Feature {
  readonly kicker: string;
  readonly title: string;
  readonly en: string;
  readonly text: string;
  readonly cta: string;
  /** The page it opens, relative to the site. */
  readonly href: string;
  readonly facts: readonly string[];
  readonly image: Media;
  /** A few photos fanned out like catalogue pages; each caption labels its page. */
  readonly pages: readonly Media[];
}

export interface Company {
  readonly name: { readonly ar: string; readonly en: string };
  readonly entityType: string;
  readonly field: string;
  readonly tagline: string;
  readonly closingLine: string;
  readonly hero?: Maybe<Media>;
  readonly feature?: Maybe<Feature>;
  readonly about: {
    readonly lead: string;
    readonly highlight: string;
    readonly paragraphs: readonly string[];
    readonly image: Media;
  };
  readonly statements: readonly TitledText[];
  readonly interiorDesign: {
    readonly intro: string;
    readonly traits: readonly string[];
    readonly images: readonly Media[];
  };
  readonly films: readonly Film[];
  readonly collections: readonly Collection[];
}

export interface Service { readonly icon: IconName; readonly text: string }
export interface Services { readonly intro: string; readonly note: string; readonly items: readonly Service[] }

export interface ProductCategory { readonly icon: IconName; readonly name: string }
export interface Products { readonly intro: string; readonly items: readonly ProductCategory[] }

export interface Advantages { readonly image: Media; readonly items: readonly TitledText[] }

export interface Journey { readonly intro: string; readonly steps: readonly string[] }

export interface EngagementLevels { readonly intro: string; readonly items: readonly string[] }

export const GALLERY_LAYOUTS = ['mosaic', 'slideshow', 'compare', 'filmstrip'] as const;
export type GalleryLayout = (typeof GALLERY_LAYOUTS)[number];

interface ProjectBase {
  readonly id: string;
  readonly name: Maybe<string>;
  readonly category: string;
  readonly city: Maybe<string>;
  /** HEX colours used in the project, shown as swatches. */
  readonly colors: readonly string[];
  readonly images: readonly Media[];
}

export interface StandardProject extends ProjectBase {
  readonly layout: Exclude<GalleryLayout, 'compare'>;
}

export interface CompareProject extends ProjectBase {
  readonly layout: 'compare';
  readonly before: Media;
  readonly after: Media;
}

export type Project = StandardProject | CompareProject;

export interface Partner { readonly name: Maybe<string>; readonly logo: Maybe<string> }
export interface Credential { readonly title: Maybe<string>; readonly image: Media }

export interface Clients {
  readonly segments: readonly TitledText[];
  readonly partners: readonly Partner[];
  readonly credentials: readonly Credential[];
}

export interface Contact {
  readonly phone: Maybe<string>;
  readonly email: Maybe<string>;
  readonly website: Maybe<string>;
  readonly address: Maybe<string>;
  readonly mapUrl: Maybe<string>;
  readonly mapImage: Media;
}

/** Everything the profile page shows. */
export interface Profile {
  readonly company: Company;
  readonly services: Services;
  readonly products: Products;
  readonly advantages: Advantages;
  readonly journey: Journey;
  readonly levels: EngagementLevels;
  readonly projects: readonly Project[];
  readonly clients: Clients;
  readonly contact: Contact;
}
