import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { schemaValidator } from '../../src/infrastructure/content/schemaValidator';
import { ContentFiles, listFiles, resolveDocument, safeFileName } from './ContentFiles';

const DATA = resolve(import.meta.dirname, '../../public/data');

describe('ContentFiles', () => {
  it('lists every data file, project catalogues included', () => {
    const files = listFiles(DATA, /\.json$/);
    expect(files).toContain('faq.json');
    expect(files.some((f) => f.startsWith('projects/'))).toBe(true);
  });

  it('only opens JSON files inside the data folder', () => {
    expect(resolveDocument(DATA, 'projects/a.json')).toBe(resolve(DATA, 'projects/a.json'));
    expect(() => resolveDocument(DATA, '../../package.json')).toThrow();
    expect(() => resolveDocument(DATA, '../seo.json')).toThrow();
    expect(() => resolveDocument(DATA, 'faq.txt')).toThrow();
  });

  it('accepts every data file as it is today', () => {
    for (const file of listFiles(DATA, /\.json$/)) {
      expect(() => schemaValidator(file, JSON.parse(readFileSync(resolve(DATA, file), 'utf8')))).not.toThrow();
    }
  });

  it('keeps the previous version of a document before replacing it', () => {
    const root = mkdtempSync(join(tmpdir(), 'ml-content-'));
    const paths = { data: join(root, 'data'), public: root, history: join(root, 'history') };
    let tick = 0;
    const files = new ContentFiles(paths, () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++)));
    files.writeDocument('projects/a.json', { v: 1 });
    files.writeDocument('projects/a.json', { v: 2 });
    expect(JSON.parse(files.readDocument('projects/a.json'))).toEqual({ v: 2 });
    const backups = readdirSync(join(paths.history, 'projects__a.json'));
    expect(backups).toHaveLength(1);
    expect(JSON.parse(readFileSync(join(paths.history, 'projects__a.json', backups[0] ?? ''), 'utf8'))).toEqual({ v: 1 });
  });

  it('keeps at most 30 backups per document', () => {
    const root = mkdtempSync(join(tmpdir(), 'ml-content-'));
    const paths = { data: join(root, 'data'), public: root, history: join(root, 'history') };
    let tick = 0;
    const files = new ContentFiles(paths, () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, tick++)));
    for (let i = 0; i < 40; i++) files.writeDocument('faq.json', { i });
    expect(readdirSync(join(paths.history, 'faq.json'))).toHaveLength(30);
  });

  it('makes upload names safe', () => {
    expect(safeFileName('My Sofa (1).JPG')).toBe('my-sofa-1.jpg');
    expect(safeFileName('كنبة.webp')).toBe('file.webp');
    expect(safeFileName('../../evil.mp4')).toBe('evil.mp4');
  });
});
