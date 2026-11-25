import { initSiteChrome } from '../presentation/site/siteChrome';

// The projects catalogue page (pages/projects-catalogue.html, written by tooling/vite/projectsBook.ts).
// Motion only: everything is readable without this script.
document.documentElement.classList.add('js');
initSiteChrome('./');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reveal on scroll.
const reveal = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    e.target.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
    if (e.target instanceof HTMLElement && e.target.dataset.count) countUp(e.target);
    reveal.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

/** Counts a number up from zero, keeping its two digits. */
function countUp(el: HTMLElement): void {
  const to = Number(el.dataset.count);
  if (reduced || !Number.isFinite(to) || el.dataset.counted) return;
  el.dataset.counted = '1';
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / 1400);
    const v = Math.round(to * (1 - Math.pow(1 - t, 3)));
    el.textContent = String(v).padStart(2, '0');
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Chapter dots: shown after the index, the current chapter highlighted.
const dots = document.querySelector<HTMLElement>('.bk-dots');
const index = document.getElementById('bk-index');
const links = new Map([...document.querySelectorAll<HTMLAnchorElement>('[data-dot]')].map((a) => [a.dataset.dot ?? '', a]));
const chapters = [...document.querySelectorAll<HTMLElement>('[data-chapter]')];
const active = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const id = (e.target as HTMLElement).dataset.chapter ?? '';
    links.forEach((a, key) => {
      a.classList.toggle('is-active', key === id);
      if (key === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
}, { rootMargin: '-45% 0px -50% 0px' });
chapters.forEach((c) => active.observe(c));

// Progress bar, dots visibility and a gentle parallax on the chapter photos.
const progress = document.querySelector<HTMLElement>('.bk-progress');
const parallax = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
let ticking = false;
function onScroll(): void {
  ticking = false;
  const doc = document.documentElement;
  const max = doc.scrollHeight - innerHeight;
  progress?.style.setProperty('--p', String(max > 0 ? scrollY / max : 0));
  if (dots && index) {
    const last = chapters.at(-1);
    const past = index.getBoundingClientRect().bottom < innerHeight * 0.5;
    const before = last ? last.getBoundingClientRect().bottom > innerHeight * 0.4 : true;
    dots.classList.toggle('is-on', past && before);
  }
  if (reduced) return;
  for (const img of parallax) {
    const r = img.parentElement!.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    const offset = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1 … 1
    img.style.setProperty('--py', `${(-offset * 6).toFixed(2)}%`);
  }
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', onScroll);
onScroll();
