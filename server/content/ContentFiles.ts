/**
 * The content on disk: JSON documents in public/data, with a backup of each version before it is
 * replaced, and the photos and films in public/, including uploads from the dashboard.
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { basename, extname, relative, resolve, sep } from 'node:path';
import { HttpError } from '../http/respond';

export const MEDIA_FILE = /\.(jpe?g|png|webp|avif|gif|svg|mp4|webm|mov)$/i;
const MEDIA_DIRS = ['images', 'videos', 'assets', 'og'];
const UPLOAD_DIR = 'images/uploads';
const MAX_UPLOAD = 300 * 1024 * 1024;
const BACKUPS_PER_FILE = 30;

/** Every file under `dir` matching `pattern`, as "/"-separated paths relative to `base`. */
export function listFiles(dir: string, pattern: RegExp, base = dir): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return listFiles(path, pattern, base);
    return pattern.test(entry.name) ? [relative(base, path).split(sep).join('/')] : [];
  }).sort();
}

/** The file a document path names, refusing anything outside the data folder or not JSON. */
export function resolveDocument(dataDir: string, path: string): string {
  const file = resolve(dataDir, path);
  if (!file.startsWith(dataDir + sep) || !file.endsWith('.json')) {
    throw new HttpError(400, `مسار غير مسموح: ${path}`);
  }
  return file;
}

/** A safe file name: Latin letters, digits, dots and dashes; anything else becomes a dash. */
export function safeFileName(name: string): string {
  const ext = extname(name).toLowerCase();
  const stem = basename(name, extname(name)).toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `${stem || 'file'}${ext}`;
}

export interface ContentPaths {
  readonly data: string;
  readonly public: string;
  /** Where earlier versions of documents are kept. */
  readonly history: string;
}

export class ContentFiles {
  constructor(private readonly paths: ContentPaths, private readonly now: () => Date = () => new Date()) {}

  listDocuments(): string[] {
    return listFiles(this.paths.data, /\.json$/);
  }

  readDocument(path: string): string {
    const file = resolveDocument(this.paths.data, path);
    if (!existsSync(file)) throw new HttpError(404, `الملف غير موجود: ${path}`);
    return readFileSync(file, 'utf8');
  }

  /** Replaces a document, keeping the previous version in the history folder. */
  writeDocument(path: string, value: unknown): void {
    const file = resolveDocument(this.paths.data, path);
    if (existsSync(file)) this.backup(path, readFileSync(file, 'utf8'));
    mkdirSync(resolve(file, '..'), { recursive: true });
    writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  }

  listMedia(): string[] {
    return MEDIA_DIRS.flatMap((dir) => listFiles(resolve(this.paths.public, dir), MEDIA_FILE, this.paths.public));
  }

  /** Streams an upload into public/images/uploads/<year-month>/ and returns its path in the site. */
  saveUpload(req: IncomingMessage, originalName: string): Promise<string> {
    const name = safeFileName(originalName);
    if (!MEDIA_FILE.test(name)) throw new HttpError(400, 'نوع الملف غير مسموح: صور أو فيديو فقط');
    const declared = Number(req.headers['content-length'] ?? 0);
    if (declared > MAX_UPLOAD) throw new HttpError(413, 'الملف أكبر من 300 ميغابايت');

    const month = this.now().toISOString().slice(0, 7);
    const dir = resolve(this.paths.public, UPLOAD_DIR, month);
    mkdirSync(dir, { recursive: true });
    let target = name;
    for (let i = 2; existsSync(resolve(dir, target)); i++) {
      target = `${basename(name, extname(name))}-${i}${extname(name)}`;
    }
    const file = resolve(dir, target);

    return new Promise((done, fail) => {
      const out = createWriteStream(file);
      let size = 0;
      const abort = (error: Error): void => {
        out.destroy();
        rmSync(file, { force: true });
        fail(error);
      };
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_UPLOAD) {
          req.destroy();
          abort(new HttpError(413, 'الملف أكبر من 300 ميغابايت'));
        }
      });
      req.on('error', abort);
      out.on('error', abort);
      out.on('finish', () => done(`${UPLOAD_DIR}/${month}/${target}`));
      req.pipe(out);
    });
  }

  private backup(path: string, text: string): void {
    const dir = resolve(this.paths.history, path.replace(/[\\/]/g, '__'));
    mkdirSync(dir, { recursive: true });
    const stamp = this.now().toISOString().replace(/[:.]/g, '-');
    writeFileSync(resolve(dir, `${stamp}.json`), text);
    const versions = readdirSync(dir).sort();
    for (const old of versions.slice(0, Math.max(0, versions.length - BACKUPS_PER_FILE))) rmSync(resolve(dir, old));
  }
}
