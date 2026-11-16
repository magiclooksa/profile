/**
 * Service pages: one plain-HTML page per service at services/<slug>.html, from
 * public/data/service-pages.json. The whole page is in the HTML, so search engines read it
 * without running scripts; src/service.ts only adds the logo, the footer and the image viewer.
 *
 * The files are written when Vite loads its config (dev and build alike), so they always match
 * the data. They are build output: services/ is ignored by Git.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CatalogueCard, ServicePage } from '../src/domain/entities';
import { cataloguesDecoder, companyDecoder, servicePagesDecoder } from '../src/infrastructure/schemas';
import { escape } from './seo';

export const SERVICES_DIR = 'services';

/** The page's address relative to the site root. */
export const servicePath = (slug: string): string => `${SERVICES_DIR}/${slug}.html`;

export interface ServiceContext {
  readonly pages: readonly ServicePage[];
  readonly catalogues: readonly CatalogueCard[];
  readonly closingLine: string;
}

const t = escape;
/** Pages live one folder down, so every site path gets "../". */
const up = (path: string): string => `../${path}`;

export function servicePageHtml(page: ServicePage, ctx: ServiceContext): string {
  const [hero, ...rest] = page.images;
  const gallery = rest.length > 0 ? rest : page.images;
  const related = page.catalogues
    .map((href) => ctx.catalogues.find((c) => c.href === href))
    .filter((c): c is CatalogueCard => c !== undefined);
  const others = ctx.pages.filter((p) => p.slug !== page.slug);

  return `<!-- Generated from public/data/service-pages.json by build/servicePages.ts on every build. Edit the data, not this file. -->
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="only light" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="${t(page.description)}" />
    <meta name="theme-color" content="#F7F4F0" />
    <title>${t(page.title)}</title>
    <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;700&family=Almarai:wght@300;400;700&display=swap" />${hero ? `
    <link rel="preload" as="image" href="${t(up(hero.src))}" fetchpriority="high" />` : ''}
  </head>
  <body class="sp-body" data-service="${t(page.slug)}">
    <header class="sp-bar">
      <a class="sp-brand" href="../index.html" aria-label="الصفحة الرئيسية للنظرة الساحرة"></a>
      <a class="sp-bar-cta" href="../index.html#contact">تواصل معنا</a>
    </header>
    <main>
      <section class="sp-hero" aria-labelledby="sp-title">
        <div class="wrap sp-hero-in">
          <div class="sp-hero-copy">
            <nav class="sp-crumbs" aria-label="مسار التنقل">
              <ol>
                <li><a href="../index.html">الرئيسية</a></li>
                <li><a href="../index.html#services">خدماتنا</a></li>
                <li aria-current="page">${t(page.name)}</li>
              </ol>
            </nav>
            <p class="sp-kicker">${t(page.kicker)}</p>
            <h1 id="sp-title">${t(page.heading)}</h1>
            <p class="sp-lead">${t(page.lead)}</p>
            <a class="sp-button" href="../index.html#contact">ابدأ مشروعك معنا</a>
          </div>${hero ? `
          <figure class="sp-hero-img">
            <img src="${t(up(hero.src))}" alt="${t(hero.caption)}" fetchpriority="high" decoding="async" />
          </figure>` : ''}
        </div>
      </section>

      <section class="sp-about">
        <div class="wrap sp-about-in">
          <div class="sp-text">
            ${page.paragraphs.map((p) => `<p>${t(p)}</p>`).join('\n            ')}
          </div>
          <div class="sp-offers">
            <h2>تشمل الخدمة</h2>
            <ul>
              ${page.offers.map((o) => `<li>${t(o)}</li>`).join('\n              ')}
            </ul>
          </div>
        </div>
      </section>
${gallery.length > 0 ? `
      <section class="sp-gallery" aria-labelledby="sp-gallery-title">
        <div class="wrap">
          <h2 id="sp-gallery-title">من أعمالنا في ${t(page.name)}</h2>
          <div class="sp-grid">
            ${gallery.map((img) => `<figure><img src="${t(up(img.src))}" alt="${t(img.caption)}" loading="lazy" decoding="async" /><figcaption>${t(img.caption)}</figcaption></figure>`).join('\n            ')}
          </div>
        </div>
      </section>
` : ''}${related.length > 0 ? `
      <section class="sp-cats" aria-labelledby="sp-cats-title">
        <div class="wrap">
          <h2 id="sp-cats-title">كتالوجات مشاريع ذات صلة</h2>
          <ul>
            ${related.map((c) => `<li><a href="${t(up(c.href))}"><img src="${t(up(c.cover.src))}" alt="${t(c.cover.caption)}" loading="lazy" decoding="async" /><span class="sp-cat-name">${t(c.name.ar)}</span><span class="sp-cat-tag">${t(c.tagline)}</span></a></li>`).join('\n            ')}
          </ul>
        </div>
      </section>
` : ''}${page.faq.length > 0 ? `
      <section class="sp-faq" aria-labelledby="sp-faq-title">
        <div class="wrap">
          <h2 id="sp-faq-title">أسئلة عن ${t(page.name)}</h2>
          <div class="faq-list">
            ${page.faq.map((q) => `<details class="faq-item"><summary><h3>${t(q.question)}</h3></summary><p>${t(q.answer)}</p></details>`).join('\n            ')}
          </div>
        </div>
      </section>
` : ''}
      <section class="sp-more">
        <div class="wrap">
          <h2>ابدأ مشروعك</h2>
          <p>${t(ctx.closingLine)}</p>
          <a class="sp-button sp-button-light" href="../index.html#contact">تواصل معنا</a>${others.length > 0 ? `
          <h3>خدمات أخرى</h3>
          <ul>
            ${others.map((o) => `<li><a href="${t(`${o.slug}.html`)}">${t(o.name)}</a></li>`).join('\n            ')}
          </ul>` : ''}
        </div>
      </section>
    </main>
    <script type="module" src="/src/service.ts"></script>
  </body>
</html>
`;
}

const readJson = (root: string, file: string): unknown =>
  JSON.parse(readFileSync(resolve(root, 'public/data', file), 'utf8'));

export function loadServicePages(root: string): readonly ServicePage[] {
  return servicePagesDecoder(readJson(root, 'service-pages.json'), 'service-pages.json');
}

/** Writes every service page and removes pages whose service was deleted. Returns their paths. */
export function writeServicePages(root: string): string[] {
  const pages = loadServicePages(root);
  const ctx: ServiceContext = {
    pages,
    catalogues: cataloguesDecoder(readJson(root, 'catalogues.json'), 'catalogues.json'),
    closingLine: companyDecoder(readJson(root, 'company.json'), 'company.json').closingLine,
  };
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
