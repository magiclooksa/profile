/**
 * search-index.json: everything the site search can find, gathered from public/data at build time.
 * In development the same index is served fresh on every request, so data edits show at once.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { SearchDoc } from '../src/domain/search';
import type { Villa } from '../src/domain/villa';
import {
  cataloguesDecoder, companyDecoder, faqDecoder, productsDecoder, servicePagesDecoder,
} from '../src/infrastructure/schemas';
import { villaDecoder } from '../src/infrastructure/villaSchema';

/** Where a catalogue page keeps its data: the villa at the top, every project in projects/. */
export const catalogueDataFile = (href: string): string =>
  href === 'villa-wood.html' ? 'villa-wood.json' : `projects/${href.replace(/\.html$/, '')}.json`;

const short = (s: string, max = 420): string => (s.length > max ? `${s.slice(0, max)}…` : s);

/** The pieces, rooms and story of one catalogue. */
export function catalogueDocs(href: string, v: Villa): SearchDoc[] {
  const material = new Map(v.materials.map((m) => [m.id, m]));
  const space = new Map(v.spaces.map((s) => [s.id, s]));
  return [
    {
      id: `cat:${href}`,
      kind: 'catalogue',
      title: v.name.ar,
      subtitle: v.kicker,
      text: short([v.tagline, v.intro.lead, ...v.intro.paragraphs].join(' ')),
      keywords: [
        v.name.en, v.place, ...v.intro.words.flatMap((w) => [w.ar, w.en]),
        ...new Set(v.products.map((p) => p.category)), ...v.materials.map((m) => m.name),
      ],
      href,
      image: v.cover.src,
    },
    ...v.spaces.map((s): SearchDoc => ({
      id: `space:${href}:${s.id}`,
      kind: 'space',
      title: s.name,
      subtitle: v.name.ar,
      text: short(s.intro),
      keywords: [s.en],
      href: `${href}#space-${s.id}`,
      image: s.look.image.src,
    })),
    ...v.products.map((p): SearchDoc => ({
      id: `piece:${href}:${p.id}`,
      kind: 'piece',
      title: p.name,
      subtitle: `${p.category} · ${v.name.ar}`,
      text: short(`${p.text} ${p.finish}`),
      keywords: [
        p.en, p.category,
        ...p.materials.flatMap((id) => { const m = material.get(id); return m ? [m.name, m.en] : [] }),
        ...p.spaces.map((id) => space.get(id)?.name ?? ''),
        ...(p.custom ? ['تفصيل حسب المقاس'] : []),
      ].filter(Boolean),
      href: `${href}#piece-${p.id}`,
      image: p.card,
    })),
  ];
}

export function buildSearchIndex(root: string): SearchDoc[] {
  const read = (file: string): unknown => JSON.parse(readFileSync(resolve(root, 'public/data', file), 'utf8'));
  const company = companyDecoder(read('company.json'), 'company.json');
  const products = productsDecoder(read('products.json'), 'products.json');
  const faq = faqDecoder(read('faq.json'), 'faq.json');
  const services = servicePagesDecoder(read('service-pages.json'), 'service-pages.json');
  const catalogues = cataloguesDecoder(read('catalogues.json'), 'catalogues.json');

  const docs: SearchDoc[] = [];

  for (const c of catalogues) {
    const file = catalogueDataFile(c.href);
    if (!existsSync(resolve(root, 'public/data', file))) continue;
    docs.push(...catalogueDocs(c.href, villaDecoder(read(file), file)));
  }

  for (const s of services) {
    docs.push({
      id: `service:${s.slug}`,
      kind: 'service',
      title: s.heading,
      subtitle: `خدمة · ${s.kicker}`,
      text: short([s.lead, ...s.paragraphs].join(' ')),
      keywords: [s.name, ...s.keywords, ...s.offers],
      href: `services/${s.slug}.html`,
      image: s.images[0]?.src ?? null,
    });
    s.faq.forEach((q, i) => docs.push({
      id: `faq:${s.slug}:${i}`, kind: 'faq', title: q.question, subtitle: `أسئلة عن ${s.name}`,
      text: q.answer, keywords: [s.name], href: `services/${s.slug}.html#sp-faq-title`, image: null,
    }));
  }

  // Photos of our work on the profile, each with its own address (collection-<section>-<item>).
  company.collections.forEach((c, i) => c.items.forEach((item, j) => docs.push({
    id: `work:${i + 1}-${j + 1}`,
    kind: 'work',
    title: item.title,
    subtitle: c.title,
    text: short(`${item.image.caption}. ${c.text}`),
    keywords: [c.kicker, item.tag ?? '', ...(item.palette ?? []).map((p) => p.name), ...(item.spots ?? []).map((s) => s.title)]
      .filter(Boolean),
    href: `index.html#collection-${i + 1}-${j + 1}`,
    image: item.image.src,
  })));

  for (const p of products.items) {
    docs.push({
      id: `category:${p.name}`, kind: 'category', title: p.name, subtitle: 'منتجاتنا',
      text: products.intro, keywords: [], href: 'index.html#products', image: null,
    });
  }

  faq.items.forEach((q, i) => docs.push({
    id: `faq:home:${i}`, kind: 'faq', title: q.question, subtitle: 'الأسئلة الشائعة',
    text: q.answer, keywords: [], href: 'index.html#faq', image: null,
  }));

  const section = (id: string, title: string, text: string, keywords: string[]): SearchDoc => ({
    id: `section:${id}`, kind: 'section', title, subtitle: company.name.ar, text: short(text), keywords,
    href: `index.html#${id}`, image: null,
  });
  docs.push(
    section('about', 'من نحن', `${company.about.lead} ${company.about.paragraphs.join(' ')}`, ['نبذة', 'المؤسسة', 'رؤيتنا', 'رسالتنا', 'about']),
    section('ceo', 'كلمة الرئيس التنفيذي', 'كلمة الرئيس التنفيذي للنظرة الساحرة', ['المدير', 'الرئيس التنفيذي', 'ceo']),
    section('services', 'خدماتنا', 'التصميم الداخلي والديكور والتأثيث', ['خدمات', 'services']),
    section('journey', 'رحلة العمل معنا', 'خطوات العمل من التواصل الأولي حتى التسليم وخدمة ما بعد البيع', ['خطوات', 'مراحل', 'تنفيذ', 'تسليم', 'ما بعد البيع']),
    section('levels', 'مستويات التعامل', 'شراء قطعة، أو تطوير جزء من غرفة، أو تصميم غرفة كاملة، أو تأثيث مساحة كاملة', ['أسعار', 'باقات', 'مستويات']),
    section('clients', 'عملاؤنا', 'الأفراد والأعمال وقطاع المشاريع', ['عملاء', 'شركاء', 'شهادات']),
    section('contact', 'تواصل معنا', 'الجوال والبريد الإلكتروني وموقع المعرض', ['تواصل', 'جوال', 'رقم', 'واتساب', 'عنوان', 'موقع', 'المعرض', 'contact']),
  );

  return docs;
}

export function searchIndexPlugin(root: string): Plugin {
  return {
    name: 'magic-look-search-index',
    configureServer(server) {
      server.middlewares.use('/search-index.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(buildSearchIndex(root)));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'search-index.json', source: JSON.stringify(buildSearchIndex(root)) });
    },
  };
}
