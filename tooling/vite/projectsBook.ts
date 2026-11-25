/**
 * The projects catalogue as a web page: pages/projects-catalogue.html, written from the project data
 * when Vite loads its config (like the service pages), so it always matches the data. It is build
 * output and ignored by Git. Styles: src/styles/book.css. Motion: src/entries/book.ts.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectPaths } from '../paths';

export const BOOK_PAGE = 'projects-catalogue.html';

interface Img { readonly src: string; readonly ratio?: string; readonly caption?: string }
interface Project {
  readonly slug: string; readonly href: string;
  readonly name: { readonly ar: string; readonly en: string };
  readonly place: string; readonly kicker: string; readonly tagline: string;
  readonly cover: Img;
  readonly intro: { readonly lead: string; readonly paragraphs?: readonly string[]; readonly image?: Img; readonly inset?: Img };
  readonly materials: readonly { readonly name: string; readonly en?: string; readonly color: string; readonly swatch: string }[];
  readonly spaces: readonly { readonly name: string; readonly gallery?: readonly Img[]; readonly look?: { readonly image?: Img } }[];
  readonly products: readonly { readonly name: string; readonly views?: readonly Img[]; readonly inSitu?: readonly Img[] }[];
}

const esc = (s = ''): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const two = (n: number): string => String(n).padStart(2, '0');
const titleCase = (s: string): string => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const src = (p: string): string => `./${encodeURI(p)}`;
const ratio = (x: Img): number => { const [w, h] = (x.ratio ?? '1:1').split(':').map(Number); return (w ?? 1) / (h ?? 1); };

function loadProjects(root: string): Project[] {
  const data = (f: string): unknown => JSON.parse(readFileSync(resolve(projectPaths(root).data, f), 'utf8'));
  const index = data('catalogues.json') as { href: string }[];
  return index.map((c) => {
    const slug = c.href.replace(/\.html$/, '');
    const file = slug === 'villa-wood' ? 'villa-wood.json' : `projects/${slug}.json`;
    return { slug, href: c.href, ...(data(file) as Omit<Project, 'slug' | 'href'>) };
  });
}

/** Four photos for the gallery: one wide, one tall, two more. No photo twice, never the cover. */
function photos(p: Project): Img[] {
  const seen = new Set([p.cover.src]);
  const pool = [
    ...p.spaces.flatMap((s) => s.gallery ?? []), p.intro.image, p.intro.inset,
    ...p.spaces.map((s) => s.look?.image), ...p.products.flatMap((x) => [...(x.views ?? []), ...(x.inSitu ?? [])]),
  ].filter((x): x is Img => Boolean(x?.src) && !seen.has(x!.src) && Boolean(seen.add(x!.src)));
  const take = (test: (x: Img) => boolean): Img | undefined => { const i = pool.findIndex(test); return i < 0 ? undefined : pool.splice(i, 1)[0]; };
  return [take((x) => ratio(x) > 1.2) ?? take(() => true), take((x) => ratio(x) < 0.9) ?? take(() => true), take(() => true), take(() => true)]
    .filter((x): x is Img => x !== undefined);
}

const figure = (x: Img, cls: string, i: number): string => `
            <figure class="bk-fig ${cls}" data-reveal style="--d:${i * 90}ms">
              <div class="bk-fig-img"><img src="${src(x.src)}" alt="${esc(x.caption)}" loading="lazy" decoding="async" /></div>
              ${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ''}
            </figure>`;

function chapter(p: Project, i: number): string {
  const n = two(i + 1);
  const [a, b, c, d] = photos(p);
  const stats: [number, string][] = [
    [p.spaces.length, p.spaces.length === 1 ? 'مساحة' : 'مساحات'], [p.products.length, 'قطعة'], [p.materials.length, 'خامات'],
  ];
  return `
    <section class="bk-chapter${i % 2 ? ' is-flip' : ''}" id="p-${n}" data-chapter="${n}" data-title="${esc(p.name.ar)}" aria-labelledby="p-${n}-title">
      <div class="bk-opener">
        <div class="bk-opener-photo" data-reveal="wipe">
          <img src="${src(p.cover.src)}" alt="${esc(p.cover.caption)}" loading="lazy" decoding="async" data-parallax />
        </div>
        <div class="bk-opener-text">
          <p class="bk-num latin" data-reveal aria-hidden="true">${n}</p>
          <p class="bk-kicker" data-reveal style="--d:80ms">${esc(p.kicker)}</p>
          <h2 id="p-${n}-title" data-reveal style="--d:140ms">${esc(p.name.ar)}</h2>
          <p class="bk-en latin" data-reveal style="--d:200ms">${esc(titleCase(p.name.en))}</p>
          <span class="bk-rule" data-reveal="line" style="--d:260ms"></span>
          <p class="bk-tagline" data-reveal style="--d:320ms">${esc(p.tagline)}</p>
          <p class="bk-lead" data-reveal style="--d:380ms">${esc(p.intro.lead)}</p>
          <dl class="bk-stats" data-reveal style="--d:440ms">${stats.map(([v, l]) => `
            <div><dt class="latin" data-count="${v}">${two(v)}</dt><dd>${l}</dd></div>`).join('')}
          </dl>
          <a class="bk-open" href="./${esc(p.href)}" data-reveal style="--d:500ms">صفحة المشروع الكاملة <span aria-hidden="true">←</span></a>
        </div>
      </div>
      <div class="bk-gallery">${[a && figure(a, 'g-big', 0), b && figure(b, 'g-tall', 1), c && figure(c, 'g-a', 2), d && figure(d, 'g-b', 3)].filter(Boolean).join('')}
      </div>
      <div class="bk-specs">
        <div class="bk-materials">
          <h3 data-reveal>الخامات</h3>
          <ul>${p.materials.slice(0, 6).map((m, j) => `
            <li data-reveal style="--d:${j * 60}ms"><img src="${src(m.swatch)}" alt="" loading="lazy" /><span><strong>${esc(m.name)}</strong>${m.en ? `<em class="latin">${esc(m.en)}</em>` : ''}</span></li>`).join('')}
          </ul>
        </div>
        <div class="bk-pieces">
          <h3 data-reveal>القطع المنفّذة</h3>
          <ul>${p.products.slice(0, 10).map((x, j) => `<li data-reveal style="--d:${j * 40}ms">${esc(x.name)}</li>`).join('')}</ul>
        </div>
      </div>
    </section>`;
}

export function projectsBookHtml(root: string): string {
  const projects = loadProjects(root);
  const contact = JSON.parse(readFileSync(resolve(projectPaths(root).data, 'contact.json'), 'utf8')) as { phone?: string; whatsapp?: string; website?: string; address?: string };
  const pieces = projects.reduce((s, p) => s + p.products.length, 0);
  const spaces = projects.reduce((s, p) => s + p.spaces.length, 0);
  const hero = projects.find((p) => p.slug === 'white-modern-living-room') ?? projects[0]!;
  const strip = projects.filter((p) => p !== hero).slice(0, 3);
  const phoneHref = `tel:+966${(contact.phone ?? '').replace(/\D/g, '').replace(/^0/, '')}`;
  return `<!-- Generated by tooling/vite/projectsBook.ts from public/data. Edit the data or the generator, not this file. -->
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="only light" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="كتالوج مشاريع النظرة الساحرة: ${projects.length} مشروعًا من المجالس والصالات والفلل، بصورها وخاماتها والقطع التي صنعناها بالمقاس." />
    <meta name="theme-color" content="#253A35" />
    <title>كتالوج المشاريع | النظرة الساحرة</title>
    <link rel="icon" type="image/svg+xml" href="./assets/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="./assets/favicon-32.png" />
    <link rel="apple-touch-icon" href="./assets/apple-touch-icon.png" />
    <link rel="preload" as="image" href="${src(hero.cover.src)}" fetchpriority="high" />
  </head>
  <body class="book-body">
    <!--site:header-->
    <i class="bk-progress" aria-hidden="true"></i>
    <nav class="bk-dots" aria-label="مشاريع الكتالوج">
      <ol>${projects.map((p, i) => `
        <li><a href="#p-${two(i + 1)}" data-dot="${two(i + 1)}"><span class="latin">${two(i + 1)}</span><b>${esc(p.name.ar)}</b></a></li>`).join('')}
      </ol>
    </nav>
    <main id="main" class="book">
      <section class="bk-cover" aria-labelledby="bk-title">
        <div class="bk-cover-photo"><img src="${src(hero.cover.src)}" alt="${esc(hero.cover.caption)}" fetchpriority="high" /></div>
        <div class="bk-cover-panel">
          <img class="bk-mark" src="./assets/brand/half-symbol.svg" alt="" aria-hidden="true" />
          <img class="bk-logo" src="./assets/brand/logo-stacked-on-green.svg" alt="النظرة الساحرة" />
          <p class="bk-cover-kicker">النظرة الساحرة · للأثاث والديكور</p>
          <h1 id="bk-title"><span>كتالوج</span><span>المشاريع</span></h1>
          <p class="bk-cover-en latin">Projects Catalogue · MMXXVI</p>
          <span class="bk-rule"></span>
          <p class="bk-cover-meta"><span class="latin">${two(projects.length)}</span> مشروعًا صمّمناها ونفّذناها بالمقاس في المجالس والصالات والفلل.</p>
          <a class="bk-cue" href="#bk-index"><span>ابدأ التصفّح</span><i aria-hidden="true"></i></a>
        </div>
        <ul class="bk-cover-strip" aria-hidden="true">${strip.map((p) => `<li><img src="${src(p.cover.src)}" alt="" /></li>`).join('')}</ul>
      </section>

      <section class="bk-intro" aria-label="عن الكتالوج">
        <p class="bk-quote" data-reveal>كل مشروع هنا بدأ بقياس المساحة، ثم صمّمناه وصنعنا خشبه وكنبه بالمقاس حتى التركيب.</p>
        <dl class="bk-totals" data-reveal style="--d:120ms">
          <div><dt class="latin" data-count="${projects.length}">${two(projects.length)}</dt><dd>مشروعًا</dd></div>
          <div><dt class="latin" data-count="${spaces}">${two(spaces)}</dt><dd>مساحة</dd></div>
          <div><dt class="latin" data-count="${pieces}">${two(pieces)}</dt><dd>قطعة</dd></div>
        </dl>
      </section>

      <section class="bk-index" id="bk-index" aria-labelledby="bk-index-title">
        <header class="bk-head" data-reveal><p class="bk-kicker">المحتوى</p><h2 id="bk-index-title">المشاريع</h2></header>
        <ol class="bk-toc">${projects.map((p, i) => `
          <li data-reveal style="--d:${(i % 4) * 70}ms"><a href="#p-${two(i + 1)}">
            <span class="bk-toc-img"><img src="${src(p.cover.src)}" alt="" loading="lazy" /></span>
            <span class="bk-toc-n latin">${two(i + 1)}</span>
            <strong>${esc(p.name.ar)}</strong>
            <em>${esc(p.place)}</em>
          </a></li>`).join('')}
        </ol>
      </section>
${projects.map(chapter).join('\n')}
      <section class="bk-closing" aria-labelledby="bk-closing-title">
        <img class="bk-mark" src="./assets/brand/half-symbol.svg" alt="" aria-hidden="true" />
        <div class="bk-closing-in">
          <p class="bk-kicker" data-reveal>النظرة الساحرة · Magic Look</p>
          <h2 id="bk-closing-title" data-reveal style="--d:80ms">لنصمّم مساحتك القادمة</h2>
          <p data-reveal style="--d:160ms">زورونا في المعرض أو راسلونا، ونبدأ معكم من القياس والفكرة حتى التسليم.</p>
          <div class="bk-ctas" data-reveal style="--d:240ms">
            <a class="bk-btn" href="https://wa.me/${esc(contact.whatsapp ?? '')}" target="_blank" rel="noopener">راسلنا على واتساب</a>
            <a class="bk-btn ghost" href="./contact.html#quote">اطلب عرض سعر</a>
          </div>
          <dl class="bk-contact" data-reveal style="--d:320ms">
            <div><dt>الجوال</dt><dd><a class="latin" href="${phoneHref}">${esc(contact.phone)}</a></dd></div>
            <div><dt>المعرض</dt><dd>${esc(contact.address)}</dd></div>
          </dl>
        </div>
      </section>
    </main>
    <!--site:footer-->
    <script type="module" src="/src/entries/book.ts"></script>
  </body>
</html>
`;
}

/** Writes pages/projects-catalogue.html and returns its path. */
export function writeProjectsBook(root: string): string {
  const file = projectPaths(root).page(BOOK_PAGE);
  if (!existsSync(resolve(projectPaths(root).data, 'catalogues.json'))) return file;
  writeFileSync(file, projectsBookHtml(root));
  return file;
}
