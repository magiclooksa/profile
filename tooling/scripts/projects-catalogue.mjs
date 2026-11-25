// Builds the printable projects catalogue (A4 landscape PDF) from the project data.
//
//   node tooling/scripts/projects-catalogue.mjs            # HTML + PDF
//   node tooling/scripts/projects-catalogue.mjs --html     # HTML only (to look at it in a browser)
//
// Reads public/data/catalogues.json (the order), villa-wood.json and projects/*.json, and the
// brand files in tooling/catalogue/brand. Writes tooling/catalogue/out/projects-catalogue.html
// and tooling/catalogue/out/magic-look-projects-catalogue.pdf (printed with the local Chrome or Edge).
// Needs the Lama Sans font installed on this machine; it is embedded in the PDF.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const data = (f) => JSON.parse(fs.readFileSync(path.join(root, 'public/data', f), 'utf8'));
const outDir = path.join(root, 'tooling/catalogue/out');
const pdfFile = path.join(outDir, 'magic-look-projects-catalogue.pdf');
const htmlFile = path.join(outDir, 'projects-catalogue.html');

const url = (p) => pathToFileURL(p).href;
// Every photo is printed from a JPEG copy scaled for the page (the originals would make a 100 MB+ PDF).
const ffmpeg = ['C:/Program Files/FormatFactory5.21.0.0/ffmpeg.exe', 'ffmpeg'].find((f) => f === 'ffmpeg' || fs.existsSync(f));
const scaled = new Map();
const img = (src, max = 1100) => {
  const name = `${src.replace(/\.[a-z0-9]+$/i, '').replace(/[\\/]/g, '__')}-${max}.jpg`;
  scaled.set(name, { src: path.join(root, 'public', src), max });
  return url(path.join(outDir, 'img', name));
};
function scaleImages() {
  fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
  for (const [name, { src, max }] of scaled) {
    const out = path.join(outDir, 'img', name);
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(src).mtimeMs) continue;
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-vf',
      `scale='min(${max},iw)':'min(${max},ih)':force_original_aspect_ratio=decrease`, '-q:v', '4', out]);
  }
  console.log(`Photos: ${scaled.size} scaled copies in ${path.relative(root, path.join(outDir, 'img'))}`);
}
const brand = (f) => url(path.join(root, 'tooling/catalogue/brand', f));
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const two = (n) => String(n).padStart(2, '0');
const titleCase = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

// ─── data ────────────────────────────────────────────────────────────────────

const contact = data('contact.json');
const projects = data('catalogues.json').map((c) => {
  const slug = c.href.replace(/\.html$/, '');
  const p = slug === 'villa-wood' ? data('villa-wood.json') : data(`projects/${slug}.json`);
  return { slug, href: c.href, ...p };
});

/** Four photos for the details page: one wide, one tall, two more. No photo twice, never the cover. */
function photos(p) {
  const seen = new Set([p.cover.src]);
  const pool = [
    ...p.spaces.flatMap((s) => s.gallery ?? []),
    p.intro.image, p.intro.inset, ...p.spaces.map((s) => s.look?.image),
    ...p.products.flatMap((x) => [...(x.views ?? []), ...(x.inSitu ?? [])]),
  ].filter((x) => x?.src && !seen.has(x.src) && seen.add(x.src));
  const wide = (x) => { const [w, h] = (x.ratio ?? '1:1').split(':').map(Number); return w / h; };
  const take = (test) => { const i = pool.findIndex(test); return i < 0 ? null : pool.splice(i, 1)[0]; };
  const big = take((x) => wide(x) > 1.2) ?? take(() => true);
  const tall = take((x) => wide(x) < 0.9) ?? take(() => true);
  return [big, tall, take(() => true), take(() => true)].filter(Boolean);
}

// ─── pages ───────────────────────────────────────────────────────────────────

const PROJECT_START = 3; // cover, contents, then two pages per project
const pageOf = (i) => PROJECT_START + i * 2;

const folio = (n, label) => `
  <footer class="folio"><span class="folio-label">${label}</span><span class="folio-line"></span><span class="folio-n latin">${two(n)}</span></footer>`;

const cover = () => `
<section class="page cover">
  <div class="cover-photo"><img src="${img((projects.find((p) => p.slug === 'white-modern-living-room') ?? projects[0]).cover.src, 1800)}" alt="" /><span class="cover-frame"></span></div>
  <div class="cover-panel">
    <img class="cover-mark" src="${brand('element-3-half-symbol.svg')}" alt="" />
    <img class="cover-logo" src="${brand('logo-dark-stacked.svg')}" alt="النظرة الساحرة" />
    <div class="cover-titles">
      <p class="cover-kicker">للأثاث والديكور · تصميم وتنفيذ</p>
      <h1>كتالوج<br />المشاريع</h1>
      <p class="cover-en latin">Projects Catalogue</p>
      <span class="rule"></span>
      <p class="cover-meta"><span class="latin">${two(projects.length)}</span> مشروعًا من أعمالنا في المجالس والصالات والفلل</p>
    </div>
    <p class="cover-year latin">2026</p>
  </div>
</section>`;

const contents = () => `
<section class="page contents">
  <header class="contents-head">
    <div>
      <p class="eyebrow">المحتوى</p>
      <h2>مشاريع صنعناها بالمقاس</h2>
      <p class="contents-lead">صمّمنا كل مشروع هنا ونفّذناه من الفكرة حتى التركيب، وصنعنا الخشب والكنب بمقاس المساحة.</p>
    </div>
    <img class="contents-logo" src="${brand('logo-light-rtl.svg')}" alt="النظرة الساحرة" />
  </header>
  <ol class="toc">
    ${projects.map((p, i) => `
    <li>
      <img src="${img(p.cover.src, 500)}" alt="" />
      <div class="toc-text">
        <span class="toc-n latin">${two(i + 1)}</span>
        <strong>${esc(p.name.ar)}</strong>
        <span class="toc-place">${esc(p.place)}</span>
      </div>
      <span class="toc-page latin">${two(pageOf(i))}</span>
    </li>`).join('')}
  </ol>
  ${folio(2, 'النظرة الساحرة · كتالوج المشاريع')}
</section>`;

function opener(p, i) {
  const stats = [
    [p.spaces.length, p.spaces.length === 1 ? 'مساحة' : 'مساحات'],
    [p.products.length, 'قطعة بالمقاس'],
    [p.materials.length, 'خامات'],
  ];
  return `
<section class="page opener">
  <div class="opener-photo"><img src="${img(p.cover.src, 1700)}" alt="${esc(p.cover.caption)}" /></div>
  <div class="opener-panel">
    <p class="opener-n latin">${two(i + 1)}</p>
    <p class="eyebrow">${esc(p.kicker)}</p>
    <h2 class="${[...p.name.ar].length > 22 ? 'is-long' : ''}">${esc(p.name.ar)}</h2>
    <p class="opener-en latin">${esc(titleCase(p.name.en))}</p>
    <span class="rule"></span>
    <p class="opener-tag">${esc(p.tagline)}</p>
    <p class="opener-lead">${esc(p.intro.lead)}</p>
    ${p.intro.paragraphs?.[0] ? `<p class="opener-lead">${esc(p.intro.paragraphs[0])}</p>` : ''}
    <dl class="stats">${stats.map(([n, l]) => `<div><dt class="latin">${two(n)}</dt><dd>${l}</dd></div>`).join('')}</dl>
    <div class="palette">${p.materials.slice(0, 7).map((m) => `<span style="background:${esc(m.color)}" title="${esc(m.name)}"></span>`).join('')}</div>
  </div>
  <p class="photo-caption">${esc(p.cover.caption)}</p>
  ${folio(pageOf(i), esc(p.place))}
</section>`;
}

function details(p, i) {
  const [a, b, c, d] = photos(p);
  const cell = (x, cls) => x ? `<figure class="${cls}"><img src="${img(x.src, cls === 'g-big' ? 1500 : 1000)}" alt="" /><figcaption>${esc(x.caption)}</figcaption></figure>` : '';
  const pieces = p.products.slice(0, 8);
  return `
<section class="page details">
  <header class="details-head">
    <span class="latin">${two(i + 1)}</span><strong>${esc(p.name.ar)}</strong><span class="details-en latin">${esc(titleCase(p.name.en))}</span>
  </header>
  <div class="grid">${cell(a, 'g-big')}${cell(b, 'g-tall')}${cell(c, 'g-a')}${cell(d, 'g-b')}</div>
  <div class="details-foot">
    <div class="materials">
      <p class="eyebrow">الخامات</p>
      <ul>${p.materials.slice(0, 6).map((m) => `
        <li><img src="${img(m.swatch, 200)}" alt="" /><span><strong>${esc(m.name)}</strong><em class="latin">${esc(m.en)}</em></span></li>`).join('')}
      </ul>
    </div>
    <div class="pieces">
      <p class="eyebrow">القطع المنفّذة</p>
      <ul>${pieces.map((x) => `<li>${esc(x.name)}</li>`).join('')}</ul>
    </div>
  </div>
  ${folio(pageOf(i) + 1, esc(p.name.ar))}
</section>`;
}

const closing = () => `
<section class="page closing">
  <img class="closing-mark" src="${brand('element-1-symbol.svg')}" alt="" />
  <div class="closing-body">
    <img class="closing-logo" src="${brand('logo-dark-stacked.svg')}" alt="النظرة الساحرة" />
    <h2>لنصمّم مساحتك القادمة</h2>
    <p class="closing-lead">زورونا في المعرض أو راسلونا، ونبدأ معكم من القياس والفكرة حتى التسليم.</p>
    <span class="rule"></span>
    <dl class="contact">
      <div><dt>الجوال وواتساب</dt><dd class="latin">${esc(contact.phone)}</dd></div>
      <div><dt>الموقع</dt><dd class="latin">${esc(contact.website)}</dd></div>
      <div><dt>المعرض</dt><dd>${esc(contact.address)}</dd></div>
    </dl>
  </div>
</section>`;

// ─── document ────────────────────────────────────────────────────────────────

/** Lama Sans from the installed font files, so the PDF looks the same on any machine that opens it. */
function fontFaces() {
  const dirs = [path.join(os.homedir(), 'AppData/Local/Microsoft/Windows/Fonts'), 'C:/Windows/Fonts'];
  const weights = { Thin: 100, ExtraLight: 200, Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900 };
  return Object.entries(weights).map(([name, w]) => {
    const file = dirs.map((d) => path.join(d, `ArbFONTS-LamaSans-${name}.ttf`)).find((f) => fs.existsSync(f));
    const src = file ? `url("${url(file)}")` : `local("Lama Sans ${name}")`;
    return `@font-face { font-family: "ML Lama"; font-weight: ${w}; src: ${src}; }`;
  }).join('\n');
}

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>كتالوج المشاريع | النظرة الساحرة</title>
<style>
${fontFaces()}
${fs.readFileSync(path.join(root, 'tooling/catalogue/catalogue.css'), 'utf8')}
</style>
</head>
<body>
${cover()}
${contents()}
${projects.map((p, i) => opener(p, i) + details(p, i)).join('\n')}
${closing()}
</body>
</html>`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(htmlFile, html);
scaleImages();
console.log(`HTML: ${path.relative(root, htmlFile)} (${projects.length} projects, ${3 + projects.length * 2} pages)`);

if (!process.argv.includes('--html')) {
  const browser = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].find((f) => fs.existsSync(f));
  if (!browser) throw new Error('Chrome or Edge is needed to print the PDF.');
  fs.mkdirSync(path.dirname(pdfFile), { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ml-catalogue-'));
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--user-data-dir=${profile}`,
    '--allow-file-access-from-files', '--virtual-time-budget=20000',
    `--print-to-pdf=${pdfFile}`, url(htmlFile),
  ], { stdio: 'inherit' });
  fs.rmSync(profile, { recursive: true, force: true });
  console.log(`PDF: ${path.relative(root, pdfFile)} (${(fs.statSync(pdfFile).size / 1048576).toFixed(1)} MB)`);
}
