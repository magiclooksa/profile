/** Adds a border once the page scrolls and underlines the link of the section in view. */
export function initNavState(nav: HTMLElement | null): void {
  if (!nav) return;
  const onScroll = (): void => { nav.classList.toggle('scrolled', window.scrollY > 10) };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!('IntersectionObserver' in window)) return;
  const links = new Map<string, HTMLAnchorElement>();
  nav.querySelectorAll<HTMLAnchorElement>('ul a').forEach((a) => links.set(a.hash.slice(1), a));
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) links.get(e.target.id)?.classList.toggle('active', e.isIntersecting);
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) observer.observe(s) });
}
