import type { Profile } from '../domain/entities';
import { initJourneyFill } from './behaviors/journeyFill';
import { initNavState } from './behaviors/navState';
import { initReveal } from './behaviors/reveal';
import { About } from './components/About';
import { Advantages } from './components/Advantages';
import { Clients } from './components/Clients';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { InteriorDesign } from './components/InteriorDesign';
import { Journey } from './components/Journey';
import { Levels } from './components/Levels';
import { Nav, type NavLink } from './components/Nav';
import { Products } from './components/Products';
import { Projects } from './components/Projects';
import { Services } from './components/Services';
import { h } from './dom';

const NAV_LINKS: readonly NavLink[] = [
  { id: 'about', label: 'من نحن' },
  { id: 'services', label: 'خدماتنا' },
  { id: 'products', label: 'منتجاتنا' },
  { id: 'journey', label: 'رحلة العمل' },
  { id: 'works', label: 'أعمالنا' },
  { id: 'contact', label: 'تواصل معنا' },
];

/** Builds the whole page from the profile and wires its behaviours. */
export function renderApp(root: HTMLElement, profile: Profile): void {
  const { company } = profile;
  let n = 0;
  const next = (): number => ++n;

  const main = h('main', {},
    Hero(company),
    About(company, next()),
    Services(profile.services, next()),
    Products(profile.products, next()),
    Advantages(profile.advantages, company, next()),
    Journey(profile.journey, next()),
    Levels(profile.levels, next()),
    profile.projects.length > 0 ? Projects(profile.projects, next()) : null,
    InteriorDesign(company),
    Clients(profile.clients, next()),
    Contact(company, profile.contact));

  root.replaceChildren(Nav(company, NAV_LINKS), main, Footer(company));
  document.title = `${company.name.ar} | ${company.name.en}`;

  initNavState(document.getElementById('nav'));
  initReveal(root);
  initJourneyFill(document.getElementById('track'));
}

export function renderError(root: HTMLElement, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  root.replaceChildren(
    h('div', { class: 'load-error', role: 'alert' },
      h('h1', {}, 'تعذّر عرض الملف التعريفي'),
      h('p', {}, message),
      h('p', {}, 'راجع ملفات البيانات في مجلد public/data ثم أعد تحميل الصفحة.')));
}
