import { Router, type RequestHandler } from 'express';
import { ObjectId, type Db } from 'mongodb';
import { DataError } from '../../src/infrastructure/decoders';
import { SECTIONS, findSection } from '../sections';

/** One document per section: the same JSON the site used to read from public/data. */
export interface ContentDoc { _id: string; data: unknown; updatedAt: Date }
/** Earlier versions, kept so a mistaken save can be undone from the dashboard. */
export interface HistoryDoc { key: string; data: unknown; savedAt: Date }

const HISTORY_LIMIT = 30;

export function contentRoutes(db: Db, admin: RequestHandler): Router {
  const content = db.collection<ContentDoc>('content');
  const history = db.collection<HistoryDoc>('content_history');
  const router = Router();

  /** Public: every section in one response, so the site makes a single request. */
  router.get('/', async (_req, res) => {
    const docs = await content.find().toArray();
    res.set('Cache-Control', 'no-cache');
    res.json(Object.fromEntries(docs.map((d) => [d._id, d.data])));
  });

  /** Admin: the list of sections, with when each was last saved. */
  router.get('/sections', admin, async (_req, res) => {
    const docs = await content.find({}, { projection: { data: 0 } }).toArray();
    const saved = new Map(docs.map((d) => [d._id, d.updatedAt]));
    res.json(SECTIONS.map((s) => ({ key: s.key, label: s.label, updatedAt: saved.get(s.key) ?? null })));
  });

  router.get('/:key', async (req, res) => {
    const doc = await content.findOne({ _id: String(req.params.key) });
    if (!doc) return void res.status(404).json({ error: 'القسم غير موجود' });
    res.set('Cache-Control', 'no-cache');
    res.json(doc.data);
  });

  /** Admin: replaces a section after checking it with the site's own rules. */
  router.put('/:key', admin, async (req, res) => {
    const section = findSection(String(req.params.key));
    if (!section) return void res.status(404).json({ error: 'القسم غير معروف' });
    try {
      section.decoder(req.body, `${section.key}.json`);
    } catch (error) {
      if (error instanceof DataError) return void res.status(422).json({ error: error.message, path: error.path });
      throw error;
    }
    const previous = await content.findOne({ _id: section.key });
    if (previous) await history.insertOne({ key: section.key, data: previous.data, savedAt: previous.updatedAt });
    const updatedAt = new Date();
    await content.replaceOne({ _id: section.key }, { data: req.body, updatedAt }, { upsert: true });
    await trimHistory(section.key);
    res.json({ ok: true, updatedAt });
  });

  router.get('/:key/history', admin, async (req, res) => {
    const versions = await history.find({ key: String(req.params.key) }, { projection: { data: 0 } })
      .sort({ savedAt: -1 }).limit(HISTORY_LIMIT).toArray();
    res.json(versions.map((v) => ({ id: v._id.toString(), savedAt: v.savedAt })));
  });

  /** Admin: puts an earlier version back (the current one goes into history first). */
  router.post('/:key/history/:id/restore', admin, async (req, res) => {
    if (!ObjectId.isValid(String(req.params.id))) return void res.status(400).json({ error: 'رقم النسخة غير صحيح' });
    const version = await history.findOne({ _id: new ObjectId(String(req.params.id)), key: String(req.params.key) });
    if (!version) return void res.status(404).json({ error: 'النسخة غير موجودة' });
    const current = await content.findOne({ _id: String(req.params.key) });
    if (current) await history.insertOne({ key: String(req.params.key), data: current.data, savedAt: current.updatedAt });
    const updatedAt = new Date();
    await content.replaceOne({ _id: String(req.params.key) }, { data: version.data, updatedAt }, { upsert: true });
    await trimHistory(String(req.params.key));
    res.json({ ok: true, updatedAt, data: version.data });
  });

  async function trimHistory(key: string): Promise<void> {
    const old = await history.find({ key }, { projection: { _id: 1 } }).sort({ savedAt: -1 }).skip(HISTORY_LIMIT).toArray();
    if (old.length) await history.deleteMany({ _id: { $in: old.map((d) => d._id) } });
  }

  return router;
}
