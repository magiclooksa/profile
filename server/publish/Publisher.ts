import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { writeServicePages } from '../../tooling/vite/servicePages';

export interface PublishStatus {
  /** live: the site shows the latest save. building: it will in a moment. failed: the last build broke. */
  readonly state: 'live' | 'building' | 'failed';
  readonly updatedAt: string | null;
  readonly message: string | null;
}

/** What happens after a document is saved, so the site shows it. */
export interface Publisher {
  afterSave(path: string): void;
  status(): PublishStatus;
}

/** Saving one of these changes a catalogue page or the catalogue index. */
const CATALOGUE = /^(villa-wood\.json|projects\/.+\.json)$/;

/** Rewrites the HTML entry points generated from data: catalogue pages and service pages. */
export function regeneratePages(root: string, path: string): void {
  if (CATALOGUE.test(path)) {
    execFileSync(process.execPath, [resolve(root, 'tooling/scripts/catalogue-pages.mjs')], { cwd: root });
  }
  writeServicePages(root);
}

/** Development: Vite serves pages from source, so regenerating them is enough. */
export class DevPublisher implements Publisher {
  private last: PublishStatus = { state: 'live', updatedAt: null, message: null };

  constructor(private readonly root: string) {}

  afterSave(path: string): void {
    try {
      regeneratePages(this.root, path);
      this.last = { state: 'live', updatedAt: new Date().toISOString(), message: null };
    } catch (error) {
      this.last = { state: 'failed', updatedAt: new Date().toISOString(), message: (error as Error).message };
    }
  }

  status(): PublishStatus {
    return this.last;
  }
}
