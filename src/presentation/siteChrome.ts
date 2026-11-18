import { initJourneyFill } from './behaviors/journeyFill';
import { initMediaPlayback } from './behaviors/mediaPlayback';
import { initNavState } from './behaviors/navState';
import { initReveal } from './behaviors/reveal';
import { prefersReducedMotion } from './dom';
import { createSiteSearch } from './search/SearchPanel';

/** Silent films play on their own while on screen, unless the visitor prefers less motion. */
function initSilentFilms(): void {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const selector = 'video[data-silent-loop]';
  document.querySelectorAll<HTMLVideoElement>(selector).forEach((video) => {
    video.muted = true;
    video.controls = false;
  });
  initMediaPlayback(document, selector);
}

/** The header state, search and motion shared by every page. `root` leads to the site root. */
export function initSiteChrome(root: string): void {
  document.querySelector('[data-site-search]')?.append(createSiteSearch(root).button);
  initNavState(document.getElementById('nav'));
  initReveal(document);
  initJourneyFill(document.getElementById('track'));
  initSilentFilms();
}
