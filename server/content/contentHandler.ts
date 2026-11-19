/**
 * The dashboard's API, shared by the production server and the dev server.
 *
 *   GET    /__content/session            am I signed in?
 *   POST   /__content/session            sign in  { password }
 *   DELETE /__content/session            sign out
 *   GET    /__content/status             is the site showing the latest save?
 *   GET    /__content/documents          every JSON file in public/data
 *   GET    /__content/documents/<path>   one file
 *   PUT    /__content/documents/<path>   replace one file (the previous version is kept)
 *   GET    /__content/media              every photo and film in public/
 *   POST   /__content/media?name=<file>  upload a photo or film (raw bytes)
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { CSRF_HEADER, type Gate } from '../http/auth';
import { HttpError, readJson, sendError, sendJson } from '../http/respond';
import type { Publisher } from '../publish/Publisher';
import type { ContentFiles } from './ContentFiles';

export const CONTENT_API = '/__content';
const MAX_DOCUMENT = 5 * 1024 * 1024;

const LOGIN_MESSAGES = {
  wrong: [401, 'كلمة المرور غير صحيحة'],
  locked: [429, 'محاولات كثيرة. حاول بعد ربع ساعة'],
  'not-configured': [503, 'لم تُضبط كلمة مرور بعد. شغّل على الخادم: npm run set-password'],
} as const;

export interface ContentApi {
  readonly files: ContentFiles;
  readonly publisher: Publisher;
  readonly gate: Gate;
}

/** Handles one request whose path starts with /__content. */
export function createContentHandler({ files, publisher, gate }: ContentApi) {
  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname.slice(CONTENT_API.length);
    const method = req.method ?? 'GET';

    // Anything that changes state must come from the dashboard itself.
    if (method !== 'GET' && req.headers[CSRF_HEADER] !== '1') throw new HttpError(403, 'طلب مرفوض');

    if (path === '/session') {
      if (method === 'GET') return sendJson(res, 200, { authenticated: gate.isAuthenticated(req), required: gate.required });
      if (method === 'POST') {
        const body = await readJson(req, 10_000) as { password?: unknown };
        const result = gate.login(req, res, typeof body.password === 'string' ? body.password : '');
        if (result === 'ok') return sendJson(res, 200, { authenticated: true });
        const [status, message] = LOGIN_MESSAGES[result];
        throw new HttpError(status, message);
      }
      if (method === 'DELETE') {
        gate.logout(res);
        return sendJson(res, 200, { authenticated: false });
      }
    }

    if (!gate.isAuthenticated(req)) throw new HttpError(401, 'انتهت الجلسة، سجّل الدخول من جديد');

    if (path === '/status' && method === 'GET') return sendJson(res, 200, publisher.status());
    if (path === '/media' && method === 'GET') return sendJson(res, 200, files.listMedia());
    if (path === '/media' && method === 'POST') {
      return sendJson(res, 201, { path: await files.saveUpload(req, url.searchParams.get('name') ?? '') });
    }
    if (path === '/documents' && method === 'GET') return sendJson(res, 200, files.listDocuments());
    if (path.startsWith('/documents/')) {
      const document = decodeURIComponent(path.slice('/documents/'.length));
      if (method === 'GET') return sendJson(res, 200, files.readDocument(document));
      if (method === 'PUT') {
        files.writeDocument(document, await readJson(req, MAX_DOCUMENT));
        publisher.afterSave(document);
        return sendJson(res, 200, { ok: true });
      }
    }
    throw new HttpError(404, 'طلب غير معروف');
  }

  return (req: IncomingMessage, res: ServerResponse): Promise<void> =>
    route(req, res).catch((error: unknown) => sendError(res, error));
}
