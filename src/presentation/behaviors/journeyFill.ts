import { prefersReducedMotion } from '../dom';

const STEP_DELAY_MS = 110;

/** Fills the ochre line of the journey one step after another when it comes into view. */
export function initJourneyFill(track: HTMLElement | null): void {
  if (!track || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const steps = Array.from(track.querySelectorAll<HTMLElement>('.step'));
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return;
    observer.disconnect();
    if (entry.boundingClientRect.top < window.innerHeight * 0.2) return;
    steps.forEach((s) => { s.style.transition = 'none'; s.style.setProperty('--fill', '0') });
    void track.offsetWidth; // apply the reset before animating
    steps.forEach((s, i) => {
      s.style.transition = '';
      s.style.transitionDelay = `${i * STEP_DELAY_MS}ms`;
      s.style.setProperty('--fill', '1');
    });
  }, { threshold: 0.3 });
  observer.observe(track);
}
