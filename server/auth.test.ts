import { describe, expect, it } from 'vitest';
import { issueToken, verifyToken } from './auth';

const SECRET = 'x'.repeat(40);

describe('admin tokens', () => {
  it('accepts a fresh token signed with the same secret', () => {
    expect(verifyToken(issueToken(SECRET).token, SECRET)).toBe(true);
  });

  it('rejects a token signed with another secret, tampered with, or expired', () => {
    const { token, expiresAt } = issueToken(SECRET);
    expect(verifyToken(token, 'y'.repeat(40))).toBe(false);
    expect(verifyToken(token.replace(/\.\d+\./, `.${expiresAt + 1}.`), SECRET)).toBe(false);
    expect(verifyToken(token, SECRET, expiresAt + 1)).toBe(false);
    expect(verifyToken('garbage', SECRET)).toBe(false);
  });
});
