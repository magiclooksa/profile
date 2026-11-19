import type { ContentRepository, ContentValidator, JsonValue, MediaLibrary, PublishMonitor, PublishStatus } from '../../domain/content';
import { isJsonObject, SessionExpiredError } from '../../domain/content';
import { describeDocument, GENERATED_DOCUMENTS, groupDocuments, type DocumentGroup } from './catalog';

export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'invalid' | 'read-only' | 'failed'; readonly message: string };

export interface DashboardStats {
  readonly catalogues: number;
  readonly projects: number;
  readonly servicePages: number;
  readonly faq: number;
  readonly products: number;
  readonly media: number;
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** How many entries a document holds: the array itself, or one of its array fields. */
function count(value: JsonValue | undefined, field?: string): number {
  const list = field && isJsonObject(value) ? value[field] : value;
  return Array.isArray(list) ? list.length : 0;
}

/** Use cases of the dashboard. It knows the ports, never how they are implemented. */
export class ContentService {
  constructor(
    private readonly repository: ContentRepository,
    private readonly media: MediaLibrary,
    private readonly validate: ContentValidator,
    private readonly publishing: PublishMonitor,
  ) {}

  async listDocuments(): Promise<readonly DocumentGroup[]> {
    const [paths, names] = await Promise.all([this.repository.list(), this.projectNames()]);
    return groupDocuments(paths.map((path) => describeDocument(path, names)));
  }

  /** The Arabic name of each project catalogue, from the catalogue index (slug → name). */
  async projectNames(): Promise<Readonly<Record<string, string>>> {
    const index = await this.repository.read('catalogues.json').catch(() => null);
    if (!Array.isArray(index)) return {};
    return Object.fromEntries(index.flatMap((entry) => {
      if (!isJsonObject(entry) || typeof entry.href !== 'string' || !isJsonObject(entry.name)) return [];
      const name = entry.name.ar;
      return typeof name === 'string' ? [[entry.href.replace(/\.html$/, ''), name]] : [];
    }));
  }

  loadDocument(path: string): Promise<JsonValue> {
    return this.repository.read(path);
  }

  isReadOnly(path: string): boolean {
    return GENERATED_DOCUMENTS.has(path);
  }

  /** Checks the document against its schema first, so a mistake never reaches the live site. */
  async saveDocument(path: string, value: JsonValue): Promise<SaveResult> {
    if (this.isReadOnly(path)) {
      return { ok: false, reason: 'read-only', message: 'هذا الملف يُكتب تلقائياً ولا يُعدّل يدوياً' };
    }
    try {
      this.validate(path, value);
    } catch (error) {
      return { ok: false, reason: 'invalid', message: errorMessage(error) };
    }
    try {
      await this.repository.write(path, value);
      return { ok: true };
    } catch (error) {
      if (error instanceof SessionExpiredError) throw error;
      return { ok: false, reason: 'failed', message: errorMessage(error) };
    }
  }

  listMedia(): Promise<readonly string[]> {
    return this.media.list();
  }

  uploadMedia(file: Blob, name: string): Promise<string> {
    return this.media.upload(file, name);
  }

  publishStatus(): Promise<PublishStatus> {
    return this.publishing.status();
  }

  async stats(): Promise<DashboardStats> {
    const read = (path: string): Promise<JsonValue | undefined> => this.repository.read(path).catch(() => undefined);
    const [catalogues, projects, servicePages, faq, products, media] = await Promise.all([
      read('catalogues.json'), read('projects.json'), read('service-pages.json'), read('faq.json'),
      read('products.json'), this.media.list().catch(() => []),
    ]);
    return {
      catalogues: count(catalogues),
      projects: count(projects),
      servicePages: count(servicePages),
      faq: count(faq, 'items'),
      products: count(products, 'items'),
      media: media.length,
    };
  }
}
