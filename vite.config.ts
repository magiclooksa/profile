import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { searchIndexPlugin } from './build/searchIndex';
import { seoPlugin } from './build/seo';
import { sitePlugin } from './build/site';
import { writeServicePages } from './build/servicePages';

// One page per service, written from public/data/service-pages.json before Vite reads its inputs.
const servicePages = process.env.VITEST ? [] : writeServicePages(__dirname);

/** Every catalogue page (the villa and the project pages), from the index scripts/catalogue-pages.mjs writes. */
function catalogues(): { href: string }[] {
  const file = resolve(__dirname, 'public/data/catalogues.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as { href: string }[] : [];
}

// Relative base so the built site works from any folder or sub-path.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    // The main pages, the villa, one page per project and one per service.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        services: resolve(__dirname, 'services.html'),
        contracting: resolve(__dirname, 'contracting.html'),
        projects: resolve(__dirname, 'projects.html'),
        contact: resolve(__dirname, 'contact.html'),
        villa: resolve(__dirname, 'villa-wood.html'),
        ...Object.fromEntries(catalogues().filter((c) => c.href !== 'villa-wood.html')
          .map((c) => [c.href.replace(/.html$/, ''), resolve(__dirname, c.href)])),
        ...Object.fromEntries(servicePages.map((file) => [`service-${basename(file, '.html')}`, file])),
      },
    },
  },
  // Titles, descriptions, link previews, schema.org data, sitemap.xml, robots.txt and llms.txt,
  // all from public/data/seo.json and the content files.
  // search-index.json for the site search.
  plugins: [sitePlugin(__dirname), seoPlugin(__dirname), searchIndexPlugin(__dirname)],
});
