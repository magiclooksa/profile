import { describe, expect, it } from 'vitest';
import type { Profile, Project } from '../domain/entities';
import { GetProfile } from './GetProfile';

const project = (id: string, images: number): Project => ({
  id, name: null, category: 'سكني', city: null, colors: [], layout: 'mosaic',
  images: Array.from({ length: images }, (_, i) => ({ src: null, caption: `صورة ${i}` })),
});

describe('GetProfile', () => {
  it('drops projects that have no images', async () => {
    const profile = { projects: [project('a', 3), project('b', 0)] } as unknown as Profile;
    const result = await new GetProfile({ load: async () => profile }).execute();
    expect(result.projects.map((p) => p.id)).toEqual(['a']);
  });
});
