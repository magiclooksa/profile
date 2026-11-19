/**
 * Service pages: one plain-HTML page per service at pages/services/<slug>.html (see tooling/vite/site.ts).
 * The files are written when Vite loads its config, so they always match the data.
 * They are build output: pages/services/ is ignored by Git.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectPaths } from '../paths';
import { loadSite, servicePageHtml } from './site';

export const SERVICES_DIR = 'services';

/** The page's address relative to the site root. */
export const servicePath = (slug: string): string => `${SERVICES_DIR}/${slug}.html`;

/** Writes every service page and removes pages whose service was deleted. Returns their paths. */
export function writeServicePages(root: string): string[] {
  const ctx = loadSite(root);
  const pages = ctx.profile.servicePages;
  const paths = projectPaths(root);
  const dir = paths.page(SERVICES_DIR);
  mkdirSync(dir, { recursive: true });
  const keep = new Set(pages.map((p) => `${p.slug}.html`));
  for (const f of readdirSync(dir)) if (f.endsWith('.html') && !keep.has(f)) rmSync(resolve(dir, f));
  return pages.map((page) => {
    const file = paths.page(servicePath(page.slug));
    writeFileSync(file, servicePageHtml(page, ctx));
    return file;
  });
}
