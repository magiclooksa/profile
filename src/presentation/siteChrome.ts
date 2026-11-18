import { initJourneyFill } from './behaviors/journeyFill';
import { initNavState } from './behaviors/navState';
import { initReveal } from './behaviors/reveal';
import { createSiteSearch } from './search/SearchPanel';

/** The header state, search and motion shared by every page. `root` leads to the site root. */
export function initSiteChrome(root: string): void {
  document.querySelector('[data-site-search]')?.append(createSiteSearch(root).button);
  initNavState(document.getElementById('nav'));
  initReveal(document);
  initJourneyFill(document.getElementById('track'));
}
