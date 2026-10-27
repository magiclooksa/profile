import type { Feature } from '../../domain/entities';
import { h } from '../dom';

/**
 * A full-width banner for a featured project: its photo, a few pages fanned out like an open
 * catalogue, and a round label that follows the pointer. The whole banner opens the project page;
 * in browsers with view transitions, the photo grows into the cover of that page.
 */
export function FeatureHero(f: Feature): HTMLElement {
  const pages = f.pages.slice(0, 3).map((p, i) =>
    h('span', { class: `feature-page feature-page-${i + 1}` },
      h('img', { src: p.src ?? '', alt: '', loading: 'lazy', decoding: 'async' }),
      h('b', {}, p.caption)));
  const cursor = h('span', { class: 'feature-cursor', 'aria-hidden': 'true' }, f.cta);
  const link = h('a', { class: 'feature-link', href: f.href, 'aria-label': `${f.cta}: ${f.title}` },
    f.image.src ? h('img', { class: 'feature-bg', src: f.image.src, alt: '', decoding: 'async' }) : null,
    h('span', { class: 'feature-shade', 'aria-hidden': 'true' }),
    h('div', { class: 'wrap feature-in' },
      h('div', { class: 'feature-copy' },
        h('p', { class: 'feature-kicker' }, f.kicker),
        h('h2', { class: 'feature-title' }, f.title),
        h('p', { class: 'latin feature-en' }, f.en),
        h('p', { class: 'feature-text' }, f.text),
        f.facts.length > 0 ? h('ul', { class: 'feature-facts' }, f.facts.map((fact) => h('li', {}, fact))) : null,
        h('span', { class: 'feature-cta', 'aria-hidden': 'true' }, f.cta, h('i', {}, '←'))),
      pages.length > 0 ? h('div', { class: 'feature-pages', 'aria-hidden': 'true' }, pages) : null),
    cursor);

  // The round label follows a mouse; touch screens keep the plain button.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    link.addEventListener('pointermove', (e) => {
      const r = link.getBoundingClientRect();
      link.style.setProperty('--cx', `${e.clientX - r.left}px`);
      link.style.setProperty('--cy', `${e.clientY - r.top}px`);
      link.classList.add('is-pointing');
    });
    link.addEventListener('pointerleave', () => link.classList.remove('is-pointing'));
  }
  return h('section', { class: 'feature', id: 'villa', 'aria-label': f.title }, link);
}
