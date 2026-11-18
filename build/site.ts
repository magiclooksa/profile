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
import type { CatalogueCard, Profile, ServicePage } from '../src/domain/entities';
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

export const PAGE_FILES: Readonly<Record<PageKey, string>> = {
  home: 'index.html', services: 'services.html', contracting: 'contracting.html',
  projects: 'projects.html', contact: 'contact.html',
};

const NAV: readonly { key: PageKey; label: string }[] = [
  { key: 'home', label: 'الرئيسية' },
  { key: 'services', label: 'الخدمات' },
  { key: 'contracting', label: 'المقاولات' },
  { key: 'projects', label: 'المشاريع' },
  { key: 'contact', label: 'تواصل معنا' },
];

const NAME = 'النظرة الساحرة';
const NAME_EN = 'Magic Look';

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const noStop = (s: string): string => s.replace(/[.。]\s*$/, '');
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

const sectionHead = (kicker: string, title: string, intro = ''): string => `
        <header class="sec-head rv">
          <p class="kicker">${esc(kicker)}</p>
          <h2>${esc(title)}</h2>${intro ? `
          <p class="sec-intro">${esc(intro)}</p>` : ''}
        </header>`;

const crumbs = (root: string, items: readonly { label: string; href?: string }[]): string => `
          <nav class="crumbs" aria-label="مسار التنقل"><ol>
            <li><a href="${root}index.html">الرئيسية</a></li>
            ${items.map((c) => c.href ? `<li><a href="${esc(c.href)}">${esc(c.label)}</a></li>` : `<li aria-current="page">${esc(c.label)}</li>`).join('\n            ')}
          </ol></nav>`;

interface HeroProps {
  readonly root: string; readonly kicker: string; readonly heading: string; readonly lead: string;
  readonly image?: Photo | undefined; readonly trail: readonly { label: string; href?: string }[]; readonly actions: string;
}
const pageHero = (p: HeroProps): string => `
    <section class="pg-hero on-green${p.image ? '' : ' pg-hero-plain'}" aria-labelledby="page-title">
      <img class="pg-hero-art" src="${p.root}assets/brand/half-symbol.svg" alt="" aria-hidden="true" />
      <div class="wrap pg-hero-in">
        <div class="pg-hero-copy">${crumbs(p.root, p.trail)}
          <p class="kicker">${esc(p.kicker)}</p>
          <h1 id="page-title">${esc(p.heading)}</h1>
          <p class="pg-hero-lead">${esc(p.lead)}</p>
          <div class="actions">${p.actions}</div>
        </div>${p.image ? `
        <figure class="pg-hero-photo" data-zoom>${photo(p.root, p.image, true)}</figure>` : ''}
      </div>
    </section>`;

const button = (href: string, label: string, kind: 'solid' | 'line' = 'solid', external = false): string =>
  `<a class="btn btn-${kind}" href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a>`;

const quoteBand = (ctx: SiteContext, root: string, title: string, text: string, query: string, subject: string): string => `
    <section class="cta on-green">
      <img class="cta-art" src="${root}assets/brand/stroke.svg" alt="" aria-hidden="true" />
      <div class="wrap cta-in rv">
        <div>
          <h2>${esc(title)}</h2>
          <p>${esc(text)}</p>
        </div>
        <div class="actions">
          ${button(`${root}contact.html${query}#quote`, 'اطلب عرض سعر')}
          <a class="btn btn-line" href="${esc(whatsappHref(ctx, quoteText(subject)))}" target="_blank" rel="noopener">${icon('chat')}راسلنا على واتساب</a>
        </div>
      </div>
    </section>`;

const serviceCard = (root: string, s: ServicePage): string => `
          <li class="rv"><a class="card" href="${root}services/${esc(s.slug)}.html">
            <span class="card-img">${s.images[0] ? photo(root, s.images[0]) : ''}</span>
            <span class="card-body"><b>${esc(s.name)}</b><small>${esc(s.kicker)}</small></span>
          </a></li>`;

const projectCard = (root: string, c: CatalogueCard): string => `
          <li class="rv" data-place="${esc(c.place)}"><a class="card" href="${root}${esc(c.href)}">
            <span class="card-img card-wide">${photo(root, c.cover)}</span>
            <span class="card-body"><em>${esc(c.place)}</em><b>${esc(c.name.ar)}</b><small>${esc(c.tagline)}</small></span>
          </a></li>`;

const faqList = (items: readonly { question: string; answer: string }[]): string => `
        <div class="faq">
          ${items.map((q) => `<details class="rv"><summary><h3>${esc(q.question)}</h3></summary><p>${esc(q.answer)}</p></details>`).join('\n          ')}
        </div>`;

const steps = (items: readonly string[], start = 0): string =>
  items.map((s, i) => `<li><span class="num">${String(start + i + 1).padStart(2, '0')}</span>${esc(s)}</li>`).join('');

const film = (root: string, video: string, poster: string | null, title: string): string => `
        <video class="film" controls preload="none" playsinline${poster ? ` poster="${asset(root, poster)}"` : ''} aria-label="${esc(title)}">
          <source src="${asset(root, video)}" type="video/mp4" />
        </video>`;

// ─── header and footer ──────────────────────────────────────────────────────────────────────────

export function siteHeader(root: string, active: NavKey): string {
  return `<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
    <header class="sh on-green" id="site-header">
      <div class="sh-in">
        <a class="sh-logo" href="${root}index.html" aria-label="${NAME} ${NAME_EN}، الصفحة الرئيسية">
          <img src="${root}assets/brand/logo-on-green.svg" alt="" width="173" height="40" />
        </a>
        <nav class="sh-nav" id="site-nav" aria-label="القائمة الرئيسية">
          ${NAV.map((n) => `<a href="${root}${PAGE_FILES[n.key]}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a>`).join('\n          ')}
        </nav>
        <div class="sh-end">
          <span class="sh-search" data-site-search></span>
          <a class="btn btn-solid sh-cta" href="${root}contact.html#quote">اطلب عرض سعر</a>
          <button class="sh-burger" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="فتح القائمة"><i></i><i></i><i></i></button>
        </div>
      </div>
    </header>`;
}

export function siteFooter(ctx: SiteContext, root: string): string {
  const { contact, servicePages, company } = ctx.profile;
  return `<footer class="sf on-green">
      <img class="sf-art" src="${root}assets/brand/half-symbol.svg" alt="" aria-hidden="true" />
      <div class="wrap">
        <div class="sf-grid">
          <div class="sf-brand">
            <a href="${root}index.html" aria-label="${NAME} ${NAME_EN}"><img src="${root}assets/brand/logo-stacked-on-green.svg" alt="" width="150" height="120" loading="lazy" /></a>
            <p>${esc(company.tagline)}</p>
          </div>
          <div>
            <h2>الموقع</h2>
            <ul>${NAV.map((n) => `<li><a href="${root}${PAGE_FILES[n.key]}">${n.label}</a></li>`).join('')}</ul>
          </div>
          <div>
            <h2>الخدمات</h2>
            <ul class="sf-two">${servicePages.map((s) => `<li><a href="${root}services/${esc(s.slug)}.html">${esc(s.name)}</a></li>`).join('')}</ul>
          </div>
          <div>
            <h2>تواصل معنا</h2>
            <ul class="sf-contact">
              <li>${icon('phone')}<a href="${telHref(ctx)}"><bdi dir="ltr">${esc(contact.phone ?? '')}</bdi></a></li>
              <li>${icon('chat')}<a href="${esc(whatsappHref(ctx, 'السلام عليكم، أرغب في الاستفسار عن خدماتكم'))}" target="_blank" rel="noopener">واتساب</a></li>
              <li>${icon('at')}<bdi dir="ltr">${esc(contact.handle ?? '')}</bdi></li>
              <li>${icon('pin')}<a href="${esc(contact.mapUrl ?? '')}" target="_blank" rel="noopener">${esc(contact.address ?? '')}</a></li>
            </ul>
          </div>
        </div>
        <div class="sf-bar">
          <p>© ${new Date().getFullYear()} ${NAME} · ${NAME_EN}</p>
          <a href="#main">العودة إلى الأعلى</a>
        </div>
      </div>
    </footer>
    <a class="wa-float" href="${esc(whatsappHref(ctx, 'السلام عليكم، أرغب في الاستفسار عن خدماتكم'))}" target="_blank" rel="noopener" aria-label="راسلنا على واتساب">${icon('chat')}</a>`;
}

// ─── pages ──────────────────────────────────────────────────────────────────────────────────────

const projectsByHref = (ctx: SiteContext, hrefs: readonly string[]): CatalogueCard[] =>
  hrefs.map((h) => ctx.profile.catalogues.find((c) => c.href === h)).filter((c): c is CatalogueCard => c !== undefined);

function servicesPage(ctx: SiteContext): string {
  const { services, products, levels, journey, company, servicePages } = ctx.profile;
  const copy = ctx.site.pages.services;
  const r = './';
  const showcase = company.films[2];
  return `${pageHero({ root: r, ...copy, trail: [{ label: 'الخدمات' }], actions: button('contact.html#quote', 'اطلب عرض سعر') })}

    <section class="sec">
      <div class="wrap">${sectionHead('اختر خدمتك', 'خدماتنا', services.intro)}
        <ul class="cards">${servicePages.map((s) => serviceCard(r, s)).join('')}
        </ul>
      </div>
    </section>

    <section class="sec sec-tint" id="approach">
      <div class="wrap split">
        <div class="rv">
          <p class="kicker">منهجنا</p>
          <h2>كيف نخدم مساحتك</h2>
          <p class="lead">${esc(services.note)}</p>
          <p>${esc(company.interiorDesign.intro)}</p>
          <ul class="chips">${company.interiorDesign.traits.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>
        <ol class="list-num rv">${steps(services.items.map((s) => noStop(s.text)))}</ol>
      </div>
    </section>

    <section class="sec" id="products">
      <div class="wrap">${sectionHead('منتجاتنا', 'ما يمكنك طلبه منا', products.intro)}
        <ul class="tiles">
          ${products.items.map((p) => {
            const slug = ctx.site.productServices[p.name];
            return `<li class="rv">${slug ? `<a href="services/${esc(slug)}.html">${esc(p.name)}</a>` : esc(p.name)}</li>`;
          }).join('\n          ')}
        </ul>
      </div>
    </section>
${showcase?.video.src ? `
    <section class="sec sec-tint">
      <div class="wrap split">
        <div class="rv">
          <p class="kicker">صناعتنا</p>
          <h2>${esc(showcase.title)}</h2>
          <p>${esc(showcase.text)}</p>
        </div>
        <div class="rv">${film(r, showcase.video.src, showcase.video.poster ?? null, showcase.title)}</div>
      </div>
    </section>
` : ''}
    <section class="sec" id="levels">
      <div class="wrap split">
        <div class="rv">
          <p class="kicker">مستويات التعامل</p>
          <h2>ابدأ بما يناسبك</h2>
          <p class="lead">${esc(levels.intro)}</p>
        </div>
        <ol class="list-num rv">${steps(levels.items.map(noStop))}</ol>
      </div>
    </section>

    <section class="sec sec-tint" id="journey">
      <div class="wrap">${sectionHead('رحلة العمل', 'من أول تواصل حتى ما بعد التسليم', journey.intro)}
        <ol class="journey rv">${steps(journey.steps)}</ol>
      </div>
    </section>
${quoteBand(ctx, r, 'لست متأكدًا من الخدمة المناسبة؟', 'أخبرنا عن مساحتك وسنقترح عليك ما يناسبها.', '', 'خدمات التصميم والتأثيث')}`;
}

function contractingPage(ctx: SiteContext): string {
  const c = ctx.site.contracting;
  const r = './';
  const { journey } = ctx.profile;
  return `${pageHero({ root: r, kicker: c.kicker, heading: c.heading, lead: c.lead, image: c.image, trail: [{ label: 'المقاولات' }],
    actions: button('contact.html?type=contracting#quote', 'اطلب تسعير مشروعك') })}

    <section class="sec">
      <div class="wrap">${sectionHead('شركاؤنا في المشاريع', c.audienceTitle)}
        <ul class="quad">
          ${c.audience.map((a) => `<li class="rv"><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></li>`).join('\n          ')}
        </ul>
      </div>
    </section>

    <section class="sec sec-tint">
      <div class="wrap split">
        <div class="rv">
          <p class="kicker">ما ننفذه</p>
          <h2>${esc(c.scopeTitle)}</h2>
          <p class="lead">نجمع الأعمال الداخلية تحت رؤية واحدة، فتتناسق الخامات والتفاصيل في المشروع كله.</p>
        </div>
        <ul class="ticks rv">${c.scope.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>
    </section>

    <section class="sec" id="process">
      <div class="wrap">${sectionHead('مراحل العمل', c.phasesTitle)}
        <ol class="phases">
          ${c.phases.map((p, i) => `<li class="rv">
            <span class="big-num">${i + 1}</span>
            <div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>
            <ul>${journey.steps.slice(p.from, p.to + 1).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
          </li>`).join('\n          ')}
        </ol>
      </div>
    </section>

    <section class="sec sec-tint" id="pricing">
      <div class="wrap split">
        <div class="rv">
          <p class="kicker">التسعير</p>
          <h2>${esc(c.pricingTitle)}</h2>
          <p class="lead">أرسل ما يتوفر لديك، ونكمل معك الباقي.</p>
          <div class="actions">${button('contact.html?type=contracting#quote', 'أرسل تفاصيل المشروع', 'solid')}</div>
        </div>
        <ul class="ticks rv">${c.pricing.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>
    </section>

    <section class="sec">
      <div class="wrap">${sectionHead('المشاريع', c.projectsTitle)}
        <ul class="cards cards-3">${projectsByHref(ctx, c.projects).map((p) => projectCard(r, p)).join('')}
        </ul>
      </div>
    </section>
${quoteBand(ctx, r, 'لديك مشروع قيد التنفيذ؟', 'أرسل المخططات ونطاق العمل، ونعود إليك بعرض السعر.', '?type=contracting', 'تنفيذ مشروع للمقاولين والمطورين')}`;
}

const PLACE_LABELS: Readonly<Record<string, string>> = { 'الفيلا': 'الفلل', 'المجلس': 'المجالس', 'الصالة': 'الصالات' };

function projectsPage(ctx: SiteContext): string {
  const copy = ctx.site.pages.projects;
  const { catalogues } = ctx.profile;
  const r = './';
  const places = [...new Set(catalogues.map((c) => c.place))];
  return `${pageHero({ root: r, ...copy, trail: [{ label: 'المشاريع' }], actions: button('contact.html#quote', 'اطلب مشروعًا مشابهًا') })}

    <section class="sec">
      <div class="wrap">
        <div class="filters" role="group" aria-label="تصفية المشاريع" data-filters hidden>
          <button type="button" aria-pressed="true" data-filter="">الكل <span>${catalogues.length}</span></button>
          ${places.map((p) => `<button type="button" aria-pressed="false" data-filter="${esc(p)}">${esc(PLACE_LABELS[p] ?? p)} <span>${catalogues.filter((c) => c.place === p).length}</span></button>`).join('\n          ')}
        </div>
        <ul class="cards cards-3" data-filter-list>${catalogues.map((c) => projectCard(r, c)).join('')}
        </ul>
      </div>
    </section>
${quoteBand(ctx, r, 'أعجبك مشروع؟', 'نصمم لك مساحة بالروح نفسها، على مقاس بيتك وذوقك.', '', 'مشروع مشابه لأعمالكم')}`;
}

function contactPage(ctx: SiteContext): string {
  const { contact, servicePages, company } = ctx.profile;
  const copy = ctx.site.pages.contact;
  const r = './';
  const address = contact.address ?? '';
  return `${pageHero({ root: r, ...copy, trail: [{ label: 'تواصل معنا' }],
    actions: `<a class="btn btn-solid" href="${esc(whatsappHref(ctx, 'السلام عليكم، أرغب في الاستفسار عن خدماتكم'))}" target="_blank" rel="noopener">${icon('chat')}راسلنا على واتساب</a><a class="btn btn-line" href="${telHref(ctx)}">${icon('phone')}اتصل بنا</a>` })}

    <section class="sec">
      <div class="wrap">
        <ul class="ways">
          <li class="rv">${icon('phone')}<h2>الجوال</h2><a href="${telHref(ctx)}"><bdi dir="ltr">${esc(contact.phone ?? '')}</bdi></a></li>
          <li class="rv">${icon('chat')}<h2>واتساب</h2><a href="${esc(whatsappHref(ctx, 'السلام عليكم، أرغب في الاستفسار عن خدماتكم'))}" target="_blank" rel="noopener">ابدأ المحادثة</a></li>
          <li class="rv">${icon('at')}<h2>حساباتنا</h2><bdi dir="ltr">${esc(contact.handle ?? '')}</bdi></li>
          <li class="rv">${icon('pin')}<h2>العنوان</h2><a href="${esc(contact.mapUrl ?? '')}" target="_blank" rel="noopener">${esc(address)}</a></li>
        </ul>
      </div>
    </section>

    <section class="sec sec-tint" id="quote">
      <div class="wrap split">
        <div class="rv">
          <p class="kicker">عرض سعر</p>
          <h2>أخبرنا عن مشروعك</h2>
          <p class="lead">${esc(company.closingLine)}</p>
          <p>عند الإرسال يفتح واتساب برسالة جاهزة بهذه التفاصيل، لتراجعها وترسلها إلينا بنفسك.</p>
        </div>
        <form class="form rv" id="quote-form" data-whatsapp="${esc(contact.whatsapp ?? '')}">
          <label>الاسم<input name="name" required autocomplete="name" /></label>
          <label>المدينة<input name="city" autocomplete="address-level2" /></label>
          <label class="full">نوع الطلب
            <select name="service" required>
              <option value="">اختر الخدمة</option>
              <option value="contracting">تنفيذ مشروع للمقاولين والمطورين</option>
              ${servicePages.map((s) => `<option value="${esc(s.slug)}">${esc(s.name)}</option>`).join('\n              ')}
              <option value="other">طلب آخر</option>
            </select>
          </label>
          <label class="full">تفاصيل المشروع<textarea name="details" rows="4" placeholder="نوع المساحة، والمقاسات إن توفرت، وأي تفاصيل تهمك"></textarea></label>
          <button class="btn btn-dark full" type="submit">${icon('chat')}إرسال عبر واتساب</button>
        </form>
      </div>
    </section>

    <section class="map" aria-label="موقعنا على الخريطة">
      <iframe title="موقع النظرة الساحرة على الخريطة: ${esc(address)}" src="https://www.google.com/maps?q=${encodeURIComponent(contact.mapQuery ?? address)}&amp;z=17&amp;hl=ar&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <a class="btn btn-dark" href="${esc(contact.mapUrl ?? '')}" target="_blank" rel="noopener">${icon('pin')}افتح في خرائط Google</a>
    </section>`;
}

type GeneratedPage = Exclude<PageKey, 'home'>;

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

  return `<!-- Generated from public/data by build/site.ts on every build. Edit the data, not this file. -->
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="only light" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="${t(page.description)}" />
    <meta name="theme-color" content="#253A35" />
    <title>${t(page.title)}</title>
    <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg" />${hero ? `
    <link rel="preload" as="image" href="${asset(r, hero.src)}" fetchpriority="high" />` : ''}
  </head>
  <body class="site" data-page="service" data-service="${t(page.slug)}" data-root="../">
    ${siteHeader(r, 'services')}
    <main id="main">${pageHero({ root: r, kicker: page.kicker, heading: page.heading, lead: page.lead, image: hero,
      trail: [{ label: 'الخدمات', href: '../services.html' }, { label: page.name }],
      actions: `${button(`../contact.html${query}#quote`, 'اطلب عرض سعر')}<a class="btn btn-line" href="${t(whatsappHref(ctx, quoteText(page.name)))}" target="_blank" rel="noopener">${icon('chat')}واتساب</a>` })}
      ${hero ? anchors(hero.ids) : ''}

    <section class="sec">
      <div class="wrap split">
        <div class="rv">
          <p class="kicker">عن الخدمة</p>
          <h2>${t(page.name)} كما نراها</h2>
          ${page.paragraphs.map((p) => `<p>${t(p)}</p>`).join('\n          ')}
        </div>
        <div class="rv">
          <h2 class="h-sm">تشمل الخدمة</h2>
          <ul class="ticks">${page.offers.map((o) => `<li>${t(o)}</li>`).join('')}</ul>
        </div>
      </div>
    </section>
${gallery.length > 0 ? `
    <section class="sec sec-tint" aria-labelledby="gallery-title">
      <div class="wrap">
        <header class="sec-head rv"><p class="kicker">معرض الصور</p><h2 id="gallery-title">من أعمالنا في ${t(page.name)}</h2></header>
        <div class="gallery">
          ${gallery.map((g) => `<figure data-zoom>${anchors(g.ids)}${photo(r, g)}<figcaption>${t(g.caption)}</figcaption></figure>`).join('\n          ')}
        </div>
      </div>
    </section>
` : ''}${pageFilm?.video.src ? `
    <section class="sec">
      <div class="wrap split">
        <div class="rv"><p class="kicker">فيلم قصير</p><h2>${t(pageFilm.title)}</h2><p>${t(pageFilm.text)}</p></div>
        <div class="rv">${film(r, pageFilm.video.src, pageFilm.video.poster ?? null, pageFilm.title)}</div>
      </div>
    </section>
` : ''}${related.length > 0 ? `
    <section class="sec">
      <div class="wrap">
        <header class="sec-head rv"><p class="kicker">المشاريع</p><h2>مشاريع ذات صلة</h2></header>
        <ul class="cards cards-3">${related.map((c) => projectCard(r, c)).join('')}
        </ul>
      </div>
    </section>
` : ''}${page.faq.length > 0 ? `
    <section class="sec sec-tint">
      <div class="wrap narrow">
        <header class="sec-head rv"><p class="kicker">أسئلة شائعة</p><h2 id="sp-faq-title">أسئلة عن ${t(page.name)}</h2></header>${faqList(page.faq)}
      </div>
    </section>
` : ''}${quoteBand(ctx, r, `اطلب عرض سعر لـ${page.name}`, ctx.profile.company.closingLine, query, page.name)}

    <section class="sec sec-sm">
      <div class="wrap">
        <h2 class="h-sm">خدمات أخرى</h2>
        <ul class="more">
          ${others.map((o) => `<li><a href="${t(o.slug)}.html">${t(o.name)}</a></li>`).join('\n          ')}
        </ul>
      </div>
    </section>
    </main>
    ${siteFooter(ctx, r)}
    <script type="module" src="/src/site.ts"></script>
  </body>
</html>
`;
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
