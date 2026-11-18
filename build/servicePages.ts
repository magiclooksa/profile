/**
 * Service pages: one plain-HTML page per service at services/<slug>.html (see build/site.ts).
 * The files are written when Vite loads its config, so they always match the data.
 * They are build output: services/ is ignored by Git.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadSite, servicePageHtml } from './site';

export const SERVICES_DIR = 'services';

/** The page's address relative to the site root. */
export const servicePath = (slug: string): string => `${SERVICES_DIR}/${slug}.html`;

/** Writes every service page and removes pages whose service was deleted. Returns their paths. */
export function writeServicePages(root: string): string[] {
  const ctx = loadSite(root);
  const pages = ctx.profile.servicePages;
  const dir = resolve(root, SERVICES_DIR);
  mkdirSync(dir, { recursive: true });
  const keep = new Set(pages.map((p) => `${p.slug}.html`));
  for (const f of readdirSync(dir)) if (f.endsWith('.html') && !keep.has(f)) rmSync(resolve(dir, f));
  return pages.map((page) => {
    const file = resolve(root, servicePath(page.slug));
    writeFileSync(file, servicePageHtml(page, ctx));
    return file;
  });
}
