/// <reference types="vitest/config" />
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { defineConfig } from 'vite';
import { projectPaths } from './tooling/paths';
import { analyticsPlugin } from './tooling/vite/analytics';
import { contentApiPlugin } from './tooling/vite/contentApi';
import { searchIndexPlugin } from './tooling/vite/searchIndex';
import { seoPlugin } from './tooling/vite/seo';
import { pageStylesPlugin, sitePlugin } from './tooling/vite/site';
import { writeServicePages } from './tooling/vite/servicePages';
import { writeProjectsBook } from './tooling/vite/projectsBook';

const paths = projectPaths(__dirname);

// One page per service, written from public/data/service-pages.json before Vite reads its inputs.
const servicePages = process.env.VITEST ? [] : writeServicePages(__dirname);
// The projects catalogue as a web page, written from the project data the same way.
const projectsBook = process.env.VITEST ? null : writeProjectsBook(__dirname);

/** Every catalogue page (the villa and the project pages), from the index tooling/scripts/catalogue-pages.mjs writes. */
function catalogues(): { href: string }[] {
  const file = resolve(paths.data, 'catalogues.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as { href: string }[] : [];
}

export default defineConfig({
  // The HTML pages live in pages/; their address in the site is their path inside it.
  root: paths.pages,
  publicDir: paths.public,
  // Relative base so the built site works from any folder or sub-path.
  base: './',
  resolve: {
    // Pages load their scripts and styles as /src/…, which lives beside pages/, not inside it.
    alias: [{ find: /^\/src\//, replacement: `${paths.src}/` }],
  },
  server: { fs: { allow: [__dirname] } },
  build: {
    target: 'es2022',
    outDir: paths.out,
    emptyOutDir: true,
    // The production server builds releases without public/ (over a gigabyte) and serves it directly.
    copyPublicDir: process.env.SITE_SKIP_PUBLIC !== '1',
    // The main pages, the villa, one page per project and one per service. And the dashboard.
    rollupOptions: {
      input: {
        main: paths.page('index.html'),
        services: paths.page('services.html'),
        contracting: paths.page('contracting.html'),
        projects: paths.page('projects.html'),
        about: paths.page('about.html'),
        contact: paths.page('contact.html'),
        villa: paths.page('villa-wood.html'),
        dashboard: paths.page('dashboard.html'),
        notFound: paths.page('404.html'),
        ...(projectsBook ? { book: projectsBook } : {}),
        ...Object.fromEntries(catalogues().filter((c) => c.href !== 'villa-wood.html')
          .map((c) => [c.href.replace(/.html$/, ''), paths.page(c.href)])),
        ...Object.fromEntries(servicePages.map((file) => [`service-${basename(file, '.html')}`, file])),
      },
    },
  },
  test: { root: __dirname },
  // Titles, descriptions, link previews, schema.org data, sitemap.xml, robots.txt and llms.txt,
  // all from public/data/seo.json and the content files.
  // search-index.json for the site search, and the dashboard's content API in development.
  // Google Analytics on every page but the dashboard (Measurement ID in tooling/vite/analytics.ts).
  plugins: [
    pageStylesPlugin(), sitePlugin(__dirname), seoPlugin(__dirname), searchIndexPlugin(__dirname),
    contentApiPlugin(__dirname), analyticsPlugin(__dirname),
  ],
});
