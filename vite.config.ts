import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Public address of the site. Link previews need absolute URLs. */
const SITE_URL = 'https://magiclooksa.github.io/profile/';
const SITE_NAME = 'النظرة الساحرة | MAGIC LOOK';
const SITE_DESCRIPTION = 'مؤسسة النظرة الساحرة MAGIC LOOK للتصميم الداخلي والديكور والتأثيث: من الفكرة إلى آخر تفصيلة.';

interface Preview { title: string; description: string; image: string; alt: string; url: string }

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Open Graph and Twitter tags that messaging apps read when a link is shared. */
const previewTags = (p: Preview): string => [
  `<meta property="og:type" content="website" />`,
  `<meta property="og:site_name" content="${escape(SITE_NAME)}" />`,
  `<meta property="og:locale" content="ar_SA" />`,
  `<meta property="og:title" content="${escape(p.title)}" />`,
  `<meta property="og:description" content="${escape(p.description)}" />`,
  `<meta property="og:url" content="${escape(p.url)}" />`,
  `<meta property="og:image" content="${escape(p.image)}" />`,
  `<meta property="og:image:type" content="image/jpeg" />`,
  `<meta property="og:image:width" content="1200" />`,
  `<meta property="og:image:height" content="630" />`,
  `<meta property="og:image:alt" content="${escape(p.alt)}" />`,
  `<meta name="twitter:card" content="summary_large_image" />`,
  `<meta name="twitter:title" content="${escape(p.title)}" />`,
  `<meta name="twitter:description" content="${escape(p.description)}" />`,
  `<meta name="twitter:image" content="${escape(p.image)}" />`,
].join('\n    ');

/** Pages other than the profile, each with its own preview. */
const PAGE_PREVIEWS: Record<string, Preview> = {
  'villa-wood.html': {
    title: 'فيلا الخشب | النظرة الساحرة',
    description: 'كتالوج تفصيلي لفيلا الخشب: ثلاث مساحات، وست عشرة قطعة، وتسع خامات طبيعية من البلوط والترافرتين والكتان.',
    url: `${SITE_URL}villa-wood.html`,
    image: `${SITE_URL}og/villa-wood.jpg`,
    alt: 'الصالة العائلية في فيلا الخشب: جدار من البلوط وثريا من الجوت',
  },
};

interface Product { id: string; title: string; description: string; alt: string }

/** Every product photo, with the address the page gives it: collection-<section>-<item>. */
function products(): Product[] {
  const company = JSON.parse(readFileSync(resolve(__dirname, 'public/data/company.json'), 'utf8')) as {
    collections?: { items: { title: string; image: { caption: string } }[] }[];
  };
  return (company.collections ?? []).flatMap((c, i) => c.items.map((item, j) => ({
    id: `collection-${i + 1}-${j + 1}`,
    title: item.title,
    description: item.image.caption,
    alt: item.image.caption,
  })));
}

/**
 * Link previews: tags for the main page, plus a small page per product at s/<id>/.
 * Crawlers ignore "#id" and do not run scripts, so each product needs its own URL;
 * people who open it are sent straight to that product on the page.
 */
function linkPreviews(): Plugin {
  return {
    name: 'link-previews',
    transformIndexHtml(html, ctx) {
      const page = PAGE_PREVIEWS[basename(ctx.filename)] ?? {
        title: SITE_NAME, description: SITE_DESCRIPTION, url: SITE_URL,
        image: `${SITE_URL}og/home.jpg`, alt: 'غرفة طعام فاخرة من تصميم النظرة الساحرة',
      };
      return html.replace('</title>', `</title>\n    <link rel="canonical" href="${page.url}" />\n    ${previewTags(page)}`);
    },
    generateBundle() {
      for (const s of products()) {
        if (!existsSync(resolve(__dirname, `public/og/${s.id}.jpg`))) continue;
        const target = `../../#${s.id}`;
        const title = `${s.title} | النظرة الساحرة`;
        const source = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(s.description)}" />
    <link rel="canonical" href="${SITE_URL}#${s.id}" />
    ${previewTags({ title, description: s.description, url: `${SITE_URL}s/${s.id}/`, image: `${SITE_URL}og/${s.id}.jpg`, alt: s.alt })}
    <meta http-equiv="refresh" content="0; url=${target}" />
    <script>location.replace(${JSON.stringify(target)})</script>
  </head>
  <body>
    <p><a href="${target}">${escape(s.title)}</a></p>
  </body>
</html>
`;
        this.emitFile({ type: 'asset', fileName: `s/${s.id}/index.html`, source });
      }
    },
  };
}

// Relative base so the built site works from any folder or sub-path.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    // Two pages: the profile and the villa catalogue.
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), villa: resolve(__dirname, 'villa-wood.html') } },
  },
  plugins: [linkPreviews()],
});
