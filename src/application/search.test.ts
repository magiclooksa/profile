import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSearchIndex } from '../../build/searchIndex';
import type { SearchDoc } from '../domain/search';
import { distance, highlight, normalize, SearchIndex, stem } from './search';

const doc = (id: string, title: string, extra: Partial<SearchDoc> = {}): SearchDoc => ({
  id, kind: 'piece', title, subtitle: '', text: '', keywords: [], href: `${id}.html`, image: null, ...extra,
});

describe('normalising Arabic', () => {
  it('unifies letters and removes diacritics and tatweel', () => {
    // ء is dropped so إضاءة, اضاءه and اضاه all meet.
    expect(normalize('أَسِرَّة إضاءة آمنة')).toBe('اسره اضاه امنه');
    expect(normalize('مستشفى المـــجلس')).toBe('مستشفي المجلس');
    expect(normalize('١٢٣ ABC!')).toBe('123 abc');
  });

  it('stems the article and common endings so word forms meet', () => {
    expect(stem(normalize('الكنبات'))).toBe(stem(normalize('كنبة')));
    expect(stem(normalize('خشبية'))).toBe(stem(normalize('خشب')));
    expect(stem('sofas')).toBe('sofa');
  });

  it('measures typos, swaps included', () => {
    expect(distance('مجلس', 'مجلص', 1)).toBe(1);
    expect(distance('مجلس', 'مجسل', 1)).toBe(1);
    expect(distance('مجلس', 'كنب', 1)).toBeGreaterThan(1);
  });
});

describe('SearchIndex', () => {
  const index = new SearchIndex([
    doc('sofa', 'كنبة منحنية بالمخمل', { keywords: ['velvet'] }),
    doc('majlis', 'مجلس مغربي بالنقوش', { kind: 'catalogue' }),
    doc('wardrobe', 'خزانة ملابس من البلوط'),
    doc('table', 'طاولة طعام رخامية'),
  ]);
  const top = (q: string): string | undefined => index.search(q).hits[0]?.doc.id;

  it('finds word forms and spellings', () => {
    expect(top('الكنبات')).toBe('sofa');
    expect(top('طاوله')).toBe('table');
  });

  it('matches synonyms, dialect and English', () => {
    expect(top('صوفا')).toBe('sofa');
    expect(top('دولاب')).toBe('wardrobe');
    expect(top('oak')).toBe('wardrobe');
    expect(top('marble')).toBe('table');
  });

  it('forgives typos and suggests the right word', () => {
    const r = index.search('مجلص');
    expect(r.hits[0]?.doc.id).toBe('majlis');
    expect(r.suggestion).toBe('مجلس');
  });

  it('does not "correct" a word the site knows', () => {
    expect(index.search('صوفا').suggestion).toBeNull();
  });

  it('matches the last word as a prefix while typing', () => {
    expect(top('مغر')).toBe('majlis');
  });

  it('needs every word, then falls back to the closest results', () => {
    expect(index.search('كنبة رخام').partial).toBe(true);
    expect(index.search('كنبة مخمل').partial).toBe(false);
  });

  it('ignores filler words such as "اريد"', () => {
    expect(top('اريد مجلس')).toBe('majlis');
  });

  it('counts results per kind and filters by kind', () => {
    const r = index.search('مجلس', 'piece');
    expect(r.counts.catalogue).toBe(1);
    expect(r.hits).toHaveLength(0);
  });

  it('marks the matched words in a title', () => {
    const r = index.search('مخمل');
    const parts = highlight(r.hits[0]!.doc.title, r.hits[0]!.matched);
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(['بالمخمل']);
  });
});

describe('the real site index', () => {
  const docs = buildSearchIndex(join(import.meta.dirname, '../..'));
  const index = new SearchIndex(docs);

  it('covers pieces, catalogues, services and work', () => {
    for (const kind of ['piece', 'catalogue', 'service', 'work', 'faq'] as const) {
      expect(docs.some((d) => d.kind === kind), kind).toBe(true);
    }
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
  });

  it('answers typical customer searches', () => {
    expect(index.search('مجلس مغربي').hits[0]?.doc.title).toContain('مغربي');
    expect(index.search('وحدة تلفزيون').hits[0]?.doc.kind).toBe('service');
    expect(index.search('رقم الجوال').hits[0]?.doc.href).toBe('contact.html');
    expect(index.search('طاوله طعام').hits.length).toBeGreaterThan(0);
  });

  it('stays fast', () => {
    const t = performance.now();
    for (const q of ['كنب', 'مجلس مغربي', 'خشب الجوز', 'غرفه نوم', 'مجلص']) index.search(q);
    expect(performance.now() - t).toBeLessThan(200);
  });
});
