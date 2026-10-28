import { Router, type Request, type RequestHandler } from 'express';
import { GridFSBucket, ObjectId, type Db } from 'mongodb';
import multer, { type StorageEngine } from 'multer';

/** Types people may upload. SVG and HTML are refused: they can carry scripts. */
const ALLOWED = /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm|quicktime)|application\/pdf)$/;

export interface FileMeta { contentType: string; originalName: string; sourcePath?: string }

/** Streams each upload straight into GridFS instead of holding it in memory. */
function gridStorage(bucket: GridFSBucket): StorageEngine {
  return {
    _handleFile(_req, file, cb) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const upload = bucket.openUploadStream(originalName, {
        metadata: { contentType: file.mimetype, originalName } satisfies FileMeta,
      });
      file.stream.pipe(upload)
        .on('error', (error) => cb(error))
        .on('finish', () => cb(null, { filename: originalName, size: upload.length, path: upload.id.toString() }));
    },
    _removeFile(_req, file, cb) {
      bucket.delete(new ObjectId(file.path)).then(() => cb(null), cb);
    },
  };
}

/** Address of a stored file. The name at the end keeps the extension, so the site knows videos. */
export const fileUrl = (publicUrl: string, id: string, name: string): string =>
  `${publicUrl ? `${publicUrl}/` : ''}api/files/${id}/${encodeURIComponent(name.replace(/[\\/]/g, '-'))}`;

export function fileRoutes(db: Db, admin: RequestHandler, opts: { publicUrl: string; maxUploadMb: number }): Router {
  const bucket = new GridFSBucket(db, { bucketName: 'media' });
  const files = db.collection('media.files');
  const router = Router();

  const upload = multer({
    storage: gridStorage(bucket),
    limits: { fileSize: opts.maxUploadMb * 1024 * 1024, files: 20 },
    fileFilter: (_req, file, cb) => cb(null, ALLOWED.test(file.mimetype)),
  });

  const describe = (f: { _id: ObjectId; filename: string; length: number; uploadDate: Date; metadata?: FileMeta }) => ({
    id: f._id.toString(),
    name: f.filename,
    size: f.length,
    contentType: f.metadata?.contentType ?? 'application/octet-stream',
    uploadedAt: f.uploadDate,
    url: fileUrl(opts.publicUrl, f._id.toString(), f.filename),
  });

  /** Admin: upload one or more files in the "files" field. */
  router.post('/', admin, upload.array('files'), (req: Request, res) => {
    const uploaded = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!uploaded.length) return void res.status(400).json({ error: 'لم يُرفع أي ملف (الأنواع المقبولة: صور، فيديو MP4/WebM/MOV، PDF)' });
    res.status(201).json(uploaded.map((f) => ({
      id: f.path, name: f.filename, size: f.size, contentType: f.mimetype,
      url: fileUrl(opts.publicUrl, f.path, f.filename),
    })));
  });

  /** Admin: the media library, newest first. */
  router.get('/', admin, async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter = q ? { filename: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {};
    const list = await files.find(filter).sort({ uploadDate: -1 }).limit(500).toArray();
    res.json(list.map((f) => describe(f as never)));
  });

  router.delete('/:id', admin, async (req, res) => {
    if (!ObjectId.isValid(String(req.params.id))) return void res.status(400).json({ error: 'رقم الملف غير صحيح' });
    try {
      await bucket.delete(new ObjectId(String(req.params.id)));
      res.json({ ok: true });
    } catch {
      res.status(404).json({ error: 'الملف غير موجود' });
    }
  });

  /** Public: serves a file, with byte ranges so videos can seek and play on iPhone. */
  const serve: RequestHandler = async (req, res) => {
    const id = String(req.params.id);
    if (!ObjectId.isValid(id)) return void res.status(404).end();
    const file = await files.findOne({ _id: new ObjectId(id) });
    if (!file) return void res.status(404).end();
    const size = file.length as number;
    const meta = (file.metadata ?? {}) as Partial<FileMeta>;

    res.set({
      'Content-Type': meta.contentType ?? 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      ETag: `"${id}"`,
    });
    if (req.get('if-none-match') === `"${id}"`) return void res.status(304).end();

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

    bucket.openDownloadStream(file._id, { start, end: end + 1 })
      .on('error', () => res.destroy())
      .pipe(res);
  };
  router.get('/:id', serve);
  router.get('/:id/:name', serve);

  return router;
}
