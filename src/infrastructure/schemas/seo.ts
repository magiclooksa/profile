import type { SeoSettings } from '../../domain/seo';
import { array, DataError, nullable, numberIn, object, string, type Decoder } from './decoders';

const siteUrl: Decoder<string> = (v, path) => {
  const s = string(v, path);
  if (!/^https?:\/\/.+\/$/.test(s)) throw new DataError(path, 'رابط كامل ينتهي بـ / مثل https://example.com/');
  return s;
};

const flag: Decoder<boolean> = (v, path) => {
  if (typeof v !== 'boolean') throw new DataError(path, 'true أو false');
  return v;
};

export const seoDecoder = object<SeoSettings>({
  siteUrl,
  title: string,
  description: string,
  keywords: array(string),
  image: object({ src: string, alt: string }),
  logo: string,
  business: object({
    types: array(string),
    foundingDate: nullable(string),
    city: nullable(string),
    region: nullable(string),
    country: string,
    latitude: nullable(numberIn(-90, 90)),
    longitude: nullable(numberIn(-180, 180)),
    openingHours: array(string),
    priceRange: nullable(string),
    areaServed: array(string),
  }),
  social: array(string),
  verification: object({ google: nullable(string), bing: nullable(string) }),
  aiCrawlers: flag,
});
