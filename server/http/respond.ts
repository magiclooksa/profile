/** Small HTTP helpers shared by the server and the dev server's middleware. */
import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

export function sendError(res: ServerResponse, error: unknown): void {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : String(error);
  if (status === 500) console.error(error);
  sendJson(res, status, { error: status === 500 ? `خطأ في الخادم: ${message}` : message });
}

/** Reads a text body, refusing anything larger than `limit` bytes. */
export function readText(req: IncomingMessage, limit: number): Promise<string> {
  return new Promise((done, fail) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        fail(new HttpError(413, 'المحتوى أكبر من المسموح'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => done(Buffer.concat(chunks).toString('utf8')));
    req.on('error', fail);
  });
}

export async function readJson(req: IncomingMessage, limit: number): Promise<unknown> {
  const text = await readText(req, limit);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, 'المحتوى ليس JSON صحيحاً');
  }
}
