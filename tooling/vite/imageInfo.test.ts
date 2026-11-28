import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { imageInfo, twitterCard } from './imageInfo';

const PUBLIC = join(import.meta.dirname, '../../public');

describe('imageInfo', () => {
  it('reads a PNG', () => {
    expect(imageInfo(join(PUBLIC, 'assets/avatar.png'))).toEqual({ type: 'image/png', width: 400, height: 400 });
  });

  it('reads a JPEG', () => {
    const jpg = readdirSync(join(PUBLIC, 'og')).find((f) => f.endsWith('.jpg'));
    const info = imageInfo(join(PUBLIC, 'og', jpg ?? ''));
    expect(info?.type).toBe('image/jpeg');
    expect(info?.width).toBeGreaterThan(0);
    expect(info?.height).toBeGreaterThan(0);
  });

  it('reads lossy, lossless and extended WebP', () => {
    const fixture = (name: string) => imageInfo(join(import.meta.dirname, 'fixtures', name));
    expect(fixture('lossy.webp')).toEqual({ type: 'image/webp', width: 321, height: 123 });
    expect(fixture('lossless.webp')).toEqual({ type: 'image/webp', width: 77, height: 55 });
    expect(fixture('alpha.webp')).toEqual({ type: 'image/webp', width: 640, height: 360 });
  });

  it('gives null for missing or other files', () => {
    expect(imageInfo(join(PUBLIC, 'nope.png'))).toBeNull();
    expect(imageInfo(join(PUBLIC, 'data/faq.json'))).toBeNull();
  });

  it('picks the small X card for square images', () => {
    expect(twitterCard({ type: 'image/png', width: 400, height: 400 })).toBe('summary');
    expect(twitterCard({ type: 'image/jpeg', width: 1200, height: 630 })).toBe('summary_large_image');
    expect(twitterCard(null)).toBe('summary_large_image');
  });
});
