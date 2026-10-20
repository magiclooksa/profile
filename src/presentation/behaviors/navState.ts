/**
 * Gives the bar a backdrop once the page scrolls, tucks it away while reading downwards,
 * brings it back on the way up, and underlines the link of the section in view.
 */
export function initNavState(nav: HTMLElement | null): void {
  if (!nav) return;
  let last = window.scrollY;
  const onScroll = (): void => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 10);
    if (document.documentElement.classList.contains('menu-open')) nav.classList.remove('tucked');
    else if (Math.abs(y - last) > 4) nav.classList.toggle('tucked', y > last && y > 240);
    last = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  nav.addEventListener('focusin', () => nav.classList.remove('tucked'));
  onScroll();

  if (!('IntersectionObserver' in window)) return;
  const links = new Map<string, HTMLAnchorElement>();
  nav.querySelectorAll<HTMLAnchorElement>('.nav-links a').forEach((a) => links.set(a.hash.slice(1), a));
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) links.get(e.target.id)?.classList.toggle('active', e.isIntersecting);
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) observer.observe(s) });
}
