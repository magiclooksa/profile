import { prefersReducedMotion } from '../dom';

/**
 * Blocks below the fold are hidden by script only, then rise into place as they arrive.
 * `.split` headings rise word by word from behind a mask instead.
 * Without script, or with reduced motion, everything is simply visible.
 */
export function initReveal(root: ParentNode): void {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  root.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.classList.add('armed');
    observer.observe(el);
  });
}
