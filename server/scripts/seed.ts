/**
 * Moves the content of public/data into MongoDB.
 *
 *   npm run seed                 copy sections that are not in the database yet
 *   npm run seed -- --force      overwrite every section with the files' content
 *   npm run seed -- --media      also upload every image and video the content uses
 *                                into the database (GridFS) and point the content at them
 */
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { GridFSBucket } from 'mongodb';
import { connect } from '../db';
import { fileUrl, type FileMeta } from '../routes/files';
import { SECTIONS } from '../sections';

const ROOT = resolve(import.meta.dirname, '../..');
const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const withMedia = args.has('--media');

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI مطلوب');
const publicUrl = (process.env.PUBLIC_URL ?? '').trim().replace(/\/+$/, '');

const TYPES: Record<string, string> = {
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
};
const MEDIA_PATH = /^(images|videos|assets)\/[^?#]+\.(webp|jpe?g|png|gif|avif|mp4|webm|mov)$/i;

const { client, db } = await connect(uri, process.env.MONGODB_DB?.trim() || 'magiclook');
const content = db.collection<{ _id: string; data: unknown; updatedAt: Date }>('content');
const bucket = new GridFSBucket(db, { bucketName: 'media' });
const files = db.collection('media.files');

/** Uploads a file from public/ once, and returns its URL on the server. */
const uploaded = new Map<string, string>();
async function uploadOnce(path: string): Promise<string> {
  const cached = uploaded.get(path);
  if (cached) return cached;
  const existing = await files.findOne({ 'metadata.sourcePath': path });
  let url: string;
  if (existing) {
    url = fileUrl(publicUrl, existing._id.toString(), existing.filename as string);
  } else {
    const name = basename(path);
    const meta: FileMeta = { contentType: TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream', originalName: name, sourcePath: path };
    const stream = bucket.openUploadStream(name, { metadata: meta });
    await new Promise<void>((done, fail) => {
      createReadStream(resolve(ROOT, 'public', path)).pipe(stream).on('finish', () => done()).on('error', fail);
    });
    url = fileUrl(publicUrl, stream.id.toString(), name);
    console.log(`  ↑ ${path}`);
  }
  uploaded.set(path, url);
  return url;
}

/** Replaces every media path in the content with the uploaded file's URL. */
async function moveMedia(value: unknown): Promise<unknown> {
  if (typeof value === 'string') {
    return MEDIA_PATH.test(value) && existsSync(resolve(ROOT, 'public', value)) ? uploadOnce(value) : value;
  }
  if (Array.isArray(value)) return Promise.all(value.map(moveMedia));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await moveMedia(v);
    return out;
  }
  return value;
}

try {
  for (const section of SECTIONS) {
    const file = resolve(ROOT, 'public/data', `${section.key}.json`);
    if (!existsSync(file)) continue;
    if (!force && await content.countDocuments({ _id: section.key })) {
      console.log(`- ${section.key}: موجود مسبقاً (استخدم --force للاستبدال)`);
      continue;
    }
    let data: unknown = JSON.parse(readFileSync(file, 'utf8'));
    section.decoder(data, `${section.key}.json`);
    if (withMedia) data = await moveMedia(data);
    await content.replaceOne({ _id: section.key }, { data, updatedAt: new Date() }, { upsert: true });
    console.log(`✓ ${section.key}`);
  }
  console.log(withMedia ? `تم. رُفع ${uploaded.size} ملف وسائط.` : 'تم.');
} finally {
  await client.close();
}
