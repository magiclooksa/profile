import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword, SessionAuth } from '../http/auth';
import type { Publisher } from '../publish/Publisher';
import { ContentFiles } from './ContentFiles';
import { createContentHandler } from './contentHandler';

const PASSWORD = 'a long dashboard password';
const root = mkdtempSync(join(tmpdir(), 'ml-api-'));
const saved: string[] = [];
const publisher: Publisher = {
  afterSave: (path) => { saved.push(path); },
  status: () => ({ state: 'building', updatedAt: null, message: null }),
};
let server: Server;
let base = '';

beforeAll(async () => {
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(join(root, 'data', 'faq.json'), '{"intro":"x"}');
  const handle = createContentHandler({
    files: new ContentFiles({ data: join(root, 'data'), public: root, history: join(root, 'history') }),
    publisher,
    gate: new SessionAuth({ passwordHash: hashPassword(PASSWORD), sessionSecret: 's', secureCookies: false, trustProxy: false }),
  });
  server = createServer((req, res) => void handle(req, res));
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/__content`;
});
afterAll(() => new Promise<void>((done) => server.close(() => done())));

const call = (path: string, init: RequestInit = {}) => fetch(`${base}${path}`, init);
const write = (cookie: string, extra: Record<string, string> = {}) => ({ 'X-Dashboard': '1', cookie, ...extra });

async function signIn(): Promise<string> {
  const res = await call('/session', {
    method: 'POST', headers: write('', { 'Content-Type': 'application/json' }), body: JSON.stringify({ password: PASSWORD }),
  });
  expect(res.status).toBe(200);
  return (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

describe('content API', () => {
  it('keeps everything behind sign-in', async () => {
    expect((await call('/documents')).status).toBe(401);
    expect(await (await call('/session')).json()).toEqual({ authenticated: false, required: true });
  });

  it('refuses a wrong password', async () => {
    const res = await call('/session', { method: 'POST', headers: write(''), body: JSON.stringify({ password: 'nope' }) });
    expect(res.status).toBe(401);
  });

  it('refuses changes without the dashboard header (CSRF)', async () => {
    const cookie = await signIn();
    const res = await call('/documents/faq.json', { method: 'PUT', headers: { cookie }, body: '{}' });
    expect(res.status).toBe(403);
  });

  it('reads and saves documents once signed in, then publishes', async () => {
    const cookie = await signIn();
    expect(await (await call('/documents', { headers: { cookie } })).json()).toEqual(['faq.json']);
    const put = await call('/documents/faq.json', { method: 'PUT', headers: write(cookie), body: JSON.stringify({ intro: 'y' }) });
    expect(put.status).toBe(200);
    expect(await (await call('/documents/faq.json', { headers: { cookie } })).json()).toEqual({ intro: 'y' });
    expect(saved).toContain('faq.json');
    expect(await (await call('/status', { headers: { cookie } })).json()).toMatchObject({ state: 'building' });
  });

  it('refuses paths outside the data folder', async () => {
    const cookie = await signIn();
    expect((await call('/documents/..%2F..%2Fsecret.json', { headers: { cookie } })).status).toBe(400);
  });

  it('stores uploads under images/uploads and refuses other file types', async () => {
    const cookie = await signIn();
    const res = await call('/media?name=Sofa.JPG', { method: 'POST', headers: write(cookie), body: new Uint8Array([1, 2, 3]) });
    expect(res.status).toBe(201);
    const { path } = await res.json() as { path: string };
    expect(path).toMatch(/^images\/uploads\/\d{4}-\d{2}\/sofa\.jpg$/);
    expect(existsSync(join(root, path))).toBe(true);
    const bad = await call('/media?name=run.exe', { method: 'POST', headers: write(cookie), body: 'x' });
    expect(bad.status).toBe(400);
  });

  it('signs out', async () => {
    const res = await call('/session', { method: 'DELETE', headers: write(await signIn()) });
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
