import type { IconName } from '../domain/entities';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Line icons drawn on a 64×64 grid. Static, trusted markup. */
const PATHS: Record<IconName, string> = {
  sofa: "<path d='M10 30v-8a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v8'/><path d='M6 30a4 4 0 0 1 8 0v4h36v-4a4 4 0 0 1 8 0v12H6z'/><path d='M12 42v4M52 42v4'/>",
  bed: "<path d='M6 44V16M6 34h52v10M58 44V30a6 6 0 0 0-6-6H26v10'/><circle cx='16' cy='28' r='4'/>",
  chair: "<path d='M20 8h24v22H20z'/><path d='M16 30h32v8H16zM20 38l-3 18M44 38l3 18'/>",
  table: "<path d='M6 22h52M12 22l-4 26M52 22l4 26M18 22v10h28V22'/>",
  tv: "<rect x='14' y='12' width='36' height='22' rx='2'/><path d='M4 40h56v14H4zM32 40v14M8 8v32M56 8v32'/>",
  mirror: "<rect x='20' y='6' width='24' height='46' rx='12'/><path d='M14 6v46M50 6v46M26 18l8-6M26 28l14-10'/>",
  partition: "<path d='M10 8h44v48H10z'/><path d='M10 20h44M10 32h44M10 44h44M24 8v48M40 8v48'/>",
  cabinet: "<rect x='12' y='6' width='40' height='48' rx='2'/><path d='M32 6v48M27 28v6M37 28v6M16 54v4M48 54v4'/>",
  curtain: "<path d='M6 8h52M12 8c0 14 6 30 2 48h12c-4-18 2-34 2-48M52 8c0 14-6 30-2 48H38c4-18-2-34-2-48'/>",
  lamp: "<path d='M22 8h20l8 20H14z'/><path d='M32 28v22M22 54h20'/>",
  space: "<path d='M8 8h48v48H8z'/><path d='M8 28h20v28M28 40h28M40 8v20'/>",
  plan: "<path d='M10 54V10h44v44z'/><path d='M10 30h18M36 10v18h18M28 30v24'/><circle cx='44' cy='42' r='4'/>",
  palette: "<path d='M32 6a26 26 0 1 0 0 52c4 0 6-3 4-7-2-5 1-9 6-9h6a10 10 0 0 0 10-10C58 17 46 6 32 6z'/><circle cx='20' cy='28' r='3'/><circle cx='28' cy='17' r='3'/><circle cx='41' cy='17' r='3'/>",
  wall: "<path d='M6 10h52v44H6z'/><path d='M6 24h52M6 38h52M22 10v14M40 24v14M22 38v16M44 38v16'/>",
  light: "<path d='M32 6v8M14 14l5 5M50 14l-5 5'/><path d='M22 32a10 10 0 1 1 20 0c0 5-4 7-4 12H26c0-5-4-7-4-12z'/><path d='M26 50h12M28 56h8'/>",
  pin: "<path d='M32 58s-18-18-18-32a18 18 0 0 1 36 0c0 14-18 32-18 32z'/><circle cx='32' cy='26' r='6'/>",
  mail: "<rect x='6' y='14' width='52' height='36' rx='3'/><path d='M6 18l26 18 26-18'/>",
  phone: "<path d='M18 6h10l4 12-7 5a32 32 0 0 0 16 16l5-7 12 4v10a4 4 0 0 1-4 4C28 50 14 36 14 10a4 4 0 0 1 4-4z'/>",
  web: "<circle cx='32' cy='32' r='26'/><path d='M6 32h52M32 6c-10 12-10 40 0 52M32 6c10 12 10 40 0 52'/>",
};

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
  svg.innerHTML = PATHS[name];
  return svg;
}

let patternCount = 0;

/** The identity pattern: the L corner and the V of the mark, repeated. */
export function pattern(): HTMLDivElement {
  const id = `ml-pattern-${++patternCount}`;
  const wrap = document.createElement('div');
  wrap.className = 'pattern';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML =
    `<svg><defs><pattern id="${id}" width="120" height="120" patternUnits="userSpaceOnUse">` +
    `<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">` +
    `<path d="M18 14v24q0 8 8 8h18"/><path d="M74 76l14 13 14-13"/></g></pattern></defs>` +
    `<rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
  return wrap;
}
