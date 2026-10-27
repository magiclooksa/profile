import {
  PHOTO_RATIOS, type CloseUp, type Material, type Product, type Space, type SpreadPhoto, type Villa, type VillaPhoto,
} from '../domain/villa';
import { DataError, array, boolean, hexColor, nullable, numberIn, object, oneOf, string, type Decoder } from './decoders';

const photo: Decoder<VillaPhoto> = object<VillaPhoto>({ src: string, ratio: oneOf(PHOTO_RATIOS), caption: string });

const spreadPhoto: Decoder<SpreadPhoto> = object<SpreadPhoto>({
  src: string, ratio: oneOf(PHOTO_RATIOS), caption: string, span: numberIn(1, 12),
});

const closeUp: Decoder<CloseUp> = object<CloseUp>({
  src: string, ratio: oneOf(PHOTO_RATIOS), caption: string, product: nullable(string),
});

const material: Decoder<Material> = object<Material>({
  id: string, name: string, en: string, color: hexColor, swatch: string, note: string,
});

const space: Decoder<Space> = object<Space>({
  id: string, name: string, en: string, intro: string,
  look: object({
    image: photo,
    spots: array(object({ x: numberIn(0, 100), y: numberIn(0, 100), product: string })),
  }),
  gallery: array(spreadPhoto),
  details: array(closeUp),
});

const product: Decoder<Product> = object<Product>({
  id: string, name: string, en: string, category: string,
  spaces: array(string), custom: boolean, materials: array(string),
  finish: string, text: string, card: string,
  views: array(photo), details: array(photo), inSitu: array(photo),
});

const shape: Decoder<Villa> = object<Villa>({
  name: object({ ar: string, en: string }),
  kicker: string,
  tagline: string,
  cover: photo,
  intro: object({
    lead: string, paragraphs: array(string), words: array(object({ ar: string, en: string })),
    image: photo, inset: photo,
  }),
  materials: array(material),
  spaces: array(space),
  collection: object({ intro: string, image: photo }),
  products: array(product),
  closing: object({ title: string, text: string }),
});

/** Ids must be unique, and every reference must point at something that exists. */
function checkLinks(villa: Villa, path: string): void {
  const ids = (list: readonly { id: string }[], where: string): Set<string> => {
    const seen = new Set<string>();
    list.forEach((item, i) => {
      if (seen.has(item.id)) throw new DataError(`${path}.${where}[${i}].id`, 'معرّف غير مكرر');
      seen.add(item.id);
    });
    return seen;
  };
  const products = ids(villa.products, 'products');
  const spaces = ids(villa.spaces, 'spaces');
  const materials = ids(villa.materials, 'materials');
  const known = (set: Set<string>, id: string, at: string, what: string): void => {
    if (!set.has(id)) throw new DataError(at, `${what} معروف (وُجد "${id}")`);
  };
  villa.spaces.forEach((s, i) => {
    s.look.spots.forEach((spot, j) => known(products, spot.product, `${path}.spaces[${i}].look.spots[${j}].product`, 'معرّف قطعة'));
    s.details.forEach((d, j) => {
      if (d.product !== null) known(products, d.product, `${path}.spaces[${i}].details[${j}].product`, 'معرّف قطعة');
    });
  });
  villa.products.forEach((p, i) => {
    if (p.spaces.length === 0) throw new DataError(`${path}.products[${i}].spaces`, 'مساحة واحدة على الأقل');
    p.spaces.forEach((id, j) => known(spaces, id, `${path}.products[${i}].spaces[${j}]`, 'معرّف مساحة'));
    p.materials.forEach((id, j) => known(materials, id, `${path}.products[${i}].materials[${j}]`, 'معرّف خامة'));
  });
}

export const villaDecoder: Decoder<Villa> = (v, path) => {
  const villa = shape(v, path);
  checkLinks(villa, path);
  return villa;
};
