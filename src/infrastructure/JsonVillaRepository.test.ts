import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DataError } from './decoders';
import type { JsonFetcher } from './JsonProfileRepository';
import { JsonVillaRepository } from './JsonVillaRepository';

const FILE = 'villa-wood.json';
const PUBLIC_DIR = join(import.meta.dirname, '../../public');
const raw = (): Record<string, unknown> =>
  JSON.parse(readFileSync(join(PUBLIC_DIR, 'data', FILE), 'utf8')) as Record<string, unknown>;
const serving = (data: unknown): JsonFetcher => async () => data;

describe('JsonVillaRepository', () => {
  it('loads the villa catalogue shipped with the site', async () => {
    const villa = await new JsonVillaRepository(serving(raw()), FILE).load();
    expect(villa.name.ar).toBe('فيلا الخشب');
    expect(villa.spaces.map((s) => s.id)).toEqual(['living', 'lounge', 'bedroom']);
    expect(villa.products).toHaveLength(16);
    expect(villa.materials).toHaveLength(9);
  });

  it('points only at photos that exist', async () => {
    const villa = await new JsonVillaRepository(serving(raw()), FILE).load();
    const photos = [
      villa.cover, villa.intro.image, villa.intro.inset, villa.collection.image,
      ...villa.spaces.flatMap((s) => [s.look.image, ...s.gallery, ...s.details]),
      ...villa.products.flatMap((p) => [...p.views, ...p.details, ...p.inSitu]),
    ].map((p) => p.src);
    const files = [...photos, ...villa.products.map((p) => p.card), ...villa.materials.map((m) => m.swatch)];
    const missing = files.filter((src) => {
      try { readFileSync(join(PUBLIC_DIR, src)); return false } catch { return true }
    });
    expect(missing).toEqual([]);
  });

  it('names the spot that points at an unknown piece', async () => {
    const data = raw();
    const spaces = data.spaces as { look: { spots: { product: string }[] } }[];
    const firstSpot = spaces[0]?.look.spots[0];
    if (firstSpot) firstSpot.product = 'no-such-piece';
    const load = new JsonVillaRepository(serving(data), FILE).load();
    await expect(load).rejects.toThrowError(DataError);
    await expect(new JsonVillaRepository(serving(data), FILE).load()).rejects.toThrow('spaces[0].look.spots[0].product');
  });

  it('rejects a piece made of an unknown material', async () => {
    const data = raw();
    const products = data.products as { materials: string[] }[];
    products[0]?.materials.push('marble');
    await expect(new JsonVillaRepository(serving(data), FILE).load()).rejects.toThrow('products[0].materials');
  });
});
