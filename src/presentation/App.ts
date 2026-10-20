import type { Profile } from '../domain/entities';
import { initCursor } from './behaviors/cursor';
import { initJourneyFill } from './behaviors/journeyFill';
import { initMagnetic } from './behaviors/magnetic';
import { initMediaPlayback } from './behaviors/mediaPlayback';
import { initMenu } from './behaviors/menu';
import { initNavState } from './behaviors/navState';
import { initReveal } from './behaviors/reveal';
import { initScrollFx } from './behaviors/scrollFx';
import { initSmoothScroll } from './behaviors/smoothScroll';
import { About } from './components/About';
import { Advantages } from './components/Advantages';
import { Clients } from './components/Clients';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { Hero, Reel } from './components/Hero';
import { InteriorDesign } from './components/InteriorDesign';
import { Journey } from './components/Journey';
import { Levels } from './components/Levels';
import { Menu, Nav, type NavLink } from './components/Nav';
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
    Reel(company),
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

  const nav = Nav(company, NAV_LINKS);
  const footer = Footer(company);
  root.replaceChildren(nav, Menu(company, NAV_LINKS), main, footer);
  root.removeAttribute('aria-busy');
  document.title = `${company.name.ar} | ${company.name.en}`;

  initSmoothScroll();
  initNavState(nav);
  initMenu(document.querySelector<HTMLButtonElement>('#menu-btn'), document.getElementById('site-menu'),
    [main, footer, nav.querySelector<HTMLElement>('.brand'), nav.querySelector<HTMLElement>('.nav-links')]);
  initReveal(root);
  initScrollFx(root);
  initMagnetic(root);
  initCursor();
  initMediaPlayback(root);
  initJourneyFill(document.getElementById('track'));
}

export function renderError(root: HTMLElement, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  root.removeAttribute('aria-busy');
  root.replaceChildren(
    h('div', { class: 'load-error', role: 'alert' },
      h('h1', {}, 'تعذّر عرض الملف التعريفي'),
      h('p', {}, message),
      h('p', {}, 'راجع ملفات البيانات في مجلد public/data ثم أعد تحميل الصفحة.')));
}
