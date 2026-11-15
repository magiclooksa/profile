import logoHorizontal from '../assets/brand/logo-horizontal.svg?raw';
import logoStacked from '../assets/brand/logo-stacked.svg?raw';
import markSource from '../assets/brand/mark.svg?raw';
import patternSource from '../assets/brand/pattern-curve.svg?raw';

/*
 * Identity 2027 artwork, drawn from the designer's vector files.
 * Each part carries a class (ml-top, ml-bottom, ml-ar, ml-en) whose fill comes from
 * CSS custom properties, so one drawing serves every colour version in the guide.
 * The files hold plain paths with no ids, so they can appear several times on a page.
 */

function svg(source: string, className: string): SVGSVGElement {
  const template = document.createElement('template');
  template.innerHTML = source.trim();
  const el = template.content.firstElementChild as SVGSVGElement;
  el.setAttribute('class', className);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('focusable', 'false');
  return el;
}

/** The full logo: the mark with النظرة الساحرة and Magic Look. */
export const Logo = (layout: 'horizontal' | 'stacked' = 'horizontal', className = ''): SVGSVGElement =>
  svg(layout === 'stacked' ? logoStacked : logoHorizontal, `logo logo-${layout} ${className}`.trim());

/** The mark alone. */
export const BrandMark = (className = ''): SVGSVGElement => svg(markSource, `mark ${className}`.trim());

/** One repeat of the brand's curve pattern, in its own units. */
export const PATTERN_TILE = {
  width: 19.7508,
  height: 20.6503,
  content: patternSource.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''),
} as const;
