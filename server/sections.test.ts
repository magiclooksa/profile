import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECTIONS } from './sections';

const DATA_DIR = join(import.meta.dirname, '../public/data');

describe('editable sections', () => {
  it('has a data file for every section, and each file passes its own check', () => {
    for (const s of SECTIONS) {
      const file = join(DATA_DIR, `${s.key}.json`);
      expect(existsSync(file), file).toBe(true);
      expect(() => s.decoder(JSON.parse(readFileSync(file, 'utf8')), `${s.key}.json`)).not.toThrow();
    }
  });
});
