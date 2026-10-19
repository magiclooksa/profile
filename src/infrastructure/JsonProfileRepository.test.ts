import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DataError } from './decoders';
import { JsonProfileRepository, type JsonFetcher } from './JsonProfileRepository';

const DATA_DIR = join(import.meta.dirname, '../../public/data');
const fromDisk: JsonFetcher = async (file) => JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8')) as unknown;

describe('JsonProfileRepository', () => {
  it('loads every data file shipped with the site', async () => {
    const profile = await new JsonProfileRepository(fromDisk).load();
    expect(profile.company.name.en).toBe('MAGIC LOOK');
    expect(profile.journey.steps).toHaveLength(15);
    expect(new Set(profile.projects.map((p) => p.layout)).size).toBe(4);
  });

  it('names the file and field of a mistake', async () => {
    const broken: JsonFetcher = async (file) => {
      const data = await fromDisk(file);
      return file === 'projects.json' ? [{ ...(data as object[])[0], colors: ['brown'] }] : data;
    };
    await expect(new JsonProfileRepository(broken).load()).rejects.toThrowError(DataError);
    await expect(new JsonProfileRepository(broken).load()).rejects.toThrow('projects.json[0].colors[0]');
  });

  it('rejects an unknown gallery layout', async () => {
    const broken: JsonFetcher = async (file) =>
      file === 'projects.json' ? [{ id: 'x', layout: 'carousel3d' }] : fromDisk(file);
    await expect(new JsonProfileRepository(broken).load()).rejects.toThrow('projects.json[0].layout');
  });
});
