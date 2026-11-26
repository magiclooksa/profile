import { describe, expect, it } from 'vitest';
import { gtagSnippet, measurementId } from './analytics';

describe('Google Analytics', () => {
  it('is off while the ID is the placeholder or invalid', () => {
    expect(measurementId('G-XXXXXXXXXX')).toBeNull();
    expect(measurementId('')).toBeNull();
    expect(measurementId('UA-12345-1')).toBeNull();
    expect(measurementId('G-1"><script>')).toBeNull();
  });

  it('accepts a GA4 ID', () => {
    expect(measurementId(' g-ab12cd34ef ')).toBe('G-AB12CD34EF');
  });

  it('writes the gtag.js snippet for the ID', () => {
    const html = gtagSnippet('G-AB12CD34EF');
    expect(html).toContain('https://www.googletagmanager.com/gtag/js?id=G-AB12CD34EF');
    expect(html).toContain("gtag('config','G-AB12CD34EF')");
  });
});
