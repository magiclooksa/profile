import type { Villa, VillaRepository } from '../domain/villa';
import type { JsonFetcher } from './JsonProfileRepository';
import { villaDecoder } from './villaSchema';

/** Adapter: reads one villa catalogue from a JSON file in the site's data folder. */
export class JsonVillaRepository implements VillaRepository {
  constructor(private readonly fetchJson: JsonFetcher, private readonly file: string) {}

  async load(): Promise<Villa> {
    return villaDecoder(await this.fetchJson(this.file), this.file);
  }
}
