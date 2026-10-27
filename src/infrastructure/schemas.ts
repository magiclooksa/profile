import {
  COLLECTION_STYLES, FILM_STYLES, GALLERY_LAYOUTS, type Collection, type Feature, type Film,
  type Advantages, type Clients, type Company, type CompareProject, type Contact,
  type EngagementLevels, type IconName, type Journey, type Media, type Products,
  type Project, type Services, type StandardProject, type TitledText,
} from '../domain/entities';
import { array, hexColor, nullable, numberIn, object, oneOf, string, tagged, type Decoder } from './decoders';

const ICONS: readonly IconName[] = [
  'sofa', 'bed', 'chair', 'table', 'tv', 'mirror', 'partition', 'cabinet', 'curtain', 'lamp',
  'space', 'plan', 'palette', 'wall', 'light', 'pin', 'mail', 'phone', 'web',
];

const icon = oneOf(ICONS);
const media: Decoder<Media> = object<Media>({
  src: nullable(string), caption: string,
  type: nullable(oneOf(['image', 'video'] as const)),
  poster: nullable(string),
  aspectRatio: nullable(oneOf(['9:16', '16:9', 'auto'] as const)),
});
const film: Decoder<Film> = object<Film>({
  style: oneOf(FILM_STYLES), kicker: string, title: string, text: string,
  points: (v, path) => (v === undefined || v === null ? [] : array(string)(v, path)),
  video: media,
});
const collection: Decoder<Collection> = object<Collection>({
  style: oneOf(COLLECTION_STYLES), kicker: string, title: string, text: string,
  items: array(object({
    title: string, image: media, tag: nullable(string), color: nullable(hexColor),
    spots: (v, path) => (v === undefined || v === null ? [] : array(object({
      x: numberIn(0, 100), y: numberIn(0, 100), title: string, text: string,
      w: nullable(numberIn(1, 100)), h: nullable(numberIn(1, 100)),
    }))(v, path)),
    palette: (v, path) => (v === undefined || v === null ? [] : array(object({ name: string, color: hexColor }))(v, path)),
  })),
});
const titledText: Decoder<TitledText> = object<TitledText>({ title: string, text: string });

export const companyDecoder = object<Company>({
  name: object({ ar: string, en: string }),
  entityType: string,
  field: string,
  tagline: string,
  closingLine: string,
  hero: nullable(media),
  feature: nullable(object<Feature>({
    kicker: string, title: string, en: string, text: string, cta: string, href: string,
    facts: array(string), image: media, pages: array(media),
  })),
  about: object({ lead: string, highlight: string, paragraphs: array(string), image: media }),
  statements: array(titledText),
  interiorDesign: object({ intro: string, traits: array(string), images: array(media) }),
  films: (v, path) => (v === undefined || v === null ? [] : array(film)(v, path)),
  collections: (v, path) => (v === undefined || v === null ? [] : array(collection)(v, path)),
});

export const servicesDecoder = object<Services>({
  intro: string, note: string, items: array(object({ icon, text: string })),
});

export const productsDecoder = object<Products>({
  intro: string, items: array(object({ icon, name: string })),
});

export const advantagesDecoder = object<Advantages>({ image: media, items: array(titledText) });
export const journeyDecoder = object<Journey>({ intro: string, steps: array(string) });
export const levelsDecoder = object<EngagementLevels>({ intro: string, items: array(string) });

const projectBase = {
  id: string,
  name: nullable(string),
  category: string,
  city: nullable(string),
  colors: array(hexColor),
  images: array(media),
};

const standardProject = (layout: StandardProject['layout']): Decoder<Project> =>
  object<StandardProject>({ ...projectBase, layout: oneOf([layout]) });

const compareProject: Decoder<Project> = object<CompareProject>({
  ...projectBase, layout: oneOf(['compare'] as const), before: media, after: media,
});

const projectDecoders: Record<(typeof GALLERY_LAYOUTS)[number], Decoder<Project>> = {
  mosaic: standardProject('mosaic'),
  slideshow: standardProject('slideshow'),
  filmstrip: standardProject('filmstrip'),
  compare: compareProject,
};

export const projectsDecoder = array(tagged<Project>('layout', projectDecoders));

export const clientsDecoder = object<Clients>({
  segments: array(titledText),
  partners: array(object({ name: nullable(string), logo: nullable(string) })),
  credentials: array(object({ title: nullable(string), image: media })),
});

export const contactDecoder = object<Contact>({
  phone: nullable(string),
  email: nullable(string),
  website: nullable(string),
  address: nullable(string),
  mapUrl: nullable(string),
  mapImage: media,
});
