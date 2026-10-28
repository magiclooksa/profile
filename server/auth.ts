import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const TOKEN_DAYS = 7;

const sign = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url');

/** Compares two strings in constant time, whatever their lengths. */
export const safeEqual = (a: string, b: string): boolean =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

/** A signed token "<expiry>.<signature>" that proves the admin logged in. */
export function issueToken(secret: string, now = Date.now()): { token: string; expiresAt: number } {
  const expiresAt = now + TOKEN_DAYS * 24 * 60 * 60 * 1000;
  const payload = `admin.${expiresAt}`;
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt };
}

export function verifyToken(token: string, secret: string, now = Date.now()): boolean {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'admin') return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(parts[2] ?? '', sign(payload, secret))) return false;
  const expiresAt = Number(parts[1]);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

/** Express guard: lets the request through only with a valid "Authorization: Bearer <token>". */
export const requireAdmin = (secret: string) => (req: Request, res: Response, next: NextFunction): void => {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token && verifyToken(token, secret)) return next();
  res.status(401).json({ error: 'يلزم تسجيل الدخول' });
};

/** Small in-memory limiter: at most `max` hits per key within `windowMs`. */
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      res.status(429).json({ error: 'محاولات كثيرة، حاول بعد قليل' });
      return;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 10_000) hits.clear();
    next();
  };
}
