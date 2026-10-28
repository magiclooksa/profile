import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import type { Db } from 'mongodb';
import { issueToken, rateLimit, requireAdmin, safeEqual } from './auth';
import type { Config } from './config';
import { contentRoutes } from './routes/content';
import { fileRoutes } from './routes/files';
import { messageRoutes } from './routes/messages';

/** Lets the listed sites (e.g. the GitHub Pages copy) call the API from the browser. */
const cors = (origins: string[]): RequestHandler => (req, res, next) => {
  const origin = req.get('origin');
  if (origin && origins.includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    });
  }
  if (req.method === 'OPTIONS') return void res.status(204).end();
  next();
};

export function createApp(db: Db, config: Config): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const admin = requireAdmin(config.sessionSecret);
  const api = express.Router();
  api.use(cors(config.corsOrigins));
  api.use(express.json({ limit: '5mb' }));

  api.get('/health', async (_req, res) => {
    await db.command({ ping: 1 });
    res.json({ ok: true });
  });

  api.post('/auth/login', rateLimit(10, 15 * 60 * 1000), (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!password || !safeEqual(password, config.adminPassword)) {
      return void res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
    }
    res.json(issueToken(config.sessionSecret));
  });
  api.get('/auth/me', admin, (_req, res) => res.json({ ok: true }));

  api.use('/content', contentRoutes(db, admin));
  api.use('/files', fileRoutes(db, admin, config));
  api.use('/messages', messageRoutes(db, admin));
  api.use((_req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = typeof error?.status === 'number' ? error.status : error?.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
    if (status >= 500) console.error(error);
    const message = status === 413 ? `الملف أكبر من ${config.maxUploadMb} ميغابايت`
      : status === 400 ? 'الطلب غير صحيح' : 'حدث خطأ في الخادم';
    res.status(status).json({ error: message });
  };
  api.use(onError);
  app.use('/api', api);

  // The built website (npm run build), so one server hosts both the site and the API.
  const dist = resolve(import.meta.dirname, '../dist');
  if (existsSync(dist)) app.use(express.static(dist, { extensions: ['html'] }));

  return app;
}
