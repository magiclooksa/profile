import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JsonProfileRepository, type JsonFetcher } from '../src/infrastructure/JsonProfileRepository';
import { cataloguesDecoder } from '../src/infrastructure/schemas';
import { jsonLd, seoDecoder, serviceGraph } from './seo';
import { loadServicePages, servicePageHtml } from './servicePages';

const ROOT = join(import.meta.dirname, '..');
const readJson = (file: string): unknown => JSON.parse(readFileSync(join(ROOT, 'public/data', file), 'utf8'));
const pages = loadServicePages(ROOT);
const catalogues = cataloguesDecoder(readJson('catalogues.json'), 'catalogues.json');
const ctx = { pages, catalogues, closingLine: 'تواصل معنا' };

describe('service pages data', () => {
  it('has unique slugs, existing photos and known catalogues', () => {
    expect(new Set(pages.map((p) => p.slug)).size).toBe(pages.length);
    for (const p of pages) {
      for (const img of p.images) expect(existsSync(join(ROOT, 'public', img.src)), img.src).toBe(true);
      for (const href of p.catalogues) expect(catalogues.some((c) => c.href === href), href).toBe(true);
    }
  });

  it('keeps titles and descriptions to what search results show', () => {
    for (const p of pages) {
      expect([...p.title].length, p.slug).toBeLessThanOrEqual(70);
      expect([...p.description].length, p.slug).toBeLessThanOrEqual(200);
    }
  });
});

describe('service page HTML', () => {
  const page = pages[0]!;
  const html = servicePageHtml(page, ctx);

  it('carries the whole page in plain HTML, with one H1', () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain(page.heading);
    for (const o of page.offers) expect(html).toContain(o);
    for (const q of page.faq) expect(html).toContain(q.question);
  });

  it('links home, to its catalogues and to the other services', () => {
    expect(html).toContain('href="../index.html"');
    for (const href of page.catalogues) expect(html).toContain(`href="../${href}"`);
    for (const other of pages.slice(1)) expect(html).toContain(`href="${other.slug}.html"`);
  });

  it('escapes text from the data', () => {
    expect(servicePageHtml({ ...page, lead: '<script>x</script>' }, ctx)).not.toContain('<script>x');
  });
});

describe('service schema.org data', () => {
  it('describes the service, its questions and a breadcrumb', async () => {
    const fromDisk: JsonFetcher = async (file) => readJson(file);
    const profile = await new JsonProfileRepository(fromDisk).load();
    const seo = seoDecoder(readJson('seo.json'), 'seo.json');
    const service = profile.servicePages[0]!;
    const script = jsonLd(serviceGraph(seo, profile, service, {
      title: service.title, description: service.description, url: `${seo.siteUrl}services/${service.slug}.html`,
      image: '', alt: '', keywords: [],
    }));
    expect(script).toContain('"@type":"Service"');
    expect(script).toContain('"@type":"FAQPage"');
    expect(script).toContain('"@type":"BreadcrumbList"');
  });
});
