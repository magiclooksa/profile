/**
 * Replays a short rise when a block scrolls into view.
 * Content is fully visible before this runs, so nothing depends on it.
 */
export function initReveal(root: ParentNode): void {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      // Skip blocks already on screen at load: only animate what arrives by scrolling.
      if (entry.boundingClientRect.top > window.innerHeight * 0.1) entry.target.classList.add('in');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.15 });
  root.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}
