import { h } from '../dom';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A small stroke icon on a 24×24 grid. */
function glyph(paths: string[], className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 24 24', class: className, 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor',
    'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  })) svg.setAttribute(k, v);
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/** Three linked dots: the usual share symbol. */
const shareGlyph = (): SVGSVGElement => glyph([
  'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
], 'share-ic');
const doneGlyph = (): SVGSVGElement => glyph(['M5 12.5l4.5 4.5L19 7.5'], 'share-ic share-ic-done');

/** A phone or tablet: the main pointer is a finger. */
const isTouchDevice = (): boolean => window.matchMedia('(pointer: coarse)').matches;

/** Copy text, with a fallback for browsers that block the clipboard API. */
async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = h('textarea', { readonly: true, style: 'position: fixed; opacity: 0' });
    field.value = text;
    document.body.append(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
}

/**
 * Icon-only button that shares one product. The link is s/<id>/, a small page whose
 * preview shows this product's photo and which opens the product on the page.
 */
export function ShareButton(id: string, title: string): HTMLButtonElement {
  const url = new URL(`s/${id}/`, document.baseURI).href;
  const label = `مشاركة: ${title}`;
  const button = h('button', { type: 'button', class: 'share-btn', 'aria-label': label, title: label });
  button.append(shareGlyph(), doneGlyph());
  button.addEventListener('click', async (e) => {
    // Keep the click from opening the photo viewer or switching slides underneath.
    e.stopPropagation();
    try {
      // Phones and tablets open the share sheet to send the link; desktops copy it.
      if (isTouchDevice() && navigator.share) { await navigator.share({ title, url }); return }
      await copy(url);
      button.classList.add('is-done');
      button.setAttribute('aria-label', 'تم نسخ الرابط');
      button.title = 'تم نسخ الرابط';
      window.setTimeout(() => {
        button.classList.remove('is-done');
        button.setAttribute('aria-label', label);
        button.title = label;
      }, 2200);
    } catch {
      // Sharing was cancelled or the clipboard is blocked; nothing else to do.
    }
  });
  return button;
}

/**
 * The page is drawn after loading, so go to "#id" once it exists. The target gets a
 * cancellable "reveal-item" event first, so sliders can select it or scroll their own way.
 */
export function scrollToHash(): void {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  requestAnimationFrame(() => {
    const target = document.getElementById(id);
    if (!target) return;
    const handled = !target.dispatchEvent(new CustomEvent('reveal-item', { cancelable: true }));
    if (!handled) target.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
}
