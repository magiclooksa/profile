/**
 * Moves the content of public/data into MongoDB.
 *
 *   npm run seed                 copy sections that are not in the database yet
 *   npm run seed -- --force      overwrite every section with the files' content
 *   npm run seed -- --media      also move every image and video the content uses into the file
 *                                storage (storage/ folder, or MongoDB with STORAGE_DRIVER=gridfs),
 *                                in the same folders as in public/, and point the content at them
 */
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { basename, extname, posix, resolve } from 'node:path';
import { ObjectId } from 'mongodb';
import { connect } from '../db';
import { fileUrl } from '../routes/files';
import { SECTIONS } from '../sections';
import { ancestors, cleanFolder, cleanName, createDrivers, type DriverName, type FileDoc, type FolderDoc } from '../storage';

const ROOT = resolve(import.meta.dirname, '../..');
// In the repository the content is in public/; in an installed release only the built copy (dist/) exists.
const PUBLIC = existsSync(resolve(ROOT, 'public/data')) ? resolve(ROOT, 'public') : resolve(ROOT, 'dist');
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
const files = db.collection<FileDoc>('files');
const folders = db.collection<FolderDoc>('folders');
const driverName: DriverName = process.env.STORAGE_DRIVER?.trim() === 'gridfs' ? 'gridfs' : 'disk';
const driver = createDrivers(db, resolve(ROOT, process.env.STORAGE_DIR?.trim() || 'storage'))[driverName];

/** Uploads a file from public/ once, and returns its URL on the server. */
const uploaded = new Map<string, string>();
async function uploadOnce(path: string): Promise<string> {
  const cached = uploaded.get(path);
  if (cached) return cached;
  const existing = await files.findOne({ sourcePath: path });
  let url: string;
  if (existing) {
    url = fileUrl(publicUrl, existing._id.toString(), existing.name);
  } else {
    const id = new ObjectId();
    const folder = cleanFolder(posix.dirname(path)) ?? 'site';
    const name = cleanName(basename(path)) ?? `${id.toString().slice(-6)}${extname(path)}`;
    const key = driver.keyFor(id, folder, name);
    const size = await driver.write(key, createReadStream(resolve(PUBLIC, path)), name);
    for (const f of ancestors(folder)) await folders.updateOne({ _id: f }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    await files.insertOne({
      _id: id, name, folder, size, key, driver: driverName, sourcePath: path, uploadedAt: new Date(),
      contentType: TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
    });
    url = fileUrl(publicUrl, id.toString(), name);
    console.log(`  ↑ ${path}`);
  }
  uploaded.set(path, url);
  return url;
}

/** Replaces every media path in the content with the uploaded file's URL. */
async function moveMedia(value: unknown): Promise<unknown> {
  if (typeof value === 'string') {
    return MEDIA_PATH.test(value) && existsSync(resolve(PUBLIC, value)) ? uploadOnce(value) : value;
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
    const file = resolve(PUBLIC, 'data', `${section.key}.json`);
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
