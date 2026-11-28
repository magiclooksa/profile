/**
 * Serves the built site: each request is looked up in the current release, then in public/
 * (photos, films and data, which are not copied into releases). Supports Range requests,
 * which browsers need to play and seek videos.
 */
import { createReadStream, existsSync, statSync, type Stats } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.pdf': 'application/pdf',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

/** The file a URL path names inside `root`, or null when it escapes the folder or does not exist. */
export function resolveStatic(root: string, urlPath: string): string | null {
  let path: string;
  try {
    path = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (path.includes('\0')) return null;
  let file = resolve(root, `.${path}`);
  if (file !== root && !file.startsWith(root + sep)) return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

function cacheControl(file: string, urlPath: string): string {
  if (urlPath.startsWith('/assets/') && /-[A-Za-z0-9_-]{8}\.(js|css)$/.test(file)) return 'public, max-age=31536000, immutable';
  if (file.endsWith('.html') || urlPath.startsWith('/data/')) return 'no-cache';
  return 'public, max-age=86400';
}

function sendFile(req: IncomingMessage, res: ServerResponse, file: string, stats: Stats, urlPath: string): void {
  res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', cacheControl(file, urlPath));
  res.setHeader('Last-Modified', stats.mtime.toUTCString());
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const since = req.headers['if-modified-since'];
  if (since && Math.floor(stats.mtimeMs / 1000) <= Math.floor(Date.parse(since) / 1000)) {
    res.statusCode = 304;
    res.end();
    return;
  }

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range && (range[1] || range[2])) {
    const size = stats.size;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${size}`);
      res.end();
      return;
    }
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Length', stats.size);
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(file).pipe(res);
}

/** Serves from the first of `roots()` that has the file. Answers 404 when none does. */
export function createStaticHandler(roots: () => readonly string[]) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.end();
      return;
    }
    const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
    for (const root of roots()) {
      const file = resolveStatic(root, urlPath);
      if (file) return sendFile(req, res, file, statSync(file), urlPath);
    }
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // The site's own 404 page (built from pages/404.html), with the 404 status kept.
    for (const root of roots()) {
      const page = resolveStatic(root, '/404.html');
      if (page) {
        if (req.method === 'HEAD') { res.end(); return; }
        createReadStream(page).pipe(res);
        return;
      }
    }
    res.end('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>غير موجود</title>'
      + '<body style="font-family:sans-serif;text-align:center;padding:4rem"><h1>الصفحة غير موجودة</h1>'
      + '<p><a href="/">العودة إلى الرئيسية</a></p></body></html>');
  };
}
