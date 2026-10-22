import { h } from '../dom';

/**
 * Adds a share button to every film and photo section. It shares s/<id>/,
 * a small page with that section's own link preview that opens the section.
 */
export function initSectionShare(root: HTMLElement): void {
  for (const section of root.querySelectorAll<HTMLElement>('section.film[id], section.set[id]')) {
    const head = section.querySelector<HTMLElement>('.set-head, .film-copy');
    if (!head) continue;
    const url = new URL(`s/${section.id}/`, document.baseURI).href;
    const title = section.getAttribute('aria-label') ?? document.title;
    const label = h('span', {}, 'مشاركة');
    const button = h('button', { type: 'button', class: 'share-btn', 'aria-label': `مشاركة رابط: ${title}` },
      h('i', { 'aria-hidden': 'true' }, '↗'), label);
    button.addEventListener('click', async () => {
      try {
        if (navigator.share) { await navigator.share({ title, url }); return }
        await navigator.clipboard.writeText(url);
        label.textContent = 'تم نسخ الرابط';
      } catch {
        // Sharing was cancelled, or the clipboard is blocked: show the link instead.
        label.textContent = url;
      }
      window.setTimeout(() => { label.textContent = 'مشاركة' }, 2500);
    });
    head.append(button);
  }
}

/** The page is drawn after loading, so jump to "#section" once it exists. */
export function scrollToHash(): void {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' }));
}
