import { describe, expect, it } from 'vitest';
import type { ContentRepository, JsonValue } from '../../domain/content';
import { ContentService } from './ContentService';

class MemoryRepository implements ContentRepository {
  constructor(readonly files: Record<string, JsonValue>) {}
  async list(): Promise<readonly string[]> { return Object.keys(this.files); }
  async read(path: string): Promise<JsonValue> {
    const value = this.files[path];
    if (value === undefined) throw new Error(`missing ${path}`);
    return value;
  }
  async write(path: string, value: JsonValue): Promise<void> { this.files[path] = value; }
}

const media = { list: async () => ['images/a.jpg', 'videos/b.mp4'], upload: async (_: Blob, name: string) => `images/uploads/${name}` };
const publishing = { status: async () => ({ state: 'live' as const, updatedAt: null, message: null }) };
const rejectEmptyTitle = (_path: string, value: JsonValue): void => {
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && value.title === '') {
    throw new Error('بيانات غير صحيحة في faq.json.title');
  }
};

const setup = (files: Record<string, JsonValue> = {}) => {
  const repository = new MemoryRepository(files);
  return { repository, service: new ContentService(repository, media, rejectEmptyTitle, publishing) };
};

describe('ContentService', () => {
  it('groups documents in menu order with their Arabic names', async () => {
    const { service } = setup({ 'seo.json': {}, 'faq.json': {}, 'company.json': {}, 'projects/floor-majlis.json': {} });
    const groups = await service.listDocuments();
    expect(groups.map((g) => g.group)).toEqual(['identity', 'sections', 'catalogues', 'settings']);
    expect(groups[0]?.documents[0]?.title).toBe('المؤسسة');
    expect(groups[2]?.documents[0]?.title).toBe('floor majlis');
  });

  it('names project catalogues from the catalogue index', async () => {
    const { service } = setup({ 'catalogues.json': [{ href: 'floor-majlis.html', name: { ar: 'المجلس الأرضي' } }], 'projects/floor-majlis.json': {} });
    const groups = await service.listDocuments();
    expect(groups.find((g) => g.group === 'catalogues')?.documents[0]?.title).toBe('المجلس الأرضي');
  });

  it('saves a valid document', async () => {
    const { service, repository } = setup({ 'faq.json': { title: 'قديم' } });
    expect(await service.saveDocument('faq.json', { title: 'جديد' })).toEqual({ ok: true });
    expect(repository.files['faq.json']).toEqual({ title: 'جديد' });
  });

  it('refuses an invalid document and leaves the file as it was', async () => {
    const { service, repository } = setup({ 'faq.json': { title: 'قديم' } });
    const result = await service.saveDocument('faq.json', { title: '' });
    expect(result).toMatchObject({ ok: false, reason: 'invalid' });
    expect(repository.files['faq.json']).toEqual({ title: 'قديم' });
  });

  it('never writes generated documents', async () => {
    const { service } = setup({ 'catalogues.json': [] });
    expect(await service.saveDocument('catalogues.json', [])).toMatchObject({ ok: false, reason: 'read-only' });
  });

  it('counts what the site holds, even when a file is missing', async () => {
    const { service } = setup({ 'catalogues.json': [1, 2], 'faq.json': { items: [1, 2, 3] } });
    expect(await service.stats()).toEqual({ catalogues: 2, projects: 0, servicePages: 0, faq: 3, products: 0, media: 2 });
  });
});
