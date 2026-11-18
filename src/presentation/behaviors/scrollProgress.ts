import { prefersReducedMotion } from '../dom';

/**
 * Sets --p (0 → 1) on scroll-driven sections while they pass through a pinned view.
 * `data-p-span` is the share of the scroll travel that reaches 1 (default 1).
 */
export function initScrollProgress(root: HTMLElement): void {
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-scroll-progress]'));
  if (sections.length === 0) return;
  if (prefersReducedMotion()) {
    sections.forEach((s) => s.style.setProperty('--p', '1'));
    return;
  }
  let frame = 0;
  const update = (): void => {
    frame = 0;
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -innerHeight || rect.top > innerHeight * 2) continue;
      const travel = Math.max(1, rect.height - innerHeight);
      const span = Number(section.dataset.pSpan ?? 1) || 1;
      const p = Math.min(1, Math.max(0, -rect.top / (travel * span)));
      section.style.setProperty('--p', p.toFixed(4));
    }
  };
  const schedule = (): void => { if (!frame) frame = requestAnimationFrame(update) };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();
}
