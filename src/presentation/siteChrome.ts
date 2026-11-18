import { createSiteSearch } from './search/SearchPanel';

function initMenu(): void {
  const header = document.getElementById('site-header');
  const button = header?.querySelector<HTMLButtonElement>('.sh-burger');
  if (!header || !button) return;
  const setOpen = (open: boolean): void => {
    header.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  };
  button.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
  header.querySelectorAll('.sh-nav a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); button.focus() }
  });
}

/** Sections rise gently into view; they are fully visible if scripts or motion are off. */
function initReveal(): void {
  const items = document.querySelectorAll<HTMLElement>('.rv');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('can-reveal');
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      observer.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -6% 0px' });
  items.forEach((el) => observer.observe(el));
}

/** The header, menu, search and motion shared by every page. `root` leads to the site root. */
export function initSiteChrome(root: string): void {
  document.querySelector('[data-site-search]')?.append(createSiteSearch(root).button);
  initMenu();
  initReveal();
}
