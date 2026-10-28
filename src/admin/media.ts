import { h } from '../presentation/dom';
import type { AdminClient, MediaFile } from './client';

const isVideo = (f: MediaFile): boolean => f.contentType.startsWith('video/');
const size = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} م.ب` : `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;

/**
 * The media library: upload by button or drag-and-drop, search, copy a link, delete.
 * With `onPick`, clicking a file chooses it instead (used by the picker dialog).
 */
export function MediaLibrary(client: AdminClient, onPick?: (file: MediaFile) => void): HTMLElement {
  const grid = h('div', { class: 'media-grid' });
  const status = h('p', { class: 'media-status', role: 'status' });
  const search = h('input', { type: 'search', placeholder: 'بحث باسم الملف', class: 'media-search' });
  const file = h('input', { type: 'file', multiple: true, accept: 'image/*,video/*,application/pdf', hidden: true });
  const uploadBtn = h('button', { type: 'button', class: 'ed-btn primary' }, 'رفع ملفات');
  uploadBtn.addEventListener('click', () => file.click());

  const card = (f: MediaFile): HTMLElement => {
    const src = client.resolve(f.url);
    const preview = isVideo(f) ? h('video', { src, muted: true, preload: 'metadata', playsinline: true })
      : f.contentType.startsWith('image/') ? h('img', { src, alt: f.name, loading: 'lazy' })
        : h('span', { class: 'media-doc' }, 'PDF');
    const copy = h('button', { type: 'button', class: 'ed-btn quiet' }, 'نسخ الرابط');
    copy.addEventListener('click', (e) => {
      e.stopPropagation();
      void navigator.clipboard.writeText(src).then(() => { copy.textContent = 'نُسخ ✓' });
    });
    const remove = h('button', { type: 'button', class: 'ed-btn quiet danger' }, 'حذف');
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`حذف «${f.name}» نهائياً؟ الصفحات التي تستخدمه ستفقد الصورة.`)) return;
      client.deleteFile(f.id).then(() => el.remove()).catch((err: Error) => alert(err.message));
    });
    const el = h('figure', { class: `media-card${onPick ? ' pickable' : ''}`, tabindex: onPick ? '0' : null },
      h('div', { class: 'media-preview' }, preview),
      h('figcaption', {}, h('b', { title: f.name }, f.name), h('small', {}, size(f.size))),
      onPick ? null : h('div', { class: 'ed-row' }, copy, remove));
    if (onPick) {
      el.addEventListener('click', () => onPick(f));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') onPick(f) });
    }
    return el;
  };

  const load = (): void => {
    status.textContent = 'جارٍ التحميل…';
    client.files(search.value.trim()).then((files) => {
      grid.replaceChildren(...files.map(card));
      status.textContent = files.length ? `${files.length} ملف` : 'لا توجد ملفات بعد. ارفع أول صورة أو فيديو.';
    }).catch((e: Error) => { status.textContent = e.message });
  };

  const upload = (files: File[]): void => {
    if (!files.length) return;
    status.textContent = 'جارٍ الرفع… 0%';
    client.upload(files, (f) => { status.textContent = `جارٍ الرفع… ${Math.round(f * 100)}%` })
      .then((added) => {
        if (onPick && added.length === 1 && added[0]) return onPick(added[0]);
        load();
      })
      .catch((e: Error) => { status.textContent = e.message })
      .finally(() => { file.value = '' });
  };

  file.addEventListener('change', () => upload([...(file.files ?? [])]));
  let timer = 0;
  search.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(load, 300) });

  const root = h('div', { class: 'media-library' },
    h('div', { class: 'media-bar' }, uploadBtn, search, file),
    h('p', { class: 'hint' }, 'اسحب الملفات وأفلتها هنا. المقبول: صور JPG وPNG وWebP، وفيديو MP4 أو WebM أو MOV، وملفات PDF.'),
    status, grid);
  root.addEventListener('dragover', (e) => { e.preventDefault(); root.classList.add('drag') });
  root.addEventListener('dragleave', () => root.classList.remove('drag'));
  root.addEventListener('drop', (e) => {
    e.preventDefault();
    root.classList.remove('drag');
    upload([...(e.dataTransfer?.files ?? [])]);
  });
  load();
  return root;
}

/** A dialog over the editor that returns the URL of the chosen (or newly uploaded) file. */
export function pickMedia(client: AdminClient): Promise<string | null> {
  return new Promise((done) => {
    const close = h('button', { type: 'button', class: 'ed-btn quiet' }, 'إغلاق');
    const dialog = h('dialog', { class: 'media-dialog' });
    let result: string | null = null;
    dialog.append(
      h('header', {}, h('h2', {}, 'اختر ملفاً'), close),
      MediaLibrary(client, (f) => { result = f.url; dialog.close() }));
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); done(result) });
    document.body.append(dialog);
    dialog.showModal();
  });
}
