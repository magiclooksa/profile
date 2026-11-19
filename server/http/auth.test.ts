import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createToken, hashPassword, SessionAuth, verifyPassword, verifyToken } from './auth';

const SECRET = 'test-secret';
const request = (cookie = '', ip = '10.0.0.1') =>
  ({ headers: { cookie }, socket: { remoteAddress: ip } }) as unknown as IncomingMessage;
const response = () => {
  const headers: Record<string, string> = {};
  return { headers, res: { setHeader: (k: string, v: string) => { headers[k] = v; } } as unknown as ServerResponse };
};

describe('passwords', () => {
  it('stores only a hash and checks it', () => {
    const stored = hashPassword('correct horse');
    expect(stored).not.toContain('correct horse');
    expect(verifyPassword('correct horse', stored)).toBe(true);
    expect(verifyPassword('wrong', stored)).toBe(false);
    expect(verifyPassword('x', 'garbage')).toBe(false);
  });
});

describe('session tokens', () => {
  it('accepts its own token until it expires', () => {
    const token = createToken(SECRET, 0);
    expect(verifyToken(SECRET, token, 1000)).toBe(true);
    expect(verifyToken(SECRET, token, 13 * 3600 * 1000)).toBe(false);
  });

  it('rejects tampered tokens and other secrets', () => {
    const token = createToken(SECRET, 0);
    const [payload] = token.split('.');
    const forged = `${Buffer.from(JSON.stringify({ exp: 9e15 })).toString('base64url')}.${token.split('.')[1]}`;
    expect(verifyToken(SECRET, forged, 0)).toBe(false);
    expect(verifyToken('other', token, 0)).toBe(false);
    expect(verifyToken(SECRET, `${payload}.`, 0)).toBe(false);
  });
});

describe('SessionAuth', () => {
  const settings = { passwordHash: hashPassword('the password'), sessionSecret: SECRET, secureCookies: true, trustProxy: false };

  it('signs in with the right password and sets a strict, HttpOnly cookie', () => {
    const auth = new SessionAuth(settings);
    const { headers, res } = response();
    expect(auth.login(request(), res, 'the password')).toBe('ok');
    const cookie = headers['Set-Cookie'] ?? '';
    expect(cookie).toMatch(/HttpOnly; SameSite=Strict; Max-Age=\d+; Secure$/);
    expect(auth.isAuthenticated(request(cookie.split(';')[0]))).toBe(true);
    expect(auth.isAuthenticated(request())).toBe(false);
  });

  it('locks an address out after too many wrong passwords', () => {
    const auth = new SessionAuth(settings);
    for (let i = 0; i < 10; i++) expect(auth.login(request(), response().res, 'nope')).toBe('wrong');
    expect(auth.login(request(), response().res, 'the password')).toBe('locked');
    expect(auth.login(request('', '10.0.0.2'), response().res, 'the password')).toBe('ok');
  });

  it('refuses to sign in before a password is set', () => {
    const auth = new SessionAuth({ ...settings, passwordHash: null });
    expect(auth.login(request(), response().res, 'anything')).toBe('not-configured');
  });
});
