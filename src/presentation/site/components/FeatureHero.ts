import type { Feature } from '../../../domain/entities';
import { h } from '../../shared/dom';

export interface FeatureLinkOptions {
  /** The heading level: the page banner is a section of its own, a carousel slide sits under its section title. */
  readonly heading?: 'h2' | 'h3';
  /** Load the photos only when needed (slides after the first). */
  readonly lazy?: boolean;
}

/** Long project names get a smaller, balanced title so they never outgrow the banner. */
const isLong = (title: string): boolean => [...title].length > 12;

/**
 * The banner design for one project: its photo, a few pages fanned out like an open catalogue,
 * and a round label that follows the pointer. The whole banner opens the project page.
 */
export function FeatureLink(f: Feature, opts: FeatureLinkOptions = {}): HTMLAnchorElement {
  const loading = opts.lazy ? 'lazy' : 'eager';
  const pages = f.pages.slice(0, 3).map((p, i) =>
    h('span', { class: `feature-page feature-page-${i + 1}` },
      h('img', { src: p.src ?? '', alt: '', loading: 'lazy', decoding: 'async' }),
      h('b', {}, p.caption)));
  const cursor = h('span', { class: 'feature-cursor', 'aria-hidden': 'true' }, f.cta);
  const link = h('a', { class: 'feature-link', href: f.href, 'aria-label': `${f.cta}: ${f.title}` },
    f.image.src ? h('img', { class: 'feature-bg', src: f.image.src, alt: '', loading, decoding: 'async' }) : null,
    h('span', { class: 'feature-shade', 'aria-hidden': 'true' }),
    h('div', { class: 'wrap feature-in' },
      h('div', { class: 'feature-copy' },
        h('p', { class: 'feature-kicker' }, f.kicker),
        h(opts.heading ?? 'h2', { class: `feature-title${isLong(f.title) ? ' is-long' : ''}` }, f.title),
        h('p', { class: 'latin feature-en' }, f.en),
        h('p', { class: 'feature-text' }, f.text),
        f.facts.length > 0 ? h('ul', { class: 'feature-facts' }, f.facts.map((fact) => h('li', {}, fact))) : null,
        h('span', { class: 'feature-cta', 'aria-hidden': 'true' }, f.cta, h('i', {}, '←'))),
      pages.length > 0 ? h('div', { class: 'feature-pages', 'aria-hidden': 'true' }, pages) : null),
    cursor) as HTMLAnchorElement;

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
  return link;
}
