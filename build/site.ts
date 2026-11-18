/**
 * The site's pages, written as plain HTML at build time from public/data, so every page reads
 * without scripts and search engines see all of it. src/site.ts only adds the menu, search,
 * the photo viewer and the quote form.
 *
 * The home page is the exception: src/main.ts draws it in the browser.
 *
 * Root pages (services.html, contact.html, …) are small templates naming a page on <body data-page>;
 * sitePlugin fills them. Catalogue pages take the shared header and footer through the same plugin.
 */
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { CatalogueCard, IconName, Profile, ServicePage } from '../src/domain/entities';
import { ICON_PATHS } from '../src/presentation/iconPaths';
import {
  advantagesDecoder, cataloguesDecoder, ceoDecoder, clientsDecoder, companyDecoder, contactDecoder, faqDecoder,
  journeyDecoder, levelsDecoder, productsDecoder, projectsDecoder, servicePagesDecoder, servicesDecoder,
} from '../src/infrastructure/schemas';

interface Photo { readonly src: string; readonly caption: string }
interface PageCopy {
  readonly title: string; readonly description: string; readonly kicker: string;
  readonly heading: string; readonly lead: string; readonly image?: Photo;
}
interface Contracting extends PageCopy {
  readonly image: Photo;
  readonly audienceTitle: string; readonly audience: readonly { title: string; text: string }[];
  readonly scopeTitle: string; readonly scope: readonly string[];
  readonly phasesTitle: string;
  readonly phases: readonly { title: string; text: string; from: number; to: number }[];
  readonly pricingTitle: string; readonly pricing: readonly string[];
  readonly projectsTitle: string; readonly projects: readonly string[];
}
export interface SiteData {
  readonly pages: { readonly services: PageCopy; readonly projects: PageCopy; readonly contact: PageCopy };
  readonly contracting: Contracting;
  readonly featuredProjects: readonly string[];
  /** Product type → the service page that covers it. */
  readonly productServices: Readonly<Record<string, string>>;
  /** Service slug → the numbers (from 1) of the photo collections shown on its page. */
  readonly serviceCollections: Readonly<Record<string, readonly number[]>>;
  /** Service slug → index of its film in company.json. */
  readonly serviceFilms: Readonly<Record<string, number>>;
}
export interface SiteContext { readonly profile: Profile; readonly site: SiteData }

export type PageKey = 'home' | 'services' | 'contracting' | 'projects' | 'contact';
type NavKey = PageKey | 'none';
type GeneratedPage = Exclude<PageKey, 'home'>;

export const PAGE_FILES: Readonly<Record<PageKey, string>> = {
  home: 'index.html', services: 'services.html', contracting: 'contracting.html',
  projects: 'projects.html', contact: 'contact.html',
};

const NAV: readonly { key: PageKey | 'about'; href: string; label: string }[] = [
  { key: 'home', href: PAGE_FILES.home, label: 'الرئيسية' },
  { key: 'about', href: `${PAGE_FILES.home}#about`, label: 'من نحن' },
  { key: 'services', href: PAGE_FILES.services, label: 'الخدمات' },
  { key: 'contracting', href: PAGE_FILES.contracting, label: 'المقاولات' },
  { key: 'projects', href: PAGE_FILES.projects, label: 'المشاريع' },
  { key: 'contact', href: PAGE_FILES.contact, label: 'تواصل معنا' },
];

const NAME = 'النظرة الساحرة';
const NAME_EN = 'Magic Look';

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const asset = (root: string, src: string): string => esc(`${root}${encodeURI(src)}`);

// ─── data ───────────────────────────────────────────────────────────────────────────────────────

export function loadSite(root: string): SiteContext {
  const read = (file: string): unknown => JSON.parse(readFileSync(resolve(root, 'public/data', file), 'utf8'));
  const profile: Profile = {
    company: companyDecoder(read('company.json'), 'company.json'),
    services: servicesDecoder(read('services.json'), 'services.json'),
    products: productsDecoder(read('products.json'), 'products.json'),
    advantages: advantagesDecoder(read('advantages.json'), 'advantages.json'),
    journey: journeyDecoder(read('journey.json'), 'journey.json'),
    levels: levelsDecoder(read('levels.json'), 'levels.json'),
    projects: projectsDecoder(read('projects.json'), 'projects.json'),
    clients: clientsDecoder(read('clients.json'), 'clients.json'),
    contact: contactDecoder(read('contact.json'), 'contact.json'),
    catalogues: cataloguesDecoder(read('catalogues.json'), 'catalogues.json'),
    ceo: ceoDecoder(read('ceo.json'), 'ceo.json'),
    faq: faqDecoder(read('faq.json'), 'faq.json'),
    servicePages: servicePagesDecoder(read('service-pages.json'), 'service-pages.json'),
  };
  return { profile, site: read('site.json') as SiteData };
}

/** The service page that now holds a photo collection of the old one-page site. */
export function collectionService(site: SiteData, collection: number): string | null {
  const hit = Object.entries(site.serviceCollections).find(([, list]) => list.includes(collection));
  return hit ? hit[0] : null;
}

/** Where an old "#collection-3" or "#collection-3-2" address lives now. */
export function collectionHref(site: SiteData, collection: number, item?: number): string {
  const slug = collectionService(site, collection);
  if (!slug) return PAGE_FILES.services;
  return `services/${slug}.html${item === undefined ? '' : `#collection-${collection}-${item}`}`;
}

const digits = (s: string): string => s.replace(/\D/g, '');
const telHref = (ctx: SiteContext): string => `tel:+966${digits(ctx.profile.contact.phone ?? '').replace(/^0/, '')}`;
export const whatsappHref = (ctx: SiteContext, text: string): string =>
  `https://wa.me/${ctx.profile.contact.whatsapp ?? ''}?text=${encodeURIComponent(text)}`;
const quoteText = (subject: string): string => `السلام عليكم، أرغب في طلب عرض سعر: ${subject}`;

// ─── small parts ────────────────────────────────────────────────────────────────────────────────

const ICONS = {
  phone: '<path d="M6.6 3.5 9 3l1.6 4.2-2 1.5a12 12 0 0 0 6.7 6.7l1.5-2 4.2 1.6-.5 2.4a2.5 2.5 0 0 1-2.6 2C10.700 19 5 13.300 4.600 6.100a2.500 2.500 0 0 1 2-2.600Z"/>',
  chat: '<path d="M12 3.500a8.500 8.500 0 0 0-7.300 12.800L3.500 20.500l4.300-1.100A8.500 8.500 0 1 0 12 3.500Z"/><path d="M9 8.500c-.6.500-.8 1.300-.5 2.200a7 7 0 0 0 4.800 4.800c.9.300 1.700.100 2.200-.5l.5-.8-2-1.200-.8.800a4.500 4.500 0 0 1-2.500-2.500l.8-.8-1.200-2Z"/>',
  pin: '<path d="M12 21s7-6.100 7-11.500a7 7 0 1 0-14 0C5 14.900 12 21 12 21Z"/><circle cx="12" cy="9.500" r="2.500"/>',
  at: '<circle cx="12" cy="12" r="3.800"/><path d="M15.800 8.200v5.300a2.700 2.700 0 0 0 5.200 0V12a9 9 0 1 0-3.700 7.300"/>',
  arrow: '<path d="M19 12H5m6-6-6 6 6 6"/>',
} as const;
const icon = (name: keyof typeof ICONS): string =>
  `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

const photo = (root: string, p: Photo, eager = false): string =>
  `<img src="${asset(root, p.src)}" alt="${esc(p.caption)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" />`;

const brandIcon = (name: IconName): string =>
  `<svg class="ic" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`;

const pad2 = (n: number): string => String(n).padStart(2, '0');
const PATTERN = '<div class="pattern pattern-tile" aria-hidden="true"></div>';
const stagger = (i: number, every = 3): string => `style="--i:${i % every}"`;
const titleCase = (s: string): string => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** Section numbers run from 01 on every page. */
const counter = (): (() => number) => {
  let n = 0;
  return () => ++n;
};

interface SectionProps {
  readonly number: number; readonly title: string; readonly id?: string;
  readonly intro?: string; readonly className?: string; readonly pattern?: boolean;
}
const section = (p: SectionProps, body: string): string => `
    <section${p.id ? ` id="${esc(p.id)}"` : ''}${p.className ? ` class="${p.className}"` : ''}>${p.pattern ? `
      ${PATTERN}` : ''}
      <div class="wrap">
        <div class="s-head reveal">
          <span class="no latin">${pad2(p.number)}</span>
          <h2>${esc(p.title)}</h2>${p.intro ? `
          <p>${esc(p.intro)}</p>` : ''}
        </div>${body}
      </div>
    </section>`;

const link = (href: string, label: string, kind: 'solid' | 'ghost' = 'solid', external = false): string =>
  `<a class="btn ${kind}" href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a>`;

const whatsappLink = (ctx: SiteContext, text: string, label: string, kind: 'solid' | 'ghost' = 'ghost'): string =>
  `<a class="btn ${kind}" href="${esc(whatsappHref(ctx, text))}" target="_blank" rel="noopener">${icon('chat')}${esc(label)}</a>`;

const crumbs = (root: string, items: readonly { label: string; href?: string }[]): string => `
          <nav class="crumbs" aria-label="مسار التنقل"><ol>
            <li><a href="${root}index.html">الرئيسية</a></li>
            ${items.map((c) => c.href ? `<li><a href="${esc(c.href)}">${esc(c.label)}</a></li>` : `<li aria-current="page">${esc(c.label)}</li>`).join('\n            ')}
          </ol></nav>`;

interface HeroProps {
  readonly root: string; readonly kicker: string; readonly heading: string; readonly lead: string;
  readonly image: Photo; readonly trail: readonly { label: string; href?: string }[]; readonly actions: string;
}
const pageHero = (p: HeroProps): string => `
    <header class="hero hero-with-media pg-hero" id="top">
      <figure class="media hero-background">${photo(p.root, p.image, true)}</figure>
      <div class="hero-shade" aria-hidden="true"></div>
      ${PATTERN}
      <div class="wrap">
        <div class="hero-copy">${crumbs(p.root, p.trail)}
          <p class="eyebrow">${esc(p.kicker)}</p>
          <h1 id="page-title">${esc(p.heading)}</h1>
          <p class="tag">${esc(p.lead)}</p>
          <div class="ctas">${p.actions}</div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="frame">
            <div class="ring"></div><div class="ring r2"></div>
            <i class="corner tr"></i><i class="corner bl"></i>
            <img class="big" src="${p.root}assets/brand/symbol-on-green.svg" alt="" />
          </div>
        </div>
      </div>
    </header>`;

const closingBand = (ctx: SiteContext, root: string, title: string, text: string, query: string, subject: string): string => `
    <section class="journey closing">
      ${PATTERN}
      <div class="wrap closing-in reveal">
        <div>
          <h2>${esc(title)}</h2>
          <p>${esc(text)}</p>
        </div>
        <div class="ctas">
          ${link(`${root}contact.html${query}#quote`, 'اطلب عرض سعر')}
          ${whatsappLink(ctx, quoteText(subject), 'راسلنا على واتساب')}
        </div>
      </div>
    </section>`;

const serviceTile = (root: string, s: ServicePage, i: number): string => `
          <li class="reveal" ${stagger(i)}><a class="svc-tile" href="${root}services/${esc(s.slug)}.html">
            ${s.images[0] ? photo(root, s.images[0]) : ''}
            <span class="svc-tile-no latin" aria-hidden="true">${pad2(i + 1)}</span>
            <span class="svc-tile-text"><b>${esc(s.name)}</b><small>${esc(s.kicker)}</small></span>
          </a></li>`;

const projectCard = (root: string, c: CatalogueCard, i: number): string => `
          <li class="reveal" ${stagger(i, 2)} data-place="${esc(c.place)}"><a class="pj-card" href="${root}${esc(c.href)}">
            ${photo(root, c.cover)}
            <span class="pj-text">
              <em>${esc(c.place)}</em>
              <b>${esc(c.name.ar)}</b>
              <i class="latin">${esc(titleCase(c.name.en))}</i>
              <small>${esc(c.tagline)}</small>
              <span class="pj-open">افتح الكتالوج <span aria-hidden="true">←</span></span>
            </span>
          </a></li>`;

const faqList = (items: readonly { question: string; answer: string }[]): string => `
        <div class="faq-list">
          ${items.map((q, i) => `<details class="faq-item reveal" ${stagger(i, 5)}><summary><h3>${esc(q.question)}</h3></summary><p>${esc(q.answer)}</p></details>`).join('\n          ')}
        </div>`;

const offers = (title: string, items: readonly string[]): string => `
          <div class="offers reveal">
            <h3>${esc(title)}</h3>
            <ul>${items.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
          </div>`;

/**
 * `silentLoop` films play by themselves without sound while on screen (src/presentation/siteChrome.ts).
 * They keep their controls until that script runs, for visitors who get no automatic motion.
 */
const filmBand = (root: string, number: number, video: string, poster: string | null, title: string, text: string, silentLoop = false): string => `
    <section class="journey pg-film">
      ${PATTERN}
      <div class="wrap pg-film-in">
        <div class="reveal">
          <span class="no latin">${pad2(number)}</span>
          <h2>${esc(title)}</h2>
          <p>${esc(text)}</p>
        </div>
        <div class="pg-film-box reveal">
          <i class="corner tr" aria-hidden="true"></i><i class="corner bl" aria-hidden="true"></i>
          <video controls ${silentLoop ? 'data-silent-loop muted loop preload="metadata"' : 'preload="none"'} playsinline${poster ?` poster="${asset(root, poster)}"` : ''} aria-label="${esc(title)}">
            <source src="${asset(root, video)}" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>`;

const journeyBand = (ctx: SiteContext, number: number): string => section(
  { id: 'journey', number, title: 'رحلة العمل معنا', intro: ctx.profile.journey.intro, className: 'journey', pattern: true }, `
        <ol class="track" id="track">
          ${ctx.profile.journey.steps.map((s, i) => `<li class="step"><b class="latin">${pad2(i + 1)}</b><p>${esc(s)}</p></li>`).join('\n          ')}
        </ol>`);

// ─── header and footer ──────────────────────────────────────────────────────────────────────────

export function siteHeader(root: string, active: NavKey): string {
  return `<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
    <nav class="nav" id="nav" aria-label="التنقل الرئيسي">
      <div class="wrap">
        <a class="brand" href="${root}index.html" aria-label="${NAME} ${NAME_EN}، الصفحة الرئيسية">
          <img class="logo" src="${root}assets/brand/logo-on-light.svg" alt="" width="173" height="40" />
        </a>
        <ul>
          ${NAV.map((n) => `<li><a href="${root}${n.href}"${n.key === active ? ' class="active" aria-current="page"' : ''}>${n.label}</a></li>`).join('\n          ')}
        </ul>
        <span class="nav-search" data-site-search></span>
      </div>
    </nav>`;
}

export function siteFooter(ctx: SiteContext, root: string): string {
  const { contact, servicePages, company } = ctx.profile;
  const hello = whatsappHref(ctx, 'السلام عليكم، أرغب في الاستفسار عن خدماتكم');
  return `<footer class="site-footer">
      ${PATTERN}
      <div class="wrap">
        <div class="footer-main footer-wide">
          <div class="footer-brand">
            <a href="${root}index.html" aria-label="${NAME} ${NAME_EN}"><img class="logo" src="${root}assets/brand/logo-on-green.svg" alt="" width="173" height="40" loading="lazy" /></a>
            <p>${esc(company.tagline)}</p>
          </div>
          <div class="footer-col">
            <h2>تصفّح</h2>
            <ul>${NAV.map((n) => `<li><a href="${root}${n.href}">${n.label}</a></li>`).join('')}</ul>
          </div>
          <div class="footer-col">
            <h2>الخدمات</h2>
            <ul>${servicePages.map((s) => `<li><a href="${root}services/${esc(s.slug)}.html">${esc(s.name)}</a></li>`).join('')}</ul>
          </div>
          <div class="footer-col">
            <h2>تواصل معنا</h2>
            <ul>
              <li><a href="${telHref(ctx)}"><bdi dir="ltr">${esc(contact.phone ?? '')}</bdi></a></li>
              <li><a href="${esc(hello)}" target="_blank" rel="noopener">واتساب</a></li>
              <li><bdi dir="ltr">${esc(contact.handle ?? '')}</bdi></li>
              <li><a href="${esc(contact.mapUrl ?? '')}" target="_blank" rel="noopener">${esc(contact.address ?? '')}</a></li>
            </ul>
            <a class="footer-cta" href="${root}contact.html#quote">ابدأ مشروعك</a>
          </div>
        </div>
        <div class="footer-bar">
          <p>© ${new Date().getFullYear()} ${NAME} · ${NAME_EN}</p>
          <a href="#main">العودة إلى الأعلى</a>
        </div>
      </div>
    </footer>
    <a class="wa-float" href="${esc(hello)}" target="_blank" rel="noopener" aria-label="راسلنا على واتساب">${icon('chat')}</a>`;
}

// ─── pages ──────────────────────────────────────────────────────────────────────────────────────

const projectsByHref = (ctx: SiteContext, hrefs: readonly string[]): CatalogueCard[] =>
  hrefs.map((h) => ctx.profile.catalogues.find((c) => c.href === h)).filter((c): c is CatalogueCard => c !== undefined);

/** The page's own photo, or the home page's when it has none. */
const heroPhoto = (ctx: SiteContext, image: Photo | undefined): Photo =>
  image ?? { src: ctx.profile.company.hero?.poster ?? 'images/hero-poster.webp', caption: '' };

function servicesPage(ctx: SiteContext): string {
  const { services, products, levels, company, servicePages } = ctx.profile;
  const copy = ctx.site.pages.services;
  const r = './';
  const next = counter();
  const showcase = company.films[2];
  return `${pageHero({ root: r, ...copy, image: heroPhoto(ctx, copy.image), trail: [{ label: 'الخدمات' }],
    actions: `${link('contact.html#quote', 'اطلب عرض سعر')}${link('#all-services', 'تصفّح الخدمات', 'ghost')}` })}
${section({ id: 'all-services', number: next(), title: 'خدماتنا', intro: services.intro }, `
        <ul class="svc-tiles">${servicePages.map((s, i) => serviceTile(r, s, i)).join('')}
        </ul>`)}
${section({ id: 'approach', number: next(), title: 'كيف نخدم مساحتك', intro: company.interiorDesign.intro, className: 'services' }, `
        <div class="svc-grid">
          ${services.items.map((s, i) => `<div class="svc reveal" ${stagger(i)}>${brandIcon(s.icon)}<p>${esc(s.text)}</p></div>`).join('\n          ')}
        </div>
        <p class="note">${esc(services.note)}</p>
        <ul class="traits">${company.interiorDesign.traits.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`)}
${section({ id: 'products', number: next(), title: 'منتجاتنا', intro: products.intro }, `
        <div class="prod-grid">
          ${products.items.map((p, i) => {
            const slug = ctx.site.productServices[p.name];
            const inner = `${brandIcon(p.icon)}<p>${esc(p.name)}</p>`;
            return slug
              ? `<a class="prod reveal" ${stagger(i, 5)} href="services/${esc(slug)}.html">${inner}</a>`
              : `<div class="prod reveal" ${stagger(i, 5)}>${inner}</div>`;
          }).join('\n          ')}
        </div>`)}
${showcase?.video.src ? filmBand(r, next(), showcase.video.src, showcase.video.poster ?? null, showcase.title, showcase.text, true) : ''}
${section({ id: 'levels', number: next(), title: 'مستويات التعامل', intro: levels.intro }, `
        <ol class="lvls">
          ${levels.items.map((t, i) => `<li class="lvl reveal" ${stagger(i, 5)}><span class="latin">${i + 1}</span><p>${esc(t)}</p></li>`).join('\n          ')}
        </ol>`)}
${journeyBand(ctx, next())}
${closingBand(ctx, r, 'لست متأكدًا من الخدمة المناسبة؟', 'أخبرنا عن مساحتك وسنقترح عليك ما يناسبها.', '', 'خدمات التصميم والتأثيث')}`;
}

function contractingPage(ctx: SiteContext): string {
  const c = ctx.site.contracting;
  const r = './';
  const { journey } = ctx.profile;
  const next = counter();
  return `${pageHero({ root: r, kicker: c.kicker, heading: c.heading, lead: c.lead, image: c.image, trail: [{ label: 'المقاولات' }],
    actions: `${link('contact.html?type=contracting#quote', 'اطلب تسعير مشروعك')}${link('#process', 'مراحل العمل', 'ghost')}` })}
${section({ number: next(), title: c.audienceTitle }, `
        <div class="segs segs-4">
          ${c.audience.map((a, i) => `<div class="seg reveal" ${stagger(i, 4)}><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></div>`).join('\n          ')}
        </div>`)}
${section({ number: next(), title: c.scopeTitle, className: 'services' }, `
        <div class="pg-split">
          <p class="pg-lead reveal">نجمع الأعمال الداخلية تحت رؤية واحدة، فتتناسق الخامات والتفاصيل في المشروع كله.</p>${offers('ما ننفذه', c.scope)}
        </div>`)}
${section({ id: 'process', number: next(), title: c.phasesTitle, className: 'journey', pattern: true }, `
        <ol class="phases">
          ${c.phases.map((p, i) => `<li class="reveal">
            <span class="latin">${pad2(i + 1)}</span>
            <div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>
            <ul>${journey.steps.slice(p.from, p.to + 1).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
          </li>`).join('\n          ')}
        </ol>`)}
${section({ id: 'pricing', number: next(), title: c.pricingTitle }, `
        <div class="pg-split">
          <div class="reveal">
            <p class="pg-lead">أرسل ما يتوفر لديك، ونكمل معك الباقي.</p>
            <div class="ctas">${link('contact.html?type=contracting#quote', 'أرسل تفاصيل المشروع')}</div>
          </div>${offers('التفاصيل المطلوبة', c.pricing)}
        </div>`)}
${section({ number: next(), title: c.projectsTitle, className: 'services' }, `
        <ul class="pj-grid">${projectsByHref(ctx, c.projects).map((p, i) => projectCard(r, p, i)).join('')}
        </ul>`)}
${closingBand(ctx, r, 'لديك مشروع قيد التنفيذ؟', 'أرسل المخططات ونطاق العمل، ونعود إليك بعرض السعر.', '?type=contracting', 'تنفيذ مشروع للمقاولين والمطورين')}`;
}

const PLACE_LABELS: Readonly<Record<string, string>> = { 'الفيلا': 'الفلل', 'المجلس': 'المجالس', 'الصالة': 'الصالات' };

function projectsPage(ctx: SiteContext): string {
  const copy = ctx.site.pages.projects;
  const { catalogues } = ctx.profile;
  const r = './';
  const places = [...new Set(catalogues.map((c) => c.place))];
  return `${pageHero({ root: r, ...copy, image: heroPhoto(ctx, copy.image), trail: [{ label: 'المشاريع' }],
    actions: `${link('#all-projects', 'تصفّح المشاريع')}${link('contact.html#quote', 'اطلب مشروعًا مشابهًا', 'ghost')}` })}
${section({ id: 'all-projects', number: 1, title: 'كتالوجات المشاريع', intro: `${catalogues.length} مشروعًا بتفاصيلها` }, `
        <div class="filters" role="group" aria-label="تصفية المشاريع" data-filters hidden>
          <button type="button" aria-pressed="true" data-filter="">الكل <span class="latin">${catalogues.length}</span></button>
          ${places.map((p) => `<button type="button" aria-pressed="false" data-filter="${esc(p)}">${esc(PLACE_LABELS[p] ?? p)} <span class="latin">${catalogues.filter((c) => c.place === p).length}</span></button>`).join('\n          ')}
        </div>
        <ul class="pj-grid" data-filter-list>${catalogues.map((c, i) => projectCard(r, c, i)).join('')}
        </ul>`)}
${closingBand(ctx, r, 'أعجبك مشروع؟', 'نصمم لك مساحة بالروح نفسها، على مقاس بيتك وذوقك.', '', 'مشروع مشابه لأعمالكم')}`;
}

const contactCard = (name: keyof typeof ICONS, label: string, value: string, href?: string): string => `
            <div class="card">${icon(name)}<div><small>${esc(label)}</small>${href
              ? `<a href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}><bdi>${esc(value)}</bdi></a>`
              : `<bdi>${esc(value)}</bdi>`}</div></div>`;

function contactPage(ctx: SiteContext): string {
  const { contact, servicePages, company } = ctx.profile;
  const copy = ctx.site.pages.contact;
  const r = './';
  const address = contact.address ?? '';
  const hello = 'السلام عليكم، أرغب في الاستفسار عن خدماتكم';
  return `${pageHero({ root: r, ...copy, image: heroPhoto(ctx, copy.image), trail: [{ label: 'تواصل معنا' }],
    actions: `${whatsappLink(ctx, hello, 'راسلنا على واتساب', 'solid')}<a class="btn ghost" href="${telHref(ctx)}">${icon('phone')}اتصل بنا</a>` })}

    <section class="contact" id="details">
      <div class="wrap">
        <div class="grid">
          <div class="reveal">
            <h2>يسعدنا تواصلك</h2>
            <p class="say">${esc(company.closingLine)}</p>
            <div class="cards">${contactCard('phone', 'الجوال', contact.phone ?? '', telHref(ctx))}${contactCard('chat', 'واتساب', 'ابدأ المحادثة', whatsappHref(ctx, hello))}${contactCard('at', 'حساباتنا', contact.handle ?? '')}${contactCard('pin', 'موقع المعرض', address, contact.mapUrl ?? undefined)}
            </div>
          </div>
          <div class="map-panel reveal">
            <figure class="media contact-map">
              <iframe title="موقع النظرة الساحرة على الخريطة: ${esc(address)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(contact.mapQuery ?? address)}&amp;z=17&amp;hl=ar&amp;output=embed"></iframe>
            </figure>
            <a class="map-link" href="${esc(contact.mapUrl ?? '')}" target="_blank" rel="noopener">فتح الموقع على الخريطة</a>
          </div>
        </div>
      </div>
    </section>
${section({ id: 'quote', number: 1, title: 'اطلب عرض سعر', intro: 'عند الإرسال يفتح واتساب برسالة جاهزة، لتراجعها وترسلها إلينا بنفسك.' }, `
        <div class="pg-split">
          <p class="pg-lead reveal">أخبرنا عن مشروعك، ونجهّز لك العرض المناسب لمساحتك واحتياجك.</p>
          <form class="form reveal" id="quote-form" data-whatsapp="${esc(contact.whatsapp ?? '')}">
            <label>الاسم<input name="name" required autocomplete="name" /></label>
            <label>المدينة<input name="city" autocomplete="address-level2" /></label>
            <label class="full">نوع الطلب
              <select name="service" required>
                <option value="">اختر الخدمة</option>
                <option value="contracting">تنفيذ مشروع للمقاولين والمطورين</option>
                ${servicePages.map((s) => `<option value="${esc(s.slug)}">${esc(s.name)}</option>`).join('\n                ')}
                <option value="other">طلب آخر</option>
              </select>
            </label>
            <label class="full">تفاصيل المشروع<textarea name="details" rows="4" placeholder="نوع المساحة، والمقاسات إن توفرت، وأي تفاصيل تهمك"></textarea></label>
            <button class="btn solid full" type="submit">${icon('chat')}إرسال عبر واتساب</button>
          </form>
        </div>`)}`;
}

const PAGE_RENDER: Readonly<Record<GeneratedPage, (ctx: SiteContext) => string>> = {
  services: servicesPage, contracting: contractingPage, projects: projectsPage, contact: contactPage,
};

export function pageBody(ctx: SiteContext, key: GeneratedPage): string {
  return `${siteHeader('./', key)}
    <main id="main">${PAGE_RENDER[key](ctx)}
    </main>
    ${siteFooter(ctx, './')}`;
}

/** Title, description and share text of a root page. */
export function pageMeta(ctx: SiteContext, key: Exclude<PageKey, 'home'>): { title: string; description: string; heading: string } {
  const copy = key === 'contracting' ? ctx.site.contracting : ctx.site.pages[key];
  return { title: copy.title, description: copy.description, heading: copy.heading };
}

// ─── a service page ─────────────────────────────────────────────────────────────────────────────

interface GalleryItem { readonly src: string; readonly caption: string; readonly ids: string[] }

/** The service's own photos plus the collections that belong to it, each photo once. */
function serviceGallery(ctx: SiteContext, page: ServicePage): GalleryItem[] {
  const items = new Map<string, GalleryItem>();
  const add = (src: string, caption: string, id?: string): void => {
    const item = items.get(src) ?? { src, caption, ids: [] };
    if (id) item.ids.push(id);
    items.set(src, item);
  };
  page.images.forEach((i) => add(i.src, i.caption));
  for (const n of ctx.site.serviceCollections[page.slug] ?? []) {
    ctx.profile.company.collections[n - 1]?.items.forEach((item, j) => {
      if (item.image.src) add(item.image.src, item.image.caption, `collection-${n}-${j + 1}`);
    });
  }
  return [...items.values()];
}

export function servicePageHtml(page: ServicePage, ctx: SiteContext): string {
  const r = '../';
  const t = esc;
  const [hero, ...gallery] = serviceGallery(ctx, page);
  const related = projectsByHref(ctx, page.catalogues);
  const others = ctx.profile.servicePages.filter((p) => p.slug !== page.slug);
  const filmIndex = ctx.site.serviceFilms[page.slug];
  const pageFilm = filmIndex === undefined ? undefined : ctx.profile.company.films[filmIndex];
  const anchors = (ids: readonly string[]): string => ids.map((id) => `<span class="anchor" id="${t(id)}"></span>`).join('');
  const query = `?service=${encodeURIComponent(page.slug)}`;
  const next = counter();

  return `<!-- Generated from public/data by build/site.ts on every build. Edit the data, not this file. -->
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="only light" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="${t(page.description)}" />
    <meta name="theme-color" content="#F7F4F0" />
    <title>${t(page.title)}</title>
    <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />${hero ? `
    <link rel="preload" as="image" href="${asset(r, hero.src)}" fetchpriority="high" />` : ''}
  </head>
  <body class="site" data-page="service" data-service="${t(page.slug)}" data-root="../">
    ${siteHeader(r, 'services')}
    <main id="main">${pageHero({ root: r, kicker: page.kicker, heading: page.heading, lead: page.lead, image: heroPhoto(ctx, hero),
      trail: [{ label: 'الخدمات', href: '../services.html' }, { label: page.name }],
      actions: `${link(`../contact.html${query}#quote`, 'اطلب عرض سعر')}${whatsappLink(ctx, quoteText(page.name), 'واتساب')}` })}
      ${hero ? anchors(hero.ids) : ''}
${section({ number: next(), title: `${page.name} كما نراها`, className: 'about' }, `
        <div class="pg-split">
          <div class="pg-copy">
            ${page.paragraphs.map((p, i) => `<p class="${i === 0 ? 'pg-lead ' : ''}reveal">${t(p)}</p>`).join('\n            ')}
          </div>${offers('تشمل الخدمة', page.offers)}
        </div>`)}
${gallery.length > 0 ? section({ number: next(), title: `من أعمالنا في ${page.name}`, className: 'services' }, `
        <div class="gallery">
          ${gallery.map((g) => `<figure data-zoom>${anchors(g.ids)}${photo(r, g)}<figcaption>${t(g.caption)}</figcaption></figure>`).join('\n          ')}
        </div>`) : ''}
${pageFilm?.video.src ? filmBand(r, next(), pageFilm.video.src, pageFilm.video.poster ?? null, pageFilm.title, pageFilm.text) : ''}
${related.length > 0 ? section({ number: next(), title: 'مشاريع ذات صلة' }, `
        <ul class="pj-grid">${related.map((c, i) => projectCard(r, c, i)).join('')}
        </ul>`) : ''}
${page.faq.length > 0 ? section({ number: next(), title: `أسئلة عن ${page.name}`, className: 'services' }, faqList(page.faq)) : ''}
${closingBand(ctx, r, `اطلب عرض سعر لـ${page.name}`, ctx.profile.company.closingLine, query, page.name)}

    <section class="more-services">
      <div class="wrap">
        <nav class="svc-pages" aria-label="خدمات أخرى">
          <h3>خدمات أخرى</h3>
          <ul>
            ${others.map((o) => `<li><a href="${t(o.slug)}.html">${t(o.name)}</a></li>`).join('\n            ')}
          </ul>
        </nav>
      </div>
    </section>
    </main>
    ${siteFooter(ctx, r)}
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
}

// ─── stylesheets ────────────────────────────────────────────────────────────────────────────────

const PAGE_STYLES: Readonly<Record<string, string>> = {
  '/src/main.ts': 'page-home', '/src/site.ts': 'page-site', '/src/villa.ts': 'page-villa',
};

const FONTS = `    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;700&family=Almarai:wght@300;400;700&display=swap" />`;

/**
 * Links each page's stylesheet in its <head>, chosen by the page's script. The browser then waits
 * for it before drawing, so a page never shows unstyled, in development as in the built site.
 */
export function pageStylesPlugin(): Plugin {
  return {
    name: 'magic-look-page-styles',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const script = /<script type="module" src="(\/src\/[a-z]+\.ts)"/.exec(html)?.[1];
        const sheet = script ? PAGE_STYLES[script] : undefined;
        if (!sheet) return html;
        return html
          .replace(/(<meta name="theme-color" content=")[^"]*/, '$1#F7F4F0')
          .replace('</head>', () => `${FONTS}\n    <link rel="stylesheet" href="/src/styles/${sheet}.css" />\n  </head>`);
      },
    },
  };
}

// ─── the Vite plugin ────────────────────────────────────────────────────────────────────────────

export function sitePlugin(root: string): Plugin {
  return {
    name: 'magic-look-site',
    transformIndexHtml(html, hook) {
      if (!html.includes('<!--site:')) return html;
      const ctx = loadSite(root);
      const key = /<body[^>]*data-page="([a-z]+)"/.exec(html)?.[1] as GeneratedPage | undefined;
      let out = html;
      if (key && key in PAGE_RENDER) out = out.replace('<!--site:page-->', () => pageBody(ctx, key));
      // Catalogue pages sit at the site root and belong under "projects".
      out = out.replace('<!--site:header-->', () => siteHeader('./', 'projects'));
      out = out.replace('<!--site:footer-->', () => siteFooter(ctx, './'));
      if (out.includes('<!--site:')) throw new Error(`${basename(hook.filename)}: unknown page`);
      return out;
    },
  };
}
