import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { seoPlugin } from './build/seo';

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
    // The profile, the villa catalogue and one page per project catalogue.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        villa: resolve(__dirname, 'villa-wood.html'),
        ...Object.fromEntries(catalogues().filter((c) => c.href !== 'villa-wood.html')
          .map((c) => [c.href.replace(/.html$/, ''), resolve(__dirname, c.href)])),
      },
    },
  },
  // Titles, descriptions, link previews, schema.org data, sitemap.xml, robots.txt and llms.txt,
  // all from public/data/seo.json and the content files.
  plugins: [seoPlugin(__dirname)],
});
