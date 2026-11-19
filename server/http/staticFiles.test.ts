import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveStatic } from './staticFiles';

const PUBLIC = resolve(import.meta.dirname, '../../public');

describe('resolveStatic', () => {
  it('finds files and folder index pages', () => {
    expect(resolveStatic(PUBLIC, '/data/faq.json')).toBe(resolve(PUBLIC, 'data/faq.json'));
    expect(resolveStatic(PUBLIC, '/data/nope.json')).toBeNull();
  });

  it('never leaves the folder', () => {
    expect(resolveStatic(PUBLIC, '/../package.json')).toBeNull();
    expect(resolveStatic(PUBLIC, '/%2e%2e/package.json')).toBeNull();
    expect(resolveStatic(PUBLIC, '/..%5Cpackage.json')).toBeNull();
    expect(resolveStatic(PUBLIC, '/%E0%A4%A')).toBeNull();
  });
});
