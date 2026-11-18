import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JsonProfileRepository, type JsonFetcher } from '../src/infrastructure/JsonProfileRepository';
import { villaDecoder } from '../src/infrastructure/villaSchema';
import {
  catalogueGraph, cataloguePrerender, homeGraph, jsonLd, llmsTxt, robots, seoDecoder, sitemap,
  type PageMeta,
} from './seo';

const DATA_DIR = join(import.meta.dirname, '../public/data');
const readJson = (file: string): unknown => JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
const fromDisk: JsonFetcher = async (file) => readJson(file);
const seo = seoDecoder(readJson('seo.json'), 'seo.json');
const loadProfile = () => new JsonProfileRepository(fromDisk).load();

describe('seo.json', () => {
  it('is valid', () => {
    expect(seo.siteUrl).toMatch(/\/$/);
    expect(seo.keywords.length).toBeGreaterThan(0);
  });

  it('names the field of a mistake', () => {
    expect(() => seoDecoder({ ...(readJson('seo.json') as object), siteUrl: 'magiclook.sa' }, 'seo.json'))
      .toThrow('seo.json.siteUrl');
  });
});

describe('schema.org data', () => {
  it('describes the business and turns the FAQ into an FAQPage', async () => {
    const profile = await loadProfile();
    const graph = homeGraph(seo, profile);
    const page = (graph as Record<string, unknown>[]).find((n) => n['@type'] === 'FAQPage') as { mainEntity: unknown[] };
    expect(page.mainEntity).toHaveLength(profile.faq.items.length);
    const script = jsonLd(graph);
    expect(script).toContain('"@id":"https://mgiclook.com/#business"');
    // Unknown details are left out rather than written as null.
    expect(script).not.toContain('null');
  });

  it('names the CEO once a name is given', async () => {
    const profile = await loadProfile();
    const named = { ...profile, ceo: { ...profile.ceo, name: 'فلان الفلاني' } };
    expect(jsonLd(homeGraph(seo, named))).toContain('"jobTitle":"الرئيس التنفيذي"');
    expect(jsonLd(homeGraph(seo, { ...profile, ceo: { ...profile.ceo, name: null } }))).not.toContain('jobTitle');
  });

  it('cannot be closed early by text in the data', () => {
    expect(jsonLd([{ name: '</script><script>alert(1)</script>' }])).not.toMatch(/<\/script>.*<\/script>/);
  });

  it('lists every piece of a catalogue with a breadcrumb home', async () => {
    const profile = await loadProfile();
    const villa = villaDecoder(readJson('villa-wood.json'), 'villa-wood.json');
    const page: PageMeta = {
      title: 'فيلا الخشب', description: 'كتالوج', url: `${seo.siteUrl}villa-wood.html`,
      image: '', alt: '', keywords: [],
    };
    const script = jsonLd(catalogueGraph(seo, profile, villa, page));
    expect(script).toContain('"@type":"BreadcrumbList"');
    expect(script).toContain(`"numberOfItems":${villa.products.length}`);
  });
});

describe('page text for crawlers', () => {
  it('carries a catalogue\'s pieces and materials', () => {
    const villa = villaDecoder(readJson('villa-wood.json'), 'villa-wood.json');
    const html = cataloguePrerender(villa);
    expect(html).toContain(villa.products[0]?.name ?? '');
    expect(html).toContain(villa.materials[0]?.name ?? '');
  });
});

describe('site files', () => {
  it('sitemap lists each page with its image', () => {
    const xml = sitemap([{ url: 'https://a.b/', image: 'https://a.b/x.jpg' }, { url: 'https://a.b/v.html', image: null }], '2026-11-16');
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).toContain('<image:loc>https://a.b/x.jpg</image:loc>');
    expect(xml).toContain('<lastmod>2026-11-16</lastmod>');
  });

  it('robots.txt points to the sitemap and follows the AI setting', () => {
    expect(robots(seo)).toContain(`Sitemap: ${seo.siteUrl}sitemap.xml`);
    expect(robots({ ...seo, aiCrawlers: true })).toMatch(/User-agent: GPTBot[\s\S]*Allow: \/\n\nSitemap/);
    expect(robots({ ...seo, aiCrawlers: false })).toMatch(/User-agent: ClaudeBot[\s\S]*Disallow: \//);
  });

  it('llms.txt summarises the company with links to every catalogue', async () => {
    const profile = await loadProfile();
    const text = llmsTxt(seo, profile);
    expect(text.startsWith(`# ${profile.company.name.ar}`)).toBe(true);
    for (const c of profile.catalogues) expect(text).toContain(`${seo.siteUrl}${c.href}`);
  });
});
