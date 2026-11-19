import type { Profile } from '../../domain/entities';
import { initNavState } from './behaviors/navState';
import { initReveal } from './behaviors/reveal';
import { initMediaPlayback } from './behaviors/mediaPlayback';
import { initScrollProgress } from './behaviors/scrollProgress';
import { scrollToHash } from './behaviors/share';
import { Advantages } from './components/Advantages';
import { Faq } from './components/Faq';
import { Clients } from './components/Clients';
import { CollectionSection } from './components/CollectionSection';
import { FilmSection } from './components/FilmSection';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Nav, type NavLink } from './components/Nav';
import { h } from '../shared/dom';
import { createSiteSearch } from './search/SearchPanel';

const NAV_LINKS: readonly NavLink[] = [
  { href: '#top', label: 'الرئيسية' },
  { href: 'about.html', label: 'من نحن' },
  { href: 'services.html', label: 'الخدمات' },
  { href: 'contracting.html', label: 'المقاولات' },
  { href: 'projects.html', label: 'المشاريع' },
  { href: 'contact.html', label: 'تواصل معنا' },
];

/** Sections that moved off this page: links people already shared still reach them. */
function followMovedSection(): void {
  const id = decodeURIComponent(location.hash.slice(1));
  const moved: Readonly<Record<string, string>> = {
    about: 'about.html', projects: 'projects.html', services: 'services.html', levels: 'services.html#levels', ceo: 'about.html#ceo', contact: 'contact.html', products: 'services.html#products', journey: 'services.html#journey',
  };
  const collection = /^collection-(\d+)(?:-\d+)?$/.exec(id)?.[1];
  const service = collection ? MOVED_COLLECTIONS[Number(collection)] : undefined;
  const target = moved[id] ?? (service ? `services/${service}.html#${id}` : null);
  if (target) location.replace(target);
}

/** Photo collections (numbered from 1) shown only on a service page now, and that page. */
const MOVED_COLLECTIONS: Readonly<Record<number, string>> = {
  4: 'kitchens-cabinets', 5: 'custom-sofas', 6: 'custom-sofas', 7: 'custom-sofas', 8: 'custom-sofas',
  9: 'tv-wall-units', 10: 'tv-wall-units', 11: 'custom-sofas', 15: 'custom-sofas',
};

/** Builds the whole page from the profile and wires its behaviours. */
export function renderApp(root: HTMLElement, profile: Profile): void {
  const { company } = profile;
  let n = 0;
  const next = (): number => ++n;

  // Films are spread through the page, each in the slot below (missing ones are skipped).
  const film = (i: number): HTMLElement | null => {
    const f = company.films[i];
    return f ? FilmSection(f, i) : null;
  };

  const collection = (i: number): HTMLElement | null => {
    const c = company.collections[i];
    return c ? CollectionSection(c, i) : null;
  };

  const main = h('main', {},
    Hero(company),
    collection(11),
    collection(15),
    collection(13),
    collection(0),
    collection(12),
    film(1),
    Advantages(profile.advantages, company, next()),
    collection(1),
    collection(2),
    film(2),
    ...company.films.slice(4).map((f, i) => FilmSection(f, i + 4)),
    ...company.collections.slice(17).map((c, i) => CollectionSection(c, i + 17)),
    Clients(profile.clients, next()),
    Faq(profile.faq, next()));

  const search = createSiteSearch('./');
  root.replaceChildren(Nav(company, NAV_LINKS, search.button), main, Footer({
    name: company.name,
    tagline: company.tagline,
    home: '#top',
    top: '#top',
    links: [
      ...NAV_LINKS,
      { href: 'about.html#ceo', label: profile.ceo.title },
      ...(profile.faq.items.length > 0 ? [{ href: '#faq', label: 'الأسئلة الشائعة' }] : []),
      ...(company.feature ? [{ href: company.feature.href, label: `كتالوج ${company.feature.title}` }] : []),
    ],
    contact: profile.contact,
    contactHref: 'contact.html',
  }));
  // The <title> is written at build time from data/seo.json; keep it, search engines read the rendered one.

  initNavState(document.getElementById('nav'));
  initReveal(root);
  initMediaPlayback(root);
  initScrollProgress(root);
  followMovedSection();
  scrollToHash();
}

export function renderError(root: HTMLElement, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  root.replaceChildren(
    h('div', { class: 'load-error', role: 'alert' },
      h('h1', {}, 'تعذّر عرض الملف التعريفي'),
      h('p', {}, message),
      h('p', {}, 'راجع ملفات البيانات في مجلد public/data ثم أعد تحميل الصفحة.')));
}
