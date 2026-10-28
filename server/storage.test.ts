import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { ObjectId } from 'mongodb';
import { afterAll, describe, expect, it } from 'vitest';
import { DiskDriver, ancestors, cleanFolder, cleanName, isWithin } from './storage';

describe('file and folder names', () => {
  it('keeps normal names, including Arabic', () => {
    expect(cleanName('صورة المجلس.jpg')).toBe('صورة المجلس.jpg');
    expect(cleanName('  a   b.pdf ')).toBe('a b.pdf');
  });

  it('refuses names that could escape a folder or break on Windows', () => {
    for (const bad of ['', '..', '.env', 'a/b', 'a\\b', 'c:d', 'what?', 'end.', 'CON', 'nul.txt', 'x'.repeat(200)]) {
      expect(cleanName(bad), bad).toBeNull();
    }
  });

  it('normalises folder paths and refuses traversal', () => {
    expect(cleanFolder(' projects / villa//')).toBe('projects/villa');
    expect(cleanFolder(undefined)).toBe('');
    expect(cleanFolder('a/../b')).toBeNull();
    expect(cleanFolder('../etc')).toBeNull();
  });

  it('lists ancestors and checks nesting', () => {
    expect(ancestors('a/b/c')).toEqual(['a', 'a/b', 'a/b/c']);
    expect(ancestors('')).toEqual([]);
    expect(isWithin('a/b', 'a')).toBe(true);
    expect(isWithin('ab', 'a')).toBe(false);
  });
});

describe('disk storage', () => {
  const root = mkdtempSync(join(tmpdir(), 'ml-storage-'));
  const disk = new DiskDriver(root);
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('writes, reads ranges, moves and removes files inside the storage folder', async () => {
    const id = new ObjectId();
    const key = disk.keyFor(id, 'projects/villa', 'note.txt');
    expect(key).toMatch(/^projects\/villa\/[0-9a-f]{8}-note\.txt$/);

    expect(await disk.write(key, Readable.from([Buffer.from('hello '), Buffer.from('world')]))).toBe(11);
    expect(readFileSync(join(root, ...key.split('/')), 'utf8')).toBe('hello world');

    const chunks: Buffer[] = [];
    for await (const c of disk.read(key, { start: 6, end: 10 })) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).toString()).toBe('world');

    const moved = disk.keyFor(id, 'archive', 'note.txt');
    await disk.move(key, moved);
    expect(readdirSync(root)).toEqual(['archive']); // the empty projects/villa folders are cleaned up

    await disk.remove(moved);
    expect(readdirSync(root)).toEqual([]);
  });

  it('refuses keys that point outside the storage folder', () => {
    expect(() => disk.read('../outside.txt')).toThrow();
  });
});
