import Lenis from 'lenis';
import { prefersReducedMotion } from '../dom';

let lenis: Lenis | null = null;

/** Inertial wheel scrolling. Touch keeps native scrolling; reduced motion turns it off. */
export function initSmoothScroll(): void {
  if (!prefersReducedMotion()) lenis = new Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.9 });

  // In-page links glide to their section and move focus there for keyboard users.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    const id = link?.hash.slice(1);
    if (!link || !id) return;
    const target = document.getElementById(decodeURIComponent(id));
    if (!target) return;
    event.preventDefault();
    scrollToElement(target);
    history.pushState(null, '', `#${id}`);
  });

  document.addEventListener('imageviewerchange', () => {
    lockScroll(Boolean(document.querySelector('.image-viewer[open]')));
  });
}

export function scrollToElement(target: HTMLElement): void {
  const focus = (): void => {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.4, onComplete: focus });
  } else {
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    focus();
  }
}

export function lockScroll(locked: boolean): void {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}
