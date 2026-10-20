import { prefersReducedMotion } from '../dom';

/** Drives --p (0 → 1) on each expanding film section as it scrolls through the view. */
export function initFilmExpand(root: HTMLElement): void {
  const sections = Array.from(root.querySelectorAll<HTMLElement>('.film-expand'));
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
      const travel = Math.max(1, rect.height - innerHeight);
      // Full size at 60% of the scroll travel, then hold.
      const p = Math.min(1, Math.max(0, -rect.top / (travel * 0.6)));
      section.style.setProperty('--p', p.toFixed(3));
    }
  };
  const schedule = (): void => { if (!frame) frame = requestAnimationFrame(update) };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();
}
