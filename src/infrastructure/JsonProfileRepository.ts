import type { Profile } from '../domain/entities';
import type { ProfileRepository } from '../domain/ProfileRepository';
import type { Decoder } from './decoders';
import {
  advantagesDecoder, clientsDecoder, companyDecoder, contactDecoder, journeyDecoder,
  levelsDecoder, productsDecoder, projectsDecoder, servicesDecoder,
} from './schemas';

export type JsonFetcher = (path: string) => Promise<unknown>;

/** Default fetcher: reads files from the site's /data folder. */
export const httpFetcher = (baseUrl: string): JsonFetcher => async (file) => {
  const response = await fetch(`${baseUrl}${file}`);
  if (!response.ok) throw new Error(`تعذّر تحميل ${file} (${response.status})`);
  return response.json() as Promise<unknown>;
};

/** Adapter: builds the Profile from one JSON file per section. */
export class JsonProfileRepository implements ProfileRepository {
  constructor(private readonly fetchJson: JsonFetcher) {}

  async load(): Promise<Profile> {
    const read = async <T>(file: string, decoder: Decoder<T>): Promise<T> =>
      decoder(await this.fetchJson(file), file);

    const [company, services, products, advantages, journey, levels, projects, clients, contact] =
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
      ]);

    return { company, services, products, advantages, journey, levels, projects, clients, contact };
  }
}
