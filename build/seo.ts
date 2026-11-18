/**
 * Search engine (SEO) and AI assistant (GEO) support, written into the site at build time.
 *
 * Everything comes from public/data: seo.json for the settings, and the profile and catalogue
 * files for the content. Each page gets its title, description, keywords, canonical URL, link
 * previews and schema.org data, plus its text as plain HTML for crawlers that do not run scripts.
 * The build also writes sitemap.xml, robots.txt and llms.txt, and a small preview page per product.
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { Profile, ServicePage } from '../src/domain/entities';
import type { Villa } from '../src/domain/villa';
import { array, DataError, nullable, numberIn, object, string, type Decoder } from '../src/infrastructure/decoders';
import { JsonProfileRepository, type JsonFetcher } from '../src/infrastructure/JsonProfileRepository';
import { villaDecoder } from '../src/infrastructure/villaSchema';
import { collectionHref, loadSite, PAGE_FILES, pageMeta, type PageKey } from './site';

// ─── settings (public/data/seo.json) ────────────────────────────────────────────────────────────

export interface SeoSettings {
  /** Public address of the site, ending in "/". Link previews and sitemaps need absolute URLs. */
  readonly siteUrl: string;
  /** Title of the home page, as it shows in search results. */
  readonly title: string;
  /** About 120 to 160 characters: the snippet under the title in search results. */
  readonly description: string;
  readonly keywords: readonly string[];
  /** Share image of the home page (1200 × 630), relative to the site. */
  readonly image: { readonly src: string; readonly alt: string };
  readonly logo: string;
  readonly business: {
    /** schema.org types, e.g. HomeAndConstructionBusiness, FurnitureStore. */
    readonly types: readonly string[];
    readonly foundingDate: string | null;
    readonly city: string | null;
    readonly region: string | null;
    /** Two-letter country code. */
    readonly country: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    /** schema.org format, e.g. "Sa-Th 09:00-22:00". */
    readonly openingHours: readonly string[];
    /** e.g. "$$" or "SAR 5,000 - 100,000". */
    readonly priceRange: string | null;
    readonly areaServed: readonly string[];
  };
  /** Full links to the company's official accounts: Instagram, X, TikTok, Snapchat, Google Maps… */
  readonly social: readonly string[];
  /** The content value of each search console's verification meta tag. */
  readonly verification: { readonly google: string | null; readonly bing: string | null };
  /** Let AI assistants (ChatGPT, Claude, Perplexity, Gemini…) read the site so they can cite it. */
  readonly aiCrawlers: boolean;
}

const siteUrl: Decoder<string> = (v, path) => {
  const s = string(v, path);
  if (!/^https?:\/\/.+\/$/.test(s)) throw new DataError(path, 'رابط كامل ينتهي بـ / مثل https://example.com/');
  return s;
};

const flag: Decoder<boolean> = (v, path) => {
  if (typeof v !== 'boolean') throw new DataError(path, 'true أو false');
  return v;
};

export const seoDecoder = object<SeoSettings>({
  siteUrl,
  title: string,
  description: string,
  keywords: array(string),
  image: object({ src: string, alt: string }),
  logo: string,
  business: object({
    types: array(string),
    foundingDate: nullable(string),
    city: nullable(string),
    region: nullable(string),
    country: string,
    latitude: nullable(numberIn(-90, 90)),
    longitude: nullable(numberIn(-180, 180)),
    openingHours: array(string),
    priceRange: nullable(string),
    areaServed: array(string),
  }),
  social: array(string),
  verification: object({ google: nullable(string), bing: nullable(string) }),
  aiCrawlers: flag,
});

// ─── helpers ────────────────────────────────────────────────────────────────────────────────────

export const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const absolute = (seo: SeoSettings, path: string): string => new URL(path, seo.siteUrl).href;

type Json = string | number | boolean | null | undefined | Json[] | { [key: string]: Json };

/** Drops empty values, so the data only states what is known. */
function clean(value: Json): Json {
  if (Array.isArray(value)) {
    const items = value.map(clean).filter((v) => v !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).map(([k, v]) => [k, clean(v)] as const).filter(([, v]) => v !== undefined);
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  return value === null || value === '' ? undefined : value;
}

/** A schema.org script; "<" is escaped so no text in the data can close the tag. */
export const jsonLd = (graph: Json[]): string =>
  `<script type="application/ld+json">${JSON.stringify(clean({ '@context': 'https://schema.org', '@graph': graph }))
    .replace(/</g, '\\u003c')}</script>`;

const stripStop = (s: string): string => s.replace(/[.。]\s*$/, '');

// ─── head tags ──────────────────────────────────────────────────────────────────────────────────

export interface PageMeta {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly image: string;
  readonly alt: string;
  readonly keywords: readonly string[];
  readonly robots?: string;
}

const INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

/** The @handle of the X (Twitter) account among the social links, if there is one. */
const xHandle = (seo: SeoSettings): string | null => {
  const link = seo.social.find((s) => /\/\/(www\.)?(x|twitter)\.com\/[^/]+/.test(s));
  return link?.replace(/\/+$/, '').split('/').pop() ?? null;
};

/** Open Graph and Twitter tags that messaging apps read when a link is shared. */
export const previewTags = (seo: SeoSettings, siteName: string, p: PageMeta): string[] => [
  `<meta property="og:type" content="website" />`,
  `<meta property="og:site_name" content="${escape(siteName)}" />`,
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
  ...(xHandle(seo) ? [`<meta name="twitter:site" content="@${escape(xHandle(seo) ?? '')}" />`] : []),
];

/** Hides the build-time text behind the loader; shows it to visitors who have scripts turned off. */
const PRERENDER_STYLE = [
  '<style>.prerender{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}</style>',
  '<noscript><style>.prerender{position:static;width:auto;height:auto;margin:0 auto;max-width:960px;padding:32px 16px;overflow:visible;clip:auto;clip-path:none;white-space:normal}.boot{display:none}</style></noscript>',
].join('\n    ');

export function headTags(seo: SeoSettings, siteName: string, p: PageMeta, graph: Json[]): string {
  return [
    `<meta name="robots" content="${p.robots ?? INDEX}" />`,
    p.keywords.length > 0 ? `<meta name="keywords" content="${escape([...new Set(p.keywords)].join('، '))}" />` : '',
    `<meta name="author" content="${escape(siteName)}" />`,
    seo.verification.google ? `<meta name="google-site-verification" content="${escape(seo.verification.google)}" />` : '',
    seo.verification.bing ? `<meta name="msvalidate.01" content="${escape(seo.verification.bing)}" />` : '',
    `<link rel="canonical" href="${escape(p.url)}" />`,
    `<link rel="alternate" hreflang="ar" href="${escape(p.url)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escape(p.url)}" />`,
    ...previewTags(seo, siteName, p),
    PRERENDER_STYLE,
    jsonLd(graph),
  ].filter(Boolean).join('\n    ');
}

// ─── schema.org data ────────────────────────────────────────────────────────────────────────────

const ids = (seo: SeoSettings) => ({
  business: `${seo.siteUrl}#business`,
  website: `${seo.siteUrl}#website`,
});

/** The company as a local business, with what it offers and who leads it. */
export function businessNode(seo: SeoSettings, profile: Profile): Json {
  const { company, contact, ceo, services, products } = profile;
  const b = seo.business;
  return {
    '@type': b.types.length === 1 ? b.types[0] : [...b.types],
    '@id': ids(seo).business,
    name: company.name.ar,
    alternateName: company.name.en,
    description: seo.description,
    slogan: company.tagline,
    url: seo.siteUrl,
    logo: absolute(seo, seo.logo),
    image: absolute(seo, seo.image.src),
    telephone: contact.phone,
    email: contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact.address,
      addressLocality: b.city,
      addressRegion: b.region,
      addressCountry: b.country,
    },
    geo: b.latitude !== null && b.longitude !== null
      ? { '@type': 'GeoCoordinates', latitude: b.latitude, longitude: b.longitude } : null,
    hasMap: contact.mapUrl,
    openingHours: [...b.openingHours],
    priceRange: b.priceRange,
    foundingDate: b.foundingDate,
    areaServed: [...b.areaServed],
    sameAs: [...seo.social],
    knowsAbout: ['التصميم الداخلي', 'الديكور', 'التأثيث', ...products.items.map((p) => p.name)],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'خدماتنا',
      itemListElement: services.items.map((s) => ({
        '@type': 'Offer', itemOffered: { '@type': 'Service', name: stripStop(s.text) },
      })),
    },
    employee: ceo.name ? {
      '@type': 'Person',
      '@id': `${seo.siteUrl}#ceo`,
      name: ceo.name,
      jobTitle: ceo.role,
      image: ceo.photo.src ? absolute(seo, ceo.photo.src) : null,
    } : null,
  };
}

export function homeGraph(seo: SeoSettings, profile: Profile): Json[] {
  const { business, website } = ids(seo);
  const faq = profile.faq.items;
  return [
    businessNode(seo, profile),
    {
      '@type': 'WebSite', '@id': website, url: seo.siteUrl, name: profile.company.name.ar,
      alternateName: profile.company.name.en, inLanguage: 'ar', publisher: { '@id': business },
    },
    {
      // A page with questions and answers is an FAQPage; the questions are its main content for AI answers.
      '@type': faq.length > 0 ? 'FAQPage' : 'WebPage',
      '@id': `${seo.siteUrl}#webpage`,
      url: seo.siteUrl,
      name: seo.title,
      description: seo.description,
      inLanguage: 'ar',
      isPartOf: { '@id': website },
      about: { '@id': business },
      primaryImageOfPage: { '@type': 'ImageObject', url: absolute(seo, seo.image.src), caption: seo.image.alt },
      mainEntity: faq.map((q) => ({
        '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer },
      })),
    },
  ];
}

/** The business and the site, briefly: inner pages point to the full description on the home page. */
const brandNodes = (seo: SeoSettings, profile: Profile): Json[] => {
  const { business, website } = ids(seo);
  return [
    {
      '@type': seo.business.types.length === 1 ? seo.business.types[0] : [...seo.business.types],
      '@id': business, name: profile.company.name.ar, alternateName: profile.company.name.en,
      url: seo.siteUrl, logo: absolute(seo, seo.logo), telephone: profile.contact.phone,
      address: { '@type': 'PostalAddress', addressLocality: seo.business.city, addressCountry: seo.business.country },
    },
    { '@type': 'WebSite', '@id': website, url: seo.siteUrl, name: profile.company.name.ar },
  ];
};

/** A service page: the service itself, its questions, and the way back home. */
export function serviceGraph(seo: SeoSettings, profile: Profile, service: ServicePage, page: PageMeta): Json[] {
  const { business, website } = ids(seo);
  const serviceId = `${page.url}#service`;
  return [
    ...brandNodes(seo, profile),
    {
      '@type': 'Service',
      '@id': serviceId,
      name: service.heading,
      serviceType: service.name,
      description: service.description,
      url: page.url,
      provider: { '@id': business },
      areaServed: [...seo.business.areaServed],
      image: service.images.map((i) => absolute(seo, i.src)),
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: service.heading,
        itemListElement: service.offers.map((o) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: o } })),
      },
    },
    {
      '@type': service.faq.length > 0 ? 'FAQPage' : 'WebPage',
      '@id': `${page.url}#webpage`,
      url: page.url,
      name: page.title,
      description: page.description,
      inLanguage: 'ar',
      isPartOf: { '@id': website },
      about: { '@id': serviceId },
      breadcrumb: { '@id': `${page.url}#breadcrumb` },
      primaryImageOfPage: service.images[0]
        ? { '@type': 'ImageObject', url: absolute(seo, service.images[0].src), caption: service.images[0].caption } : null,
      mainEntity: service.faq.map((q) => ({
        '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${page.url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: profile.company.name.ar, item: seo.siteUrl },
        { '@type': 'ListItem', position: 2, name: 'خدماتنا', item: `${seo.siteUrl}services.html` },
        { '@type': 'ListItem', position: 3, name: service.name, item: page.url },
      ],
    },
  ];
}

/** One of the main pages: what it is, and the way back home. */
export function pageGraph(seo: SeoSettings, profile: Profile, label: string, page: PageMeta): Json[] {
  const { business, website } = ids(seo);
  return [
    ...brandNodes(seo, profile),
    {
      '@type': 'WebPage', '@id': `${page.url}#webpage`, url: page.url, name: page.title,
      description: page.description, inLanguage: 'ar', isPartOf: { '@id': website }, about: { '@id': business },
      breadcrumb: { '@id': `${page.url}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${page.url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: profile.company.name.ar, item: seo.siteUrl },
        { '@type': 'ListItem', position: 2, name: label, item: page.url },
      ],
    },
  ];
}

export function catalogueGraph(seo: SeoSettings, profile: Profile, villa: Villa, page: PageMeta): Json[] {
  const { business, website } = ids(seo);
  return [
    ...brandNodes(seo, profile),
    {
      '@type': 'CollectionPage',
      '@id': `${page.url}#webpage`,
      url: page.url,
      name: page.title,
      description: page.description,
      inLanguage: 'ar',
      isPartOf: { '@id': website },
      publisher: { '@id': business },
      breadcrumb: { '@id': `${page.url}#breadcrumb` },
      primaryImageOfPage: { '@type': 'ImageObject', url: absolute(seo, villa.cover.src), caption: villa.cover.caption },
      keywords: page.keywords.join('، '),
      mainEntity: {
        '@type': 'ItemList',
        name: `قطع ${villa.name.ar}`,
        numberOfItems: villa.products.length,
        itemListElement: villa.products.map((p, i) => ({
          '@type': 'ListItem', position: i + 1, name: p.name, description: p.text, image: absolute(seo, p.card),
        })),
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${page.url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: profile.company.name.ar, item: seo.siteUrl },
        { '@type': 'ListItem', position: 2, name: villa.name.ar, item: page.url },
      ],
    },
  ];
}

// ─── page text for crawlers ─────────────────────────────────────────────────────────────────────

const t = (s: string): string => escape(s);
const list = (tag: 'ul' | 'ol', items: readonly string[]): string =>
  items.length > 0 ? `<${tag}>${items.map((i) => `<li>${t(i)}</li>`).join('')}</${tag}>` : '';
const section = (title: string, ...body: string[]): string =>
  `<section><h2>${t(title)}</h2>${body.join('')}</section>`;
const p = (s: string | null): string => (s ? `<p>${t(s)}</p>` : '');

/** The profile's text as plain HTML: what the page says, without the photos and motion. */
export function homePrerender(profile: Profile): string {
  const { company, ceo, services, advantages, levels, clients, faq, contact, catalogues } = profile;
  const contactLines = [
    contact.phone && `الجوال: ${contact.phone}`,
    contact.email && `البريد الإلكتروني: ${contact.email}`,
    contact.website && `الموقع الإلكتروني: ${contact.website}`,
    contact.address && `العنوان: ${contact.address}، المملكة العربية السعودية`,
  ].filter((l): l is string => Boolean(l));
  return `<div class="prerender">${[
    `<header><h1>${t(company.name.ar)} | ${t(company.name.en)}</h1>${p(`${company.entityType} ${company.field}`)}${p(company.tagline)}</header>`,
    section('من نحن', p(company.about.lead), ...company.about.paragraphs.map(p),
      ...company.statements.map((s) => `<h3>${t(s.title)}</h3>${p(s.text)}`)),
    section(ceo.title,
      ceo.quote ? `<blockquote>${p(ceo.quote)}</blockquote>` : '',
      ...ceo.message.map(p),
      p(ceo.name ? `${ceo.name}، ${ceo.role}` : ceo.role)),
    section('خدماتنا', p(services.intro), list('ul', services.items.map((s) => s.text)), p(services.note),
      profile.servicePages.length > 0 ? `<ul>${profile.servicePages.map((s) =>
        `<li><a href="./services/${escape(s.slug)}.html">${t(s.heading)}</a></li>`).join('')}</ul>` : ''),
    section('التصميم الداخلي', p(company.interiorDesign.intro), list('ul', company.interiorDesign.traits)),
    section(`لماذا ${company.name.ar}؟`, ...advantages.items.map((a) => `<h3>${t(a.title)}</h3>${p(a.text)}`)),
    section('مستويات التعامل', p(levels.intro), list('ol', levels.items)),
    catalogues.length > 0 ? section('كتالوجات المشاريع', `<ul>${catalogues.map((c) =>
      `<li><a href="./${escape(c.href)}">${t(c.name.ar)}</a>: ${t(c.tagline)}</li>`).join('')}</ul>`) : '',
    section('عملاؤنا', ...clients.segments.map((s) => `<h3>${t(s.title)}</h3>${p(s.text)}`)),
    faq.items.length > 0 ? section('الأسئلة الشائعة', p(faq.intro),
      ...faq.items.map((q) => `<h3>${t(q.question)}</h3>${p(q.answer)}`)) : '',
    section('تواصل معنا', list('ul', contactLines)),
  ].join('')}</div>`;
}

/** A catalogue's text as plain HTML: its story, spaces, pieces and materials. */
export function cataloguePrerender(villa: Villa): string {
  const material = new Map(villa.materials.map((m) => [m.id, m.name]));
  return `<div class="prerender">${[
    section(villa.kicker, p(villa.intro.lead), ...villa.intro.paragraphs.map(p)),
    section('المساحات', ...villa.spaces.map((s) => `<h3>${t(s.name)}</h3>${p(s.intro)}`)),
    section('القطع', p(villa.collection.intro), ...villa.products.map((x) => [
      `<h3>${t(x.name)}</h3>`,
      p(`${x.category}${x.custom ? '، مصنوعة حسب المقاس' : ''}`),
      p(x.text),
      p(`الخامات: ${x.materials.map((id) => material.get(id) ?? id).join('، ')}. التشطيب: ${x.finish}`),
    ].join(''))),
    section('الخامات', list('ul', villa.materials.map((m) => `${m.name}: ${m.note}`))),
    section(villa.closing.title, p(villa.closing.text), `<p><a href="./projects.html">${t('كل مشاريع النظرة الساحرة')}</a></p>`),
  ].join('')}</div>`;
}

// ─── site files ─────────────────────────────────────────────────────────────────────────────────

export interface SitemapPage { readonly url: string; readonly image: string | null }

export const sitemap = (pages: readonly SitemapPage[], lastmod: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map((pg) => `  <url>
    <loc>${escape(pg.url)}</loc>
    <lastmod>${lastmod}</lastmod>${pg.image ? `
    <image:image><image:loc>${escape(pg.image)}</image:loc></image:image>` : ''}
  </url>`).join('\n')}
</urlset>
`;

/** Crawlers of AI assistants, named so each can be allowed or refused in one place. */
export const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot',
] as const;

export const robots = (seo: SeoSettings): string => [
  '# Search engines are welcome to read every page.',
  'User-agent: *',
  'Allow: /',
  '',
  seo.aiCrawlers
    ? '# AI assistants are welcome too, so they can answer questions about Magic Look and cite this site.'
    : '# AI assistants are asked not to read this site (seo.json: "aiCrawlers": false).',
  ...AI_CRAWLERS.map((bot) => `User-agent: ${bot}`),
  seo.aiCrawlers ? 'Allow: /' : 'Disallow: /',
  '',
  `Sitemap: ${seo.siteUrl}sitemap.xml`,
  '',
].join('\n');

/** llms.txt (llmstxt.org): a plain summary of the company that AI assistants can read in one go. */
export function llmsTxt(seo: SeoSettings, profile: Profile): string {
  const { company, services, products, levels, journey, clients, faq, contact, catalogues, ceo } = profile;
  const lines = [
    `# ${company.name.ar} | ${company.name.en}`,
    '',
    `> ${seo.description}`,
    '',
    company.about.lead,
    '',
    ...company.about.paragraphs.flatMap((x) => [x, '']),
    ...company.statements.flatMap((s) => [`**${s.title}:** ${s.text}`, '']),
    `## ${ceo.title}`,
    '',
    ...(ceo.quote ? [`> ${ceo.quote}`, ''] : []),
    ...ceo.message.flatMap((x) => [x, '']),
    `— ${ceo.name ? `${ceo.name}، ` : ''}${ceo.role}`,
    '',
    '## الخدمات',
    '',
    ...services.items.map((s) => `- ${s.text}`),
    '',
    ...(profile.servicePages.length > 0 ? [
      '## صفحات الخدمات',
      '',
      ...profile.servicePages.map((s) => `- [${s.heading}](${absolute(seo, `services/${s.slug}.html`)}): ${s.description}`),
      '',
    ] : []),
    '## صفحات الموقع',
    '',
    `- [الخدمات](${absolute(seo, 'services.html')})`,
    `- [المقاولات وتنفيذ المشاريع](${absolute(seo, 'contracting.html')})`,
    `- [المشاريع](${absolute(seo, 'projects.html')})`,
    `- [تواصل معنا](${absolute(seo, 'contact.html')})`,
    '',
    '## المنتجات',
    '',
    products.intro,
    '',
    ...products.items.map((x) => `- ${x.name}`),
    '',
    '## مستويات التعامل',
    '',
    ...levels.items.map((x) => `- ${x}`),
    '',
    '## رحلة العمل',
    '',
    ...journey.steps.map((x, i) => `${i + 1}. ${x}`),
    '',
    '## العملاء',
    '',
    ...clients.segments.map((s) => `- **${s.title}:** ${s.text}`),
    '',
    '## كتالوجات المشاريع',
    '',
    `- [الملف التعريفي](${seo.siteUrl}): ${company.tagline}`,
    ...catalogues.map((c) => `- [${c.name.ar}](${absolute(seo, c.href)}): ${c.tagline} (${c.spaces} مساحات، ${c.pieces} قطعة، ${c.materials} خامات)`),
    '',
    ...(faq.items.length > 0 ? ['## الأسئلة الشائعة', '', ...faq.items.flatMap((q) => [`### ${q.question}`, '', q.answer, ''])] : []),
    '## التواصل',
    '',
    ...[
      contact.phone && `- الجوال: ${contact.phone}`,
      contact.email && `- البريد الإلكتروني: ${contact.email}`,
      contact.website && `- الموقع الإلكتروني: ${contact.website}`,
      contact.whatsapp && `- واتساب: https://wa.me/${contact.whatsapp}`,
      contact.handle && `- الحساب: ${contact.handle}`,
      contact.address && `- العنوان: ${contact.address}، المملكة العربية السعودية`,
      contact.mapUrl && `- الخريطة: ${contact.mapUrl}`,
      ...seo.social.map((s) => `- ${s}`),
    ].filter((l): l is string => Boolean(l)),
    `- الموقع: ${seo.siteUrl}`,
    '',
  ];
  return lines.join('\n');
}

// ─── the Vite plugin ────────────────────────────────────────────────────────────────────────────

interface SiteData { readonly seo: SeoSettings; readonly profile: Profile }

/** Special wording for pages whose preview should say more than their tagline. */
const PAGE_OVERRIDES: Record<string, Partial<Pick<PageMeta, 'description' | 'alt'>>> = {
  'villa-wood.html': {
    description: 'كتالوج تفصيلي لفيلا الخشب: ثلاث مساحات، وست عشرة قطعة، وتسع خامات طبيعية من البلوط والترافرتين والكتان.',
    alt: 'الصالة العائلية في فيلا الخشب: جدار من البلوط وثريا من الجوت',
  },
};

export function seoPlugin(root: string): Plugin {
  const dataDir = resolve(root, 'public/data');
  const readJson = (file: string): unknown => JSON.parse(readFileSync(resolve(dataDir, file), 'utf8'));
  const fromDisk: JsonFetcher = async (file) => readJson(file);

  // Read fresh each time, so edits to the data show on the next reload in development.
  const load = async (): Promise<SiteData> => ({
    seo: seoDecoder(readJson('seo.json'), 'seo.json'),
    profile: await new JsonProfileRepository(fromDisk).load(),
  });

  const catalogueMeta = (seo: SeoSettings, profile: Profile, villa: Villa, href: string): PageMeta => {
    const card = profile.catalogues.find((c) => c.href === href);
    const override = PAGE_OVERRIDES[href] ?? {};
    return {
      title: `${villa.name.ar} | ${profile.company.name.ar}`,
      description: override.description ?? card?.tagline ?? villa.tagline,
      url: absolute(seo, href),
      image: absolute(seo, `og/${href.replace(/\.html$/, '')}.jpg`),
      alt: override.alt ?? villa.cover.caption,
      keywords: [
        villa.name.ar, profile.company.name.ar, profile.company.name.en,
        ...villa.products.map((x) => x.category), ...villa.materials.map((m) => m.name),
        'تصميم داخلي', 'أثاث حسب المقاس',
      ],
    };
  };

  return {
    name: 'magic-look-seo',

    async transformIndexHtml(html, ctx) {
      const { seo, profile } = await load();
      const file = basename(ctx.filename);
      const siteName = `${profile.company.name.ar} | ${profile.company.name.en}`;

      const key = /<body[^>]*data-page="([a-z]+)"/.exec(html)?.[1];
      if (key && key in PAGE_FILES) {
        const site = loadSite(root);
        const inner = key === 'home' ? null : pageMeta(site, key as Exclude<PageKey, 'home'>);
        const page: PageMeta = {
          title: inner?.title ?? seo.title,
          description: inner?.description ?? seo.description,
          url: key === 'home' ? seo.siteUrl : absolute(seo, PAGE_FILES[key as PageKey]),
          image: absolute(seo, seo.image.src), alt: seo.image.alt, keywords: seo.keywords,
        };
        const graph = inner ? pageGraph(seo, profile, inner.heading, page) : homeGraph(seo, profile);
        return html
          .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(page.description)}" />`)
          .replace(/<title>[^<]*<\/title>/, `<title>${escape(page.title)}</title>\n    ${headTags(seo, siteName, page, graph)}`)
          .replace(/(<div id="app"[^>]*>)/, (m) => `${m}${homePrerender(profile)}`);
      }

      const serviceSlug = /<body[^>]*data-service="([^"]+)"/.exec(html)?.[1];
      if (serviceSlug) {
        const service = profile.servicePages.find((s) => s.slug === serviceSlug);
        if (!service) return html;
        const page: PageMeta = {
          title: service.title,
          description: service.description,
          url: absolute(seo, `services/${service.slug}.html`),
          // Messaging apps read JPEG previews most reliably; the page's own photos go in the schema data.
          image: absolute(seo, seo.image.src),
          alt: seo.image.alt,
          keywords: [...service.keywords, profile.company.name.ar, profile.company.name.en],
        };
        return html.replace('</title>', `</title>\n    ${headTags(seo, siteName, page, serviceGraph(seo, profile, service, page))}`);
      }

      if (!html.includes('id="villa-content"')) return html;
      const dataFile = /<body[^>]*data-catalogue="([^"]+)"/.exec(html)?.[1] ?? 'villa-wood.json';
      const villa = villaDecoder(readJson(dataFile), dataFile);
      const page = catalogueMeta(seo, profile, villa, file);
      return html
        .replace('</title>', `</title>\n    ${headTags(seo, siteName, page, catalogueGraph(seo, profile, villa, page))}`)
        .replace(/(<div id="villa-content"[^>]*>)/, `$1${cataloguePrerender(villa)}`);
    },

    async generateBundle() {
      const { seo, profile } = await load();
      const today = new Date().toISOString().slice(0, 10);

      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots(seo) });
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsTxt(seo, profile) });
      this.emitFile({
        type: 'asset', fileName: 'sitemap.xml', source: sitemap([
          { url: seo.siteUrl, image: absolute(seo, seo.image.src) },
          ...(['services', 'contracting', 'projects', 'contact'] as const).map((k) => ({ url: absolute(seo, PAGE_FILES[k]), image: null })),
          ...profile.servicePages.map((s) => ({
            url: absolute(seo, `services/${s.slug}.html`),
            image: s.images[0] ? absolute(seo, s.images[0].src) : null,
          })),
          ...profile.catalogues.map((c) => ({ url: absolute(seo, c.href), image: absolute(seo, c.cover.src) })),
        ], today),
      });

      // A small page per product photo at s/<id>/: crawlers ignore "#id" and do not run scripts,
      // so each product needs its own URL for its link preview. People who open it are sent on.
      const siteName = `${profile.company.name.ar} | ${profile.company.name.en}`;
      const { site } = loadSite(root);
      profile.company.collections.forEach((c, i) => c.items.forEach((item, j) => {
        const id = `collection-${i + 1}-${j + 1}`;
        if (!existsSync(resolve(root, `public/og/${id}.jpg`))) return;
        const href = collectionHref(site, i + 1, j + 1);
        const target = `../../${href}`;
        const title = `${item.title} | ${profile.company.name.ar}`;
        const meta: PageMeta = {
          title, description: item.image.caption, url: `${seo.siteUrl}s/${id}/`,
          image: absolute(seo, `og/${id}.jpg`), alt: item.image.caption, keywords: [],
        };
        this.emitFile({
          type: 'asset', fileName: `s/${id}/index.html`, source: `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(item.image.caption)}" />
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${absolute(seo, href)}" />
    ${previewTags(seo, siteName, meta).join('\n    ')}
    <meta http-equiv="refresh" content="0; url=${target}" />
    <script>location.replace(${JSON.stringify(target)})</script>
  </head>
  <body>
    <p><a href="${target}">${escape(item.title)}</a></p>
  </body>
</html>
`,
        });
      }));
    },
  };
}
