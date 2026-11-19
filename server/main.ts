/**
 * The production server: the website, the dashboard and its API, in one Node.js process.
 *
 *   npm run build:server   once, and after every code update
 *   npm run set-password   once, to choose the dashboard password
 *   npm start              runs the server (see docs/deploy-windows-server.md)
 *
 * Composition root: the only place that knows every part of the server.
 */
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectPaths } from '../tooling/paths';
import { loadConfig } from './config';
import { ContentFiles } from './content/ContentFiles';
import { CONTENT_API, createContentHandler } from './content/contentHandler';
import { SessionAuth } from './http/auth';
import { createStaticHandler } from './http/staticFiles';
import { SiteBuilder } from './publish/SiteBuilder';

// Bundled to server-dist/main.mjs, one folder below the project root.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paths = projectPaths(root);
const config = loadConfig(root);

const builder = new SiteBuilder(root, paths.releases);
const content = createContentHandler({
  files: new ContentFiles({ data: paths.data, public: paths.public, history: paths.history }),
  publisher: builder,
  gate: new SessionAuth(config),
});
const serveStatic = createStaticHandler(() => {
  const release = builder.currentRoot();
  return release ? [release, paths.public] : [];
});

const server = createServer((req, res) => {
  const path = req.url ?? '/';
  if (path === CONTENT_API || path.startsWith(`${CONTENT_API}/`) || path.startsWith(`${CONTENT_API}?`)) {
    void content(req, res);
    return;
  }
  if (!builder.currentRoot()) {
    res.statusCode = 503;
    res.setHeader('Retry-After', '30');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta http-equiv="refresh" content="15">'
      + '<body style="font-family:sans-serif;text-align:center;padding:4rem"><h1>يُجهَّز الموقع…</h1>'
      + '<p>ستفتح الصفحة تلقائياً بعد لحظات.</p></body></html>');
    return;
  }
  if (path.startsWith('/dashboard')) {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  serveStatic(req, res);
});

server.listen(config.port, config.host, () => {
  console.log(`Magic Look: http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}/`);
  console.log(`Dashboard:  http://localhost:${config.port}/dashboard.html`);
  if (!config.passwordHash) console.warn('No dashboard password yet: run "npm run set-password".');
  builder.ensureRelease();
});
