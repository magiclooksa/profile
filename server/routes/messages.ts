import { Router, type RequestHandler } from 'express';
import { ObjectId, type Db } from 'mongodb';
import { rateLimit } from '../auth';

export interface MessageDoc {
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  message: string;
  read: boolean;
  createdAt: Date;
}

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/\s+\n/g, '\n');
  return s ? s.slice(0, max) : null;
};

/** Checks a message from the contact form. Returns an error in Arabic, or the clean message. */
export function parseMessage(body: unknown): { error: string } | { message: Omit<MessageDoc, 'read' | 'createdAt'> } {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const name = text(b.name, 120);
  const phone = text(b.phone, 30);
  const email = text(b.email, 200);
  const message = text(b.message, 4000);
  if (!name) return { error: 'اكتب الاسم' };
  if (!phone || !/^[+\d\s()-]{7,30}$/.test(phone)) return { error: 'اكتب رقم جوال صحيح' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'البريد الإلكتروني غير صحيح' };
  if (!message) return { error: 'اكتب رسالتك' };
  return { message: { name, phone, email, city: text(b.city, 80), message } };
}

export function messageRoutes(db: Db, admin: RequestHandler): Router {
  const messages = db.collection<MessageDoc>('messages');
  const router = Router();

  /** Public: the contact form. "website" is a hidden field that only bots fill in. */
  router.post('/', rateLimit(5, 10 * 60 * 1000), async (req, res) => {
    if (req.body?.website) return void res.status(201).json({ ok: true });
    const parsed = parseMessage(req.body);
    if ('error' in parsed) return void res.status(400).json({ error: parsed.error });
    await messages.insertOne({ ...parsed.message, read: false, createdAt: new Date() });
    res.status(201).json({ ok: true });
  });

  router.get('/', admin, async (_req, res) => {
    const list = await messages.find().sort({ createdAt: -1 }).limit(500).toArray();
    res.json(list.map(({ _id, ...m }) => ({ id: _id.toString(), ...m })));
  });

  router.patch('/:id', admin, async (req, res) => {
    if (!ObjectId.isValid(String(req.params.id))) return void res.status(400).json({ error: 'رقم الرسالة غير صحيح' });
    await messages.updateOne({ _id: new ObjectId(String(req.params.id)) }, { $set: { read: req.body?.read !== false } });
    res.json({ ok: true });
  });

  router.delete('/:id', admin, async (req, res) => {
    if (!ObjectId.isValid(String(req.params.id))) return void res.status(400).json({ error: 'رقم الرسالة غير صحيح' });
    await messages.deleteOne({ _id: new ObjectId(String(req.params.id)) });
    res.json({ ok: true });
  });

  return router;
}
