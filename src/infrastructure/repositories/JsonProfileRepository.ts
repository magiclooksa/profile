import type { Profile } from '../../domain/entities';
import type { ProfileRepository } from '../../domain/ProfileRepository';
import type { JsonFetcher } from '../http/jsonFetcher';
import type { Decoder } from '../schemas/decoders';
import {
  advantagesDecoder, cataloguesDecoder, ceoDecoder, clientsDecoder, companyDecoder, contactDecoder, faqDecoder,
  journeyDecoder, levelsDecoder, productsDecoder, projectsDecoder, servicePagesDecoder, servicesDecoder,
} from '../schemas/profile';

/** Adapter: builds the Profile from one JSON file per section. */
export class JsonProfileRepository implements ProfileRepository {
  constructor(private readonly fetchJson: JsonFetcher) {}

  async load(): Promise<Profile> {
    const read = async <T>(file: string, decoder: Decoder<T>): Promise<T> =>
      decoder(await this.fetchJson(file), file);

    const [company, services, products, advantages, journey, levels, projects, clients, contact, catalogues, ceo, faq, servicePages] =
      await Promise.all([
        read('company.json', companyDecoder),
        read('services.json', servicesDecoder),
        read('products.json', productsDecoder),
        read('advantages.json', advantagesDecoder),
        read('journey.json', journeyDecoder),
        read('levels.json', levelsDecoder),
        read('projects.json', projectsDecoder),
        read('clients.json', clientsDecoder),
        read('contact.json', contactDecoder),
        read('catalogues.json', cataloguesDecoder),
        read('ceo.json', ceoDecoder),
        read('faq.json', faqDecoder),
        read('service-pages.json', servicePagesDecoder),
      ]);

    return {
      company, services, products, advantages, journey, levels, projects, clients, contact, catalogues, ceo, faq,
      servicePages,
    };
  }
}
