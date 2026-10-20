import { h } from '../dom';
import { bindMediaAspectRatio } from '../behaviors/mediaAspectRatio';
import type { Media } from '../../domain/entities';

/** A modal image viewer with native focus trapping and Escape handling. */
export function openImageViewer(src: string, caption: string, aspectRatio?: Media['aspectRatio']): void {
  if (document.querySelector('.image-viewer[open]')) return;
  const trigger = document.activeElement;
  const previousOverflow = document.documentElement.style.overflow;
  const close = h('button', { type: 'button', class: 'viewer-close', 'aria-label': 'إغلاق عرض الصورة' }, 'إغلاق ×');
  const zoom = h('button', { type: 'button', 'aria-pressed': 'false' }, 'تكبير +');
  const image = h('img', { src, alt: caption, draggable: false });
  const frame = h('div', { class: 'viewer-frame' }, image);
  bindMediaAspectRatio(frame, image, aspectRatio);
  const canvas = h('div', { class: 'viewer-canvas' }, frame);
  const viewport = h('div', {
    class: 'viewer-viewport', tabindex: 0, role: 'region', 'aria-label': 'الصورة، استخدم الأسهم لتحريكها بعد التكبير',
  }, canvas);
  const status = h('p', { class: 'viewer-status', role: 'status', hidden: true }, 'تعذّر تحميل الصورة');
  const dialog = h('dialog', {
    class: 'image-viewer', 'aria-label': 'عرض الصورة', 'aria-describedby': 'viewer-caption',
  },
  h('div', { class: 'viewer-toolbar' }, h('span', {}, 'عرض الصورة'), zoom, close),
  viewport,
  status,
  h('p', { class: 'viewer-caption', id: 'viewer-caption' }, caption));

  const toggleZoom = (): void => {
    const enlarged = dialog.classList.toggle('is-zoomed');
    zoom.setAttribute('aria-pressed', String(enlarged));
    zoom.textContent = enlarged ? 'تصغير −' : 'تكبير +';
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
  };
  zoom.addEventListener('click', toggleZoom);
  image.addEventListener('click', toggleZoom);
  image.addEventListener('error', () => { status.hidden = false; zoom.disabled = true });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]'));
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    dialog.remove();
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    document.dispatchEvent(new Event('imageviewerchange'));
  }, { once: true });

  document.body.append(dialog);
  document.documentElement.style.overflow = 'hidden';
  dialog.showModal();
  close.focus();
  document.dispatchEvent(new Event('imageviewerchange'));
}
