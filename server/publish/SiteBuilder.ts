/**
 * Production publishing. Every save triggers a fresh build of the pages (HTML, scripts, styles,
 * SEO files, search index) into a new folder under storage/releases; the server switches to it only
 * once the build succeeds, so visitors never see a half-built site. Photos, films and data are not
 * copied (public/ is over a gigabyte): the server reads them straight from public/.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { regeneratePages, type Publisher, type PublishStatus } from './Publisher';

const KEEP_RELEASES = 3;
/** Saves close together share one build. */
const DEBOUNCE_MS = 1500;

export class SiteBuilder implements Publisher {
  private current: string | null = null;
  private building = false;
  private pending = false;
  private timer: NodeJS.Timeout | null = null;
  private last: PublishStatus = { state: 'live', updatedAt: null, message: null };

  constructor(private readonly root: string, private readonly releasesDir: string) {
    mkdirSync(releasesDir, { recursive: true });
    const pointer = this.pointerFile();
    if (existsSync(pointer)) {
      const dir = resolve(releasesDir, readFileSync(pointer, 'utf8').trim());
      if (existsSync(resolve(dir, 'index.html'))) this.current = dir;
    }
  }

  /** The folder the site is served from, or null before the first build. */
  currentRoot(): string | null {
    return this.current;
  }

  /**
   * Builds a fresh release at start-up, so a code update shows without waiting for a save.
   * The previous release keeps serving until the new one is ready.
   */
  ensureRelease(): void {
    void this.build();
  }

  afterSave(path: string): void {
    try {
      regeneratePages(this.root, path);
    } catch (error) {
      this.last = { state: 'failed', updatedAt: new Date().toISOString(), message: (error as Error).message };
      return;
    }
    this.last = { ...this.last, state: 'building' };
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.build(), DEBOUNCE_MS);
  }

  status(): PublishStatus {
    return this.last;
  }

  private pointerFile(): string {
    return resolve(this.releasesDir, 'current.txt');
  }

  private async build(): Promise<void> {
    if (this.building) {
      this.pending = true;
      return;
    }
    this.building = true;
    this.last = { ...this.last, state: 'building', message: null };
    const id = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = resolve(this.releasesDir, id);
    try {
      await this.runVite(dir);
      this.current = dir;
      writeFileSync(this.pointerFile(), id);
      this.last = { state: 'live', updatedAt: new Date().toISOString(), message: null };
      this.prune();
      console.log(`[publish] release ${id} is live`);
    } catch (error) {
      rmSync(dir, { recursive: true, force: true });
      this.last = { state: 'failed', updatedAt: new Date().toISOString(), message: (error as Error).message };
      console.error(`[publish] build failed: ${(error as Error).message}`);
    } finally {
      this.building = false;
      if (this.pending) {
        this.pending = false;
        void this.build();
      }
    }
  }

  private runVite(outDir: string): Promise<void> {
    return new Promise((done, fail) => {
      const vite = resolve(this.root, 'node_modules/vite/bin/vite.js');
      const child = spawn(process.execPath, [vite, 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'warn'], {
        cwd: this.root,
        env: { ...process.env, SITE_SKIP_PUBLIC: '1' },
        windowsHide: true,
      });
      let log = '';
      const collect = (chunk: Buffer): void => { log = (log + chunk.toString()).slice(-4000); };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.on('error', fail);
      child.on('close', (code) => (code === 0 ? done() : fail(new Error(log.trim() || `vite exited with ${code}`))));
    });
  }

  /** Keeps the newest releases. A folder still in use on Windows is left for the next time. */
  private prune(): void {
    const releases = readdirSync(this.releasesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory()).map((e) => e.name).sort();
    for (const old of releases.slice(0, Math.max(0, releases.length - KEEP_RELEASES))) {
      const dir = resolve(this.releasesDir, old);
      if (dir === this.current) continue;
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* in use; try next time */ }
    }
  }
}
