import { Router, type Request, type RequestHandler } from 'express';
import { ObjectId, type Db } from 'mongodb';
import multer, { type StorageEngine } from 'multer';
import {
  ancestors, cleanFolder, cleanName, isWithin,
  type Driver, type DriverName, type FileDoc, type FolderDoc,
} from '../storage';

/** Types the browser may show in the page. Anything else is always downloaded, never opened, so it cannot run scripts. */
const INLINE = /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|wav|ogg|webm)|application\/pdf|text\/plain)$/;

/** Address of a stored file. The name at the end keeps the extension, so the site knows videos. */
export const fileUrl = (publicUrl: string, id: string, name: string): string =>
  `${publicUrl ? `${publicUrl}/` : ''}api/files/${id}/${encodeURIComponent(name.replace(/[\\/]/g, '-'))}`;

interface Options { publicUrl: string; maxUploadMb: number; drivers: Record<DriverName, Driver>; current: DriverName }

const bad = (res: Parameters<RequestHandler>[1], status: number, error: string): void => void res.status(status).json({ error });

/** "photo.jpg" taken → "photo (2).jpg". */
async function freeName(files: ReturnType<Db['collection']>, folder: string, name: string, except?: ObjectId): Promise<string> {
  const dot = name.lastIndexOf('.');
  const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let i = 1; ; i++) {
    const candidate = i === 1 ? name : `${base} (${i})${ext}`;
    const taken = await files.findOne({ folder, name: candidate, ...(except ? { _id: { $ne: except } } : {}) });
    if (!taken) return candidate;
  }
}

export function storageRoutes(db: Db, admin: RequestHandler, opts: Options): { files: Router; folders: Router } {
  const files = db.collection<FileDoc>('files');
  const folders = db.collection<FolderDoc>('folders');
  const driverOf = (f: FileDoc): Driver => opts.drivers[f.driver];

  const describe = (f: FileDoc) => ({
    id: f._id.toString(), name: f.name, folder: f.folder, size: f.size, contentType: f.contentType,
    driver: f.driver, uploadedAt: f.uploadedAt, url: fileUrl(opts.publicUrl, f._id.toString(), f.name),
  });

  const ensureFolder = async (folder: string): Promise<void> => {
    for (const path of ancestors(folder)) {
      await folders.updateOne({ _id: path }, { $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    }
  };

  /** Streams each upload straight to the storage driver instead of holding it in memory. */
  const engine: StorageEngine = {
    _handleFile(req, file, cb) {
      const folder = (req as Request & { uploadFolder: string }).uploadFolder;
      const original = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const id = new ObjectId();
      void (async () => {
        const name = await freeName(files as never, folder, cleanName(original.replace(BAD_CHARS, '-')) ?? `file-${id.toString().slice(-6)}`);
        const driver = opts.drivers[opts.current];
        const key = driver.keyFor(id, folder, name);
        const size = await driver.write(key, file.stream, name);
        await files.insertOne({
          _id: id, name, folder, size, driver: opts.current, key,
          contentType: file.mimetype || 'application/octet-stream', uploadedAt: new Date(),
        });
        return { path: id.toString(), filename: name, size, destination: key };
      })().then((info) => cb(null, info), cb);
    },
    _removeFile(_req, file, cb) {
      void files.findOneAndDelete({ _id: new ObjectId(file.path) })
        .then((doc) => (doc ? driverOf(doc).remove(doc.key) : undefined))
        .then(() => cb(null), cb);
    },
  };
  const upload = multer({ storage: engine, limits: { fileSize: opts.maxUploadMb * 1024 * 1024, files: 50 } });

  // ---- files ---------------------------------------------------------------
  const filesRouter = Router();

  /** Admin: one folder's contents (or a search across all folders with ?q=), plus storage usage. */
  filesRouter.get('/', admin, async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const folder = cleanFolder(req.query.folder);
    if (folder === null) return bad(res, 400, 'اسم المجلد غير صالح');

    const list = q
      ? await files.find({ name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }).sort({ uploadedAt: -1 }).limit(300).toArray()
      : await files.find({ folder }).sort({ uploadedAt: -1 }).limit(2000).toArray();
    const all = await folders.find().toArray();
    const depth = folder ? folder.split('/').length + 1 : 1;
    const children = q ? [] : all.map((f) => f._id)
      .filter((p) => p.split('/').length === depth && (folder ? p.startsWith(`${folder}/`) : true))
      .sort((a, b) => a.localeCompare(b, 'ar'));
    const [usage] = await files.aggregate<{ count: number; bytes: number }>([
      { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: '$size' } } },
    ]).toArray();

    res.json({
      folder,
      folders: children.map((path) => ({ path, name: path.split('/').pop() })),
      files: list.map(describe),
      usage: { count: usage?.count ?? 0, bytes: usage?.bytes ?? 0, driver: opts.current },
    });
  });

  /** Admin: upload one or more files (field "files") into ?folder=. */
  filesRouter.post('/', admin, async (req, res, next) => {
    const folder = cleanFolder(req.query.folder);
    if (folder === null) return bad(res, 400, 'اسم المجلد غير صالح');
    await ensureFolder(folder);
    (req as Request & { uploadFolder: string }).uploadFolder = folder;
    next();
  }, upload.array('files'), (req, res) => {
    const uploaded = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!uploaded.length) return bad(res, 400, 'لم يُرفع أي ملف');
    res.status(201).json(uploaded.map((f) => ({
      id: f.path, name: f.filename, size: f.size, contentType: f.mimetype,
      url: fileUrl(opts.publicUrl, f.path, f.filename),
    })));
  });

  /** Admin: rename a file and/or move it to another folder. */
  filesRouter.patch('/:id', admin, async (req, res) => {
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return bad(res, 400, 'رقم الملف غير صحيح');
    const file = await files.findOne({ _id: new ObjectId(id) });
    if (!file) return bad(res, 404, 'الملف غير موجود');
    const name = req.body?.name === undefined ? file.name : cleanName(req.body.name);
    const folder = req.body?.folder === undefined ? file.folder : cleanFolder(req.body.folder);
    if (name === null) return bad(res, 400, 'اسم الملف غير صالح (لا يحتوي / \\ : * ? " < > |)');
    if (folder === null) return bad(res, 400, 'اسم المجلد غير صالح');
    if (await files.findOne({ folder, name, _id: { $ne: file._id } })) return bad(res, 409, 'يوجد ملف بهذا الاسم في المجلد');
    await ensureFolder(folder);
    const key = file.driver === 'disk' ? opts.drivers.disk.keyFor(file._id, folder, name) : file.key;
    await driverOf(file).move(file.key, key);
    await files.updateOne({ _id: file._id }, { $set: { name, folder, key } });
    res.json(describe({ ...file, name, folder, key }));
  });

  filesRouter.delete('/:id', admin, async (req, res) => {
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return bad(res, 400, 'رقم الملف غير صحيح');
    const file = await files.findOneAndDelete({ _id: new ObjectId(id) });
    if (!file) return bad(res, 404, 'الملف غير موجود');
    await driverOf(file).remove(file.key);
    res.json({ ok: true });
  });

  /** Public: serves a file, with byte ranges so videos can seek and play on iPhone. ?download=1 saves it. */
  const serve: RequestHandler = async (req, res) => {
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return void res.status(404).end();
    const file = await files.findOne({ _id: new ObjectId(id) });
    if (!file) return void res.status(404).end();
    const size = file.size;
    const inline = INLINE.test(file.contentType) && req.query.download === undefined;

    res.set({
      'Content-Type': inline ? file.contentType : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      ETag: `"${id}-${size}"`,
    });
    // A file opened on its own cannot run scripts (Chrome's PDF viewer needs to run, and PDFs cannot carry page scripts).
    if (file.contentType !== 'application/pdf') res.set('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'");
    if (req.get('if-none-match') === `"${id}-${size}"`) return void res.status(304).end();

    const range = /^bytes=(\d*)-(\d*)$/.exec(req.get('range') ?? '');
    let start = 0;
    let end = size - 1;
    if (range && size > 0) {
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size) {
        res.set('Content-Range', `bytes */${size}`);
        return void res.status(416).end();
      }
      res.status(206).set('Content-Range', `bytes ${start}-${end}/${size}`);
    }
    res.set('Content-Length', String(size === 0 ? 0 : end - start + 1));
    if (req.method === 'HEAD' || size === 0) return void res.end();

    const stream = driverOf(file).read(file.key, range ? { start, end } : undefined);
    stream.on('error', () => (res.headersSent ? res.destroy() : res.status(404).end()));
    stream.pipe(res);
  };
  filesRouter.get('/:id', serve);
  filesRouter.get('/:id/:name', serve);

  // ---- folders -------------------------------------------------------------
  const foldersRouter = Router();

  /** Admin: every folder, for the "move to" list. */
  foldersRouter.get('/', admin, async (_req, res) => {
    const all = await folders.find().toArray();
    res.json(all.map((f) => f._id).sort((a, b) => a.localeCompare(b, 'ar')));
  });

  foldersRouter.post('/', admin, async (req, res) => {
    const path = cleanFolder(req.body?.path);
    if (!path) return bad(res, 400, 'اسم المجلد غير صالح (لا يحتوي \\ : * ? " < > |)');
    if (await folders.findOne({ _id: path })) return bad(res, 409, 'يوجد مجلد بهذا الاسم');
    await ensureFolder(path);
    res.status(201).json({ path });
  });

  /** Admin: rename or move a folder with everything inside it. */
  foldersRouter.patch('/', admin, async (req, res) => {
    const from = cleanFolder(req.body?.from);
    const to = cleanFolder(req.body?.to);
    if (!from || !to) return bad(res, 400, 'اسم المجلد غير صالح');
    if (from === to) return void res.json({ path: to });
    if (isWithin(to, from)) return bad(res, 400, 'لا يمكن نقل مجلد إلى داخله');
    if (!await folders.findOne({ _id: from })) return bad(res, 404, 'المجلد غير موجود');
    if (await folders.findOne({ _id: to })) return bad(res, 409, 'يوجد مجلد بهذا الاسم');
    const swap = (p: string): string => to + p.slice(from.length);
    const inside = { $regex: `^${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|$)` };

    await ensureFolder(to);
    for (const f of await folders.find({ _id: inside }).toArray()) {
      await folders.deleteOne({ _id: f._id });
      await folders.updateOne({ _id: swap(f._id) }, { $setOnInsert: { createdAt: f.createdAt } }, { upsert: true });
    }
    for (const file of await files.find({ folder: inside }).toArray()) {
      const folder = swap(file.folder);
      const key = file.driver === 'disk' ? opts.drivers.disk.keyFor(file._id, folder, file.name) : file.key;
      await driverOf(file).move(file.key, key);
      await files.updateOne({ _id: file._id }, { $set: { folder, key } });
    }
    res.json({ path: to });
  });

  /** Admin: delete an empty folder. */
  foldersRouter.delete('/', admin, async (req, res) => {
    const path = cleanFolder(req.query.path);
    if (!path) return bad(res, 400, 'اسم المجلد غير صالح');
    const inside = { $regex: `^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/` };
    if (await files.countDocuments({ $or: [{ folder: path }, { folder: inside }] }) || await folders.countDocuments({ _id: inside })) {
      return bad(res, 409, 'المجلد ليس فارغاً؛ انقل محتواه أو احذفه أولاً');
    }
    await folders.deleteOne({ _id: path });
    res.json({ ok: true });
  });

  return { files: filesRouter, folders: foldersRouter };
}

/** Characters an uploaded file's own name may contain that are not allowed in a stored name. */
const BAD_CHARS = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;
