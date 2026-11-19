/**
 * Dashboard sign-in: one password, stored only as a scrypt hash, and a signed session cookie.
 * The cookie is HttpOnly and SameSite=Strict, and every request that changes something must also
 * carry the X-Dashboard header, which other sites cannot send (CSRF).
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const COOKIE = 'ml_session';
const SESSION_SECONDS = 12 * 60 * 60;
const MAX_ATTEMPTS = 10;
const LOCK_MS = 15 * 60 * 1000;
export const CSRF_HEADER = 'x-dashboard';

// ─── passwords ──────────────────────────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${scryptSync(password, salt, 64).toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

// ─── sessions ───────────────────────────────────────────────────────────────────────────────────

const sign = (secret: string, payload: string): string => createHmac('sha256', secret).update(payload).digest('base64url');

export function createToken(secret: string, now: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_SECONDS * 1000 })).toString('base64url');
  return `${payload}.${sign(secret, payload)}`;
}

export function verifyToken(secret: string, token: string, now: number): boolean {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(secret, payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof exp === 'number' && exp > now;
  } catch {
    return false;
  }
}

function readCookie(req: IncomingMessage, name: string): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

// ─── the gate ───────────────────────────────────────────────────────────────────────────────────

export type LoginResult = 'ok' | 'wrong' | 'locked' | 'not-configured';

export interface AuthSettings {
  readonly passwordHash: string | null;
  readonly sessionSecret: string;
  /** Mark the cookie Secure: the site is served over HTTPS. */
  readonly secureCookies: boolean;
  /** Read the visitor's address from X-Forwarded-For (behind IIS or another proxy). */
  readonly trustProxy: boolean;
}

/** Who may use the dashboard. `null` in development, where everyone on the machine may. */
export interface Gate {
  readonly required: boolean;
  isAuthenticated(req: IncomingMessage): boolean;
  login(req: IncomingMessage, res: ServerResponse, password: string): LoginResult;
  logout(res: ServerResponse): void;
}

export class SessionAuth implements Gate {
  readonly required = true;
  private readonly attempts = new Map<string, { count: number; until: number }>();

  constructor(private readonly settings: AuthSettings, private readonly now: () => number = Date.now) {}

  isAuthenticated(req: IncomingMessage): boolean {
    const token = readCookie(req, COOKIE);
    return token !== null && verifyToken(this.settings.sessionSecret, token, this.now());
  }

  login(req: IncomingMessage, res: ServerResponse, password: string): LoginResult {
    if (!this.settings.passwordHash) return 'not-configured';
    const ip = this.clientIp(req);
    const record = this.attempts.get(ip);
    if (record && record.count >= MAX_ATTEMPTS && record.until > this.now()) return 'locked';

    if (!verifyPassword(password, this.settings.passwordHash)) {
      const fresh = !record || record.until <= this.now();
      this.attempts.set(ip, { count: fresh ? 1 : record.count + 1, until: this.now() + LOCK_MS });
      return 'wrong';
    }
    this.attempts.delete(ip);
    this.setCookie(res, createToken(this.settings.sessionSecret, this.now()), SESSION_SECONDS);
    return 'ok';
  }

  logout(res: ServerResponse): void {
    this.setCookie(res, '', 0);
  }

  private clientIp(req: IncomingMessage): string {
    const forwarded = this.settings.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim() : '';
    return forwarded || req.socket.remoteAddress || 'unknown';
  }

  private setCookie(res: ServerResponse, value: string, maxAge: number): void {
    const secure = this.settings.secureCookies ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`);
  }
}

/** Development: the dev server only listens on this machine, so no sign-in. */
export const openGate: Gate = {
  required: false,
  isAuthenticated: () => true,
  login: () => 'ok',
  logout: () => undefined,
};
