/**
 * File storage. Each file's details (name, folder, size, type) live in the MongoDB collection "files";
 * its bytes live with one of two drivers:
 *   disk    a folder in the project (storage/), laid out like the folders in the dashboard
 *   gridfs  inside MongoDB itself (for hosts whose disk is wiped on restart, like Render's free plan)
 * Folders in the dashboard are names in the "folders" collection, so moving a file is cheap and safe.
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, rename, rm, rmdir } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { GridFSBucket, ObjectId, type Db } from 'mongodb';

export type DriverName = 'disk' | 'gridfs';

export interface FileDoc {
  _id: ObjectId;
  name: string;
  /** "" is the root; "projects/villa" is a folder inside "projects". */
  folder: string;
  size: number;
  contentType: string;
  driver: DriverName;
  /** Where the driver keeps the bytes. */
  key: string;
  uploadedAt: Date;
  /** For files moved in by the seed script: their old path under public/. */
  sourcePath?: string;
}

export interface FolderDoc { _id: string; createdAt: Date }

export interface Driver {
  /** Where a new file goes. */
  keyFor(id: ObjectId, folder: string, name: string): string;
  /** Stores the stream and returns its size in bytes. */
  write(key: string, input: Readable, name: string): Promise<number>;
  /** Reads the whole file, or the bytes from start to end (inclusive). */
  read(key: string, range?: { start: number; end: number }): Readable;
  remove(key: string): Promise<void>;
  /** Moves the bytes when the file is renamed or moved (no-op where keys do not depend on the folder). */
  move(from: string, to: string): Promise<void>;
}

// ---- names and folders -------------------------------------------------------

const BAD = /[\\/:*?"<>|\u0000-\u001f\u007f]/;

/** A file or folder name that is safe on Windows, macOS and Linux. Returns null if unusable. */
export function cleanName(input: unknown, max = 150): string | null {
  if (typeof input !== 'string') return null;
  const name = input.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!name || name.length > max || BAD.test(name) || name.startsWith('.') || /[ .]$/.test(name)) return null;
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(name)) return null;
  return name;
}

/** "a / b//c" → "a/b/c". Returns null when a part is not a valid name. "" is the root. */
export function cleanFolder(input: unknown): string | null {
  if (input === undefined || input === null) return '';
  if (typeof input !== 'string') return null;
  const parts = input.split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 10) return null;
  const clean = parts.map((p) => cleanName(p, 80));
  return clean.every((p): p is string => p !== null) ? clean.join('/') : null;
}

/** Every ancestor of a folder, itself included: "a/b/c" → ["a", "a/b", "a/b/c"]. */
export const ancestors = (folder: string): string[] =>
  folder ? folder.split('/').map((_, i, all) => all.slice(0, i + 1).join('/')) : [];

/** True when `folder` is `parent` or inside it. */
export const isWithin = (folder: string, parent: string): boolean =>
  folder === parent || folder.startsWith(`${parent}/`);

// ---- drivers -----------------------------------------------------------------

export class DiskDriver implements Driver {
  constructor(private readonly root: string) {}

  /** Absolute path of a key, refusing anything that would leave the storage folder. */
  private path(key: string): string {
    const full = resolve(this.root, ...key.split('/'));
    const rel = relative(this.root, full);
    if (!rel || isAbsolute(rel) || rel.split(sep).includes('..')) throw new Error('مسار غير صالح');
    return full;
  }

  keyFor(id: ObjectId, folder: string, name: string): string {
    return [folder, `${id.toString().slice(-8)}-${name}`].filter(Boolean).join('/');
  }

  async write(key: string, input: Readable): Promise<number> {
    const full = this.path(key);
    await mkdir(dirname(full), { recursive: true });
    let size = 0;
    input.on('data', (chunk: Buffer) => { size += chunk.length });
    try {
      await pipeline(input, createWriteStream(full, { flags: 'wx' }));
    } catch (error) {
      await rm(full, { force: true });
      throw error;
    }
    return size;
  }

  read(key: string, range?: { start: number; end: number }): Readable {
    return createReadStream(this.path(key), range);
  }

  async remove(key: string): Promise<void> {
    const full = this.path(key);
    await rm(full, { force: true });
    await this.pruneEmpty(dirname(full));
  }

  async move(from: string, to: string): Promise<void> {
    if (from === to) return;
    const src = this.path(from);
    const dest = this.path(to);
    await mkdir(dirname(dest), { recursive: true });
    await rename(src, dest);
    await this.pruneEmpty(dirname(src));
  }

  /** Removes folders left empty, up to the storage root. */
  private async pruneEmpty(dir: string): Promise<void> {
    for (let d = dir; d.startsWith(this.root + sep); d = dirname(d)) {
      if ((await readdir(d).catch(() => ['?'])).length) return;
      await rmdir(d).catch(() => {});
    }
  }

  /** Where the storage folder is, for messages. */
  get location(): string { return this.root }
}

export class GridDriver implements Driver {
  private readonly bucket: GridFSBucket;
  constructor(db: Db) { this.bucket = new GridFSBucket(db, { bucketName: 'media' }) }

  keyFor(id: ObjectId): string { return id.toString() }

  async write(key: string, input: Readable, name: string): Promise<number> {
    const upload = this.bucket.openUploadStreamWithId(new ObjectId(key), name);
    await pipeline(input, upload);
    return upload.length;
  }

  read(key: string, range?: { start: number; end: number }): Readable {
    return this.bucket.openDownloadStream(new ObjectId(key), range ? { start: range.start, end: range.end + 1 } : {});
  }

  async remove(key: string): Promise<void> {
    await this.bucket.delete(new ObjectId(key)).catch(() => {});
  }

  async move(): Promise<void> {}
}

export function createDrivers(db: Db, storageDir: string): Record<DriverName, Driver> {
  return { disk: new DiskDriver(resolve(storageDir)), gridfs: new GridDriver(db) };
}

/**
 * Files uploaded before the storage module existed sit in GridFS without details in "files".
 * This adds them once, keeping their ids so the links already used in the content keep working.
 */
export async function adoptLegacyGridFiles(db: Db): Promise<number> {
  const files = db.collection<FileDoc>('files');
  const legacy = await db.collection('media.files').find().toArray();
  let added = 0;
  for (const f of legacy) {
    const id = f._id as ObjectId;
    if (await files.countDocuments({ _id: id })) continue;
    const meta = (f.metadata ?? {}) as { contentType?: string; sourcePath?: string };
    await files.insertOne({
      _id: id, name: String(f.filename), folder: '', size: Number(f.length), driver: 'gridfs', key: id.toString(),
      contentType: meta.contentType ?? 'application/octet-stream', uploadedAt: f.uploadDate as Date,
      ...(meta.sourcePath ? { sourcePath: meta.sourcePath } : {}),
    });
    added++;
  }
  return added;
}
