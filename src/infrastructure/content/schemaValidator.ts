import type { ContentValidator } from '../../domain/content';
import type { Decoder } from '../schemas/decoders';
import {
  advantagesDecoder, cataloguesDecoder, ceoDecoder, clientsDecoder, companyDecoder, contactDecoder, faqDecoder,
  journeyDecoder, levelsDecoder, productsDecoder, projectsDecoder, servicePagesDecoder, servicesDecoder,
} from '../schemas/profile';
import { seoDecoder } from '../schemas/seo';
import { villaDecoder } from '../schemas/villa';

/** The same decoders the site reads its data with, so what the dashboard accepts the site can show. */
const DECODERS: Readonly<Record<string, Decoder<unknown>>> = {
  'company.json': companyDecoder,
  'services.json': servicesDecoder,
  'products.json': productsDecoder,
  'advantages.json': advantagesDecoder,
  'journey.json': journeyDecoder,
  'levels.json': levelsDecoder,
  'projects.json': projectsDecoder,
  'clients.json': clientsDecoder,
  'contact.json': contactDecoder,
  'catalogues.json': cataloguesDecoder,
  'ceo.json': ceoDecoder,
  'faq.json': faqDecoder,
  'service-pages.json': servicePagesDecoder,
  'seo.json': seoDecoder,
  'villa-wood.json': villaDecoder,
};

const decoderFor = (path: string): Decoder<unknown> | undefined =>
  DECODERS[path] ?? (path.startsWith('projects/') ? villaDecoder : undefined);

/** Adapter: validates with the site's decoders. Files without one (site.json) only need to be JSON. */
export const schemaValidator: ContentValidator = (path, value) => {
  decoderFor(path)?.(value, path);
};
