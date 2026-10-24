import type { Profile } from '../domain/entities';
import { initJourneyFill } from './behaviors/journeyFill';
import { initNavState } from './behaviors/navState';
import { initReveal } from './behaviors/reveal';
import { initMediaPlayback } from './behaviors/mediaPlayback';
import { initScrollProgress } from './behaviors/scrollProgress';
import { scrollToHash } from './behaviors/share';
import { About } from './components/About';
import { Advantages } from './components/Advantages';
import { Clients } from './components/Clients';
import { CollectionSection } from './components/CollectionSection';
import { Contact } from './components/Contact';
import { FilmSection } from './components/FilmSection';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Journey } from './components/Journey';
import { Levels } from './components/Levels';
import { Nav, type NavLink } from './components/Nav';
import { Products } from './components/Products';
import { Services } from './components/Services';
import { h } from './dom';

const NAV_LINKS: readonly NavLink[] = [
  { id: 'about', label: 'من نحن' },
  { id: 'services', label: 'خدماتنا' },
  { id: 'products', label: 'منتجاتنا' },
  { id: 'journey', label: 'رحلة العمل' },
  { id: 'collection-1', label: 'أعمالنا' },
  { id: 'contact', label: 'تواصل معنا' },
];

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
    About(company, next()),
    film(0),
    collection(8),
    collection(11),
    Services(profile.services, next()),
    collection(0),
    Products(profile.products, next()),
    collection(5),
    film(1),
    Advantages(profile.advantages, company, next()),
    collection(7),
    collection(1),
    Journey(profile.journey, next()),
    collection(2),
    collection(9),
    Levels(profile.levels, next()),
    collection(4),
    collection(10),
    film(2),
    collection(6),
    film(3),
    ...company.films.slice(4).map((f, i) => FilmSection(f, i + 4)),
    collection(3),
    ...company.collections.slice(12).map((c, i) => CollectionSection(c, i + 12)),
    Clients(profile.clients, next()),
    Contact(company, profile.contact));

  root.replaceChildren(Nav(company, NAV_LINKS), main, Footer(company));
  document.title = `${company.name.ar} | ${company.name.en}`;

  initNavState(document.getElementById('nav'));
  initReveal(root);
  initMediaPlayback(root);
  initScrollProgress(root);
  initJourneyFill(document.getElementById('track'));
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
