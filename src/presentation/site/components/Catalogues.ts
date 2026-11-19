import type { CatalogueCard, Feature } from '../../../domain/entities';
import { h } from '../../shared/dom';
import { MATERIALS, PIECES, SPACES, plural } from '../villa/parts';
import { FeatureLink } from './FeatureHero';

const titleCase = (s: string): string => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** A catalogue card in the same shape as the featured banner, so every slide shares its design. */
const asFeature = (c: CatalogueCard): Feature => ({
  kicker: c.kicker,
  title: c.name.ar,
  en: titleCase(c.name.en),
  text: c.tagline,
  cta: 'افتح الكتالوج',
  href: c.href,
  facts: [plural(c.spaces, SPACES), plural(c.pieces, PIECES), plural(c.materials, MATERIALS), c.film ? 'فيديو' : ''].filter(Boolean),
  image: { src: c.cover.src, caption: c.cover.caption },
  pages: c.pages,
});

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Every project catalogue as a full-width carousel under the hero that turns by itself, each slide
 * in the featured-banner design. The featured project comes first, with its own banner copy.
 * It pauses while the pointer or keyboard focus is on it, while it is off screen or the tab is
 * hidden, and never turns by itself when the reader prefers reduced motion.
 */
export function Catalogues(all: readonly CatalogueCard[], feature?: Feature | null): HTMLElement | null {
  const cards = feature
    ? [...all.filter((c) => c.href === feature.href), ...all.filter((c) => c.href !== feature.href)]
    : all;
  if (cards.length === 0) return null;
  const section = h('section', { class: 'feature catalogues', id: 'projects', 'aria-label': 'كتالوجات المشاريع' });

  const total = cards.length;
  const slides = cards.map((c, i) => h('div', {
    class: 'cat-slide', role: 'group', 'aria-roledescription': 'شريحة', 'aria-label': `${i + 1} من ${total}: ${c.name.ar}`,
  }, FeatureLink(c.href === feature?.href ? feature : asFeature(c), { heading: 'h2', lazy: i > 0 })));

  const dots = cards.map((c, i) => h('button', {
    class: 'cat-dot', type: 'button', 'aria-label': `المشروع ${i + 1}: ${c.name.ar}`,
  }, h('i', { 'aria-hidden': 'true' })));
  const counter = h('span', { class: 'cat-count latin', 'aria-hidden': 'true' });
  const prev = h('button', { class: 'cat-arrow', type: 'button', 'aria-label': 'المشروع السابق' }, '→');
  const next = h('button', { class: 'cat-arrow', type: 'button', 'aria-label': 'المشروع التالي' }, '←');
  const toggle = h('button', { class: 'cat-toggle', type: 'button' });
  const status = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });

  const root = h('div', { class: 'cat-carousel', role: 'region', 'aria-roledescription': 'عرض متتابع', 'aria-label': 'كتالوجات المشاريع' },
    h('div', { class: 'cat-track' }, slides),
    h('div', { class: 'cat-bar wrap' },
      h('div', { class: 'cat-dots' }, dots),
      h('div', { class: 'cat-nav' }, counter, toggle, prev, next)),
    status);
  section.append(root);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let stopped = reduced; // the reader's choice (pause button) or reduced motion
  const holds = new Set<string>(); // temporary pauses: hover, focus, off screen, hidden tab

  const sync = (): void => {
    const paused = stopped || holds.size > 0;
    root.classList.toggle('is-paused', paused);
    root.classList.toggle('is-stopped', stopped);
    toggle.textContent = stopped ? 'تشغيل' : 'إيقاف';
    toggle.setAttribute('aria-label', stopped ? 'تشغيل التقليب التلقائي' : 'إيقاف التقليب التلقائي');
  };

  let leaving: number | undefined;
  const show = (i: number, announce = false, dir?: 'next' | 'prev'): void => {
    const from = index;
    index = (i + total) % total;
    if (index === from && !root.classList.contains('is-first')) return;
    // The outgoing slide stays visible underneath while the incoming one wipes in over it.
    root.dataset.dir = dir ?? (i < from ? 'prev' : 'next');
    root.classList.toggle('is-first', from === index);
    window.clearTimeout(leaving);
    leaving = window.setTimeout(() => slides.forEach((s) => s.classList.remove('is-leaving')), 1100);
    slides.forEach((s, k) => {
      const on = k === index;
      s.classList.toggle('is-leaving', k === from && !on);
      if (on) { s.classList.remove('is-active'); void s.offsetWidth; } // restart its entrance
      s.classList.toggle('is-active', on);
      s.toggleAttribute('inert', !on);
      s.setAttribute('aria-hidden', String(!on));
    });
    dots.forEach((d, k) => {
      d.classList.toggle('is-active', k === index);
      d.classList.toggle('is-done', k < index);
      if (k === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    counter.textContent = `${pad2(index + 1)} / ${pad2(total)}`;
    // Start loading the next cover now, so it is ready when its turn comes.
    const upcoming = slides[(index + 1) % total]?.querySelector<HTMLImageElement>('.feature-bg');
    if (upcoming) upcoming.loading = 'eager';
    if (announce) status.textContent = `${index + 1} من ${total}: ${cards[index]?.name.ar ?? ''}`;
  };

  // The active dot's fill bar is the timer: when its animation ends, the next slide shows.
  // Pausing the animation (via .is-paused) pauses the timer with it.
  dots.forEach((d, k) => {
    d.addEventListener('click', () => show(k, true));
    d.querySelector('i')?.addEventListener('animationend', () => { if (k === index) show(index + 1, false, 'next'); });
  });
  prev.addEventListener('click', () => show(index - 1, true, 'prev'));
  next.addEventListener('click', () => show(index + 1, true, 'next'));
  toggle.addEventListener('click', () => { stopped = !stopped; sync(); });

  const hold = (key: string, on: boolean): void => { if (on) holds.add(key); else holds.delete(key); sync(); };
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hold('hover', true); });
  root.addEventListener('pointerleave', () => hold('hover', false));
  root.addEventListener('focusin', () => hold('focus', true));
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget as Node | null)) hold('focus', false); });
  document.addEventListener('visibilitychange', () => hold('hidden', document.hidden));
  new IntersectionObserver(([e]) => hold('away', !(e?.isIntersecting ?? true)), { threshold: 0.35 }).observe(root);

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index + 1, true, 'next'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index - 1, true, 'prev'); }
  });

  // Swipe on touch screens: in a right-to-left page, a swipe to the right brings the next project.
  let startX = 0;
  let startY = 0;
  root.addEventListener('touchstart', (e) => { startX = e.touches[0]?.clientX ?? 0; startY = e.touches[0]?.clientY ?? 0; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - startX;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(t.clientY - startY)) show(index + (dx > 0 ? 1 : -1), true, dx > 0 ? 'next' : 'prev');
  }, { passive: true });

  root.classList.add('is-first'); // the first slide shows without an entrance
  show(0);
  sync();
  return section;
}
