import type { IconName } from '../../domain/entities';
import { PATTERN_TILE } from './brand';
import { ICON_PATHS } from './iconPaths';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function icon(name: IconName, className = 'ic'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.4');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = ICON_PATHS[name];
  return svg;
}

let patternCount = 0;

/** The identity pattern: the brand's curve element, repeated as in the guide (page 13). */
export function pattern(): HTMLDivElement {
  const id = `ml-pattern-${++patternCount}`;
  const { width, height, content } = PATTERN_TILE;
  const wrap = document.createElement('div');
  wrap.className = 'pattern';
  wrap.setAttribute('aria-hidden', 'true');
  // Static, trusted markup from the brand files.
  wrap.innerHTML =
    `<svg><defs><pattern id="${id}" width="${width}" height="${height}" patternUnits="userSpaceOnUse" ` +
    `patternTransform="scale(3)"><g fill="currentColor">${content}</g></pattern></defs>` +
    `<rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
  return wrap;
}
