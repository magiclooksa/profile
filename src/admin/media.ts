import { h } from '../presentation/dom';
import type { AdminClient, FolderListing, MediaFile } from './client';

const size = (bytes: number): string =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} ج.ب`
    : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} م.ب`
      : bytes === 0 ? '0 ك.ب' : `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
const extension = (name: string): string => (/\.([a-z0-9]{1,5})$/i.exec(name)?.[1] ?? 'ملف').toUpperCase();
const parentOf = (path: string): string => path.split('/').slice(0, -1).join('/');
const folderLabel = (path: string): string => path ? path.split('/').join(' › ') : 'الرئيسي';
const errorText = (e: unknown): string => (e instanceof Error ? e.message : 'حدث خطأ');

/** A small dialog listing every folder, to pick where a file or folder moves to. */
function chooseFolder(client: AdminClient, title: string, current: string, exclude?: string): Promise<string | null> {
  return new Promise((done) => {
    const select = h('select', { class: 'fm-select' });
    const ok = h('button', { type: 'button', class: 'ed-btn primary' }, 'نقل');
    const cancel = h('button', { type: 'button', class: 'ed-btn quiet' }, 'إلغاء');
    const dialog = h('dialog', { class: 'fm-dialog' },
      h('h2', {}, title), h('label', {}, h('span', { class: 'ed-label' }, 'إلى المجلد'), select), h('div', { class: 'ed-row' }, ok, cancel));
    let result: string | null = null;
    client.allFolders().then((all) => {
      const options = ['', ...all].filter((p) => !(exclude !== undefined && (p === exclude || p.startsWith(`${exclude}/`))));
      select.replaceChildren(...options.map((p) => {
        const o = h('option', { value: p }, folderLabel(p));
        o.selected = p === current;
        return o;
      }));
    }).catch((e: unknown) => alert(errorText(e)));
    ok.addEventListener('click', () => { result = select.value; dialog.close() });
    cancel.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); done(result) });
    document.body.append(dialog);
    dialog.showModal();
  });
}

/**
 * The file manager: folders, upload by button or drag-and-drop, search, rename, move, copy link, download, delete.
 * With `onPick`, clicking a file chooses it instead (used by the picker dialog in the editor).
 */
export function MediaLibrary(client: AdminClient, onPick?: (file: MediaFile) => void, startFolder = ''): HTMLElement {
  let folder = startFolder;
  let listing: FolderListing | null = null;

  const crumbs = h('nav', { class: 'fm-crumbs', 'aria-label': 'مسار المجلد' });
  const folderGrid = h('div', { class: 'fm-folders' });
  const grid = h('div', { class: 'media-grid' });
  const status = h('p', { class: 'media-status', role: 'status' });
  const usage = h('p', { class: 'fm-usage' });
  const search = h('input', { type: 'search', placeholder: 'بحث في كل الملفات', class: 'media-search' });
  const input = h('input', { type: 'file', multiple: true, hidden: true });
  const uploadBtn = h('button', { type: 'button', class: 'ed-btn primary' }, 'رفع ملفات');
  const newFolderBtn = h('button', { type: 'button', class: 'ed-btn' }, 'مجلد جديد');
  uploadBtn.addEventListener('click', () => input.click());

  const go = (path: string): void => { folder = path; search.value = ''; void load() };

  newFolderBtn.addEventListener('click', () => {
    const name = prompt('اسم المجلد الجديد')?.trim();
    if (!name) return;
    client.createFolder(folder ? `${folder}/${name}` : name).then(() => load()).catch((e: unknown) => alert(errorText(e)));
  });

  const drawCrumbs = (): void => {
    const parts = folder ? folder.split('/') : [];
    const link = (label: string, path: string, last: boolean): HTMLElement => {
      if (last) return h('b', {}, label);
      const a = h('button', { type: 'button', class: 'fm-crumb' }, label);
      a.addEventListener('click', () => go(path));
      a.addEventListener('dragover', (e) => e.preventDefault());
      a.addEventListener('drop', (e) => dropOn(e, path));
      return a;
    };
    crumbs.replaceChildren(
      link('الملفات', '', parts.length === 0 && !search.value),
      ...parts.flatMap((p, i) => [h('span', { 'aria-hidden': 'true' }, '›'), link(p, parts.slice(0, i + 1).join('/'), i === parts.length - 1 && !search.value)]));
    if (search.value) crumbs.append(h('span', {}, `› نتائج البحث عن «${search.value}»`));
  };

  /** Dropping a file card on a folder moves it there. */
  const dropOn = (e: DragEvent, path: string): void => {
    const id = e.dataTransfer?.getData('application/x-file-id');
    if (!id) return;
    e.preventDefault();
    e.stopPropagation();
    client.updateFile(id, { folder: path }).then(() => load()).catch((err: unknown) => alert(errorText(err)));
  };

  const folderTile = (f: { path: string; name: string }): HTMLElement => {
    const rename = h('button', { type: 'button', class: 'ed-icon', title: 'إعادة تسمية', 'aria-label': 'إعادة تسمية' }, '✎');
    const move = h('button', { type: 'button', class: 'ed-icon', title: 'نقل', 'aria-label': 'نقل' }, '↗');
    const remove = h('button', { type: 'button', class: 'ed-icon', title: 'حذف', 'aria-label': 'حذف' }, '✕');
    const open = h('button', { type: 'button', class: 'fm-folder-open' }, h('span', { class: 'fm-folder-icon', 'aria-hidden': 'true' }), h('b', {}, f.name));
    const tile = h('div', { class: 'fm-folder' }, open, onPick ? null : h('span', { class: 'ed-tools' }, rename, move, remove));
    open.addEventListener('click', () => go(f.path));
    tile.addEventListener('dragover', (e) => { e.preventDefault(); tile.classList.add('drop') });
    tile.addEventListener('dragleave', () => tile.classList.remove('drop'));
    tile.addEventListener('drop', (e) => { tile.classList.remove('drop'); dropOn(e, f.path) });
    rename.addEventListener('click', () => {
      const name = prompt('الاسم الجديد للمجلد', f.name)?.trim();
      if (!name || name === f.name) return;
      const parent = parentOf(f.path);
      client.moveFolder(f.path, parent ? `${parent}/${name}` : name).then(() => load()).catch((e: unknown) => alert(errorText(e)));
    });
    move.addEventListener('click', () => {
      void chooseFolder(client, `نقل المجلد «${f.name}»`, parentOf(f.path), f.path).then((to) => {
        if (to === null || to === parentOf(f.path)) return;
        client.moveFolder(f.path, to ? `${to}/${f.name}` : f.name).then(() => load()).catch((e: unknown) => alert(errorText(e)));
      });
    });
    remove.addEventListener('click', () => {
      if (!confirm(`حذف المجلد «${f.name}»؟`)) return;
      client.deleteFolder(f.path).then(() => load()).catch((e: unknown) => alert(errorText(e)));
    });
    return tile;
  };

  const card = (f: MediaFile): HTMLElement => {
    const src = client.resolve(f.url);
    const preview = f.contentType.startsWith('video/') ? h('video', { src, muted: true, preload: 'metadata', playsinline: true })
      : /^image\/(jpeg|png|webp|gif|avif)$/.test(f.contentType) ? h('img', { src, alt: f.name, loading: 'lazy' })
        : h('span', { class: 'media-doc' }, extension(f.name));
    const btn = (label: string, action: () => void, extra = ''): HTMLButtonElement => {
      const b = h('button', { type: 'button', class: `ed-btn quiet ${extra}` }, label);
      b.addEventListener('click', (e) => { e.stopPropagation(); action() });
      return b;
    };
    const copy = btn('نسخ الرابط', () => {
      void navigator.clipboard.writeText(new URL(src, location.href).href).then(() => { copy.textContent = 'نُسخ ✓' });
    });
    const el = h('figure', { class: `media-card${onPick ? ' pickable' : ''}`, tabindex: onPick ? '0' : null, draggable: onPick ? null : 'true' },
      h('div', { class: 'media-preview' }, preview),
      h('figcaption', {},
        h('b', { title: f.name }, f.name),
        h('small', {}, size(f.size), search.value && f.folder !== undefined ? ` · ${folderLabel(f.folder)}` : '')),
      onPick ? null : h('div', { class: 'fm-actions' },
        copy,
        h('a', { class: 'ed-btn quiet', href: `${src}?download=1`, download: f.name }, 'تنزيل'),
        btn('إعادة تسمية', () => {
          const name = prompt('الاسم الجديد للملف', f.name)?.trim();
          if (!name || name === f.name) return;
          client.updateFile(f.id, { name }).then(() => load()).catch((e: unknown) => alert(errorText(e)));
        }),
        btn('نقل', () => {
          void chooseFolder(client, `نقل «${f.name}»`, f.folder ?? '').then((to) => {
            if (to === null || to === f.folder) return;
            client.updateFile(f.id, { folder: to }).then(() => load()).catch((e: unknown) => alert(errorText(e)));
          });
        }),
        btn('حذف', () => {
          if (!confirm(`حذف «${f.name}» نهائياً؟ الصفحات التي تستخدمه ستفقده.`)) return;
          client.deleteFile(f.id).then(() => load()).catch((e: unknown) => alert(errorText(e)));
        }, 'danger')));
    if (onPick) {
      el.addEventListener('click', () => onPick(f));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') onPick(f) });
    } else {
      el.addEventListener('dragstart', (e) => { e.dataTransfer?.setData('application/x-file-id', f.id) });
    }
    return el;
  };

  async function load(): Promise<void> {
    status.textContent = 'جارٍ التحميل…';
    try {
      listing = await client.files(folder, search.value.trim());
    } catch (e) {
      status.textContent = errorText(e);
      return;
    }
    drawCrumbs();
    folderGrid.replaceChildren(...listing.folders.map(folderTile));
    grid.replaceChildren(...listing.files.map(card));
    const empty = !listing.folders.length && !listing.files.length;
    status.textContent = empty ? (search.value ? 'لا توجد نتائج.' : 'المجلد فارغ. ارفع ملفات أو اسحبها وأفلتها هنا.') : '';
    usage.textContent = `${listing.usage.count} ملف · ${size(listing.usage.bytes)} · التخزين: ${listing.usage.driver === 'disk' ? 'مجلد storage في المشروع' : 'داخل MongoDB'}`;
  }

  const upload = (files: File[]): void => {
    if (!files.length) return;
    status.textContent = 'جارٍ الرفع… 0%';
    client.upload(files, (f) => { status.textContent = `جارٍ الرفع… ${Math.round(f * 100)}%` }, search.value ? '' : folder)
      .then((added) => {
        if (onPick && added.length === 1 && added[0]) return onPick(added[0]);
        void load();
      })
      .catch((e: unknown) => { status.textContent = errorText(e) })
      .finally(() => { input.value = '' });
  };

  input.addEventListener('change', () => upload([...(input.files ?? [])]));
  let timer = 0;
  search.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(() => void load(), 300) });

  const root = h('div', { class: 'media-library' },
    h('div', { class: 'media-bar' }, uploadBtn, newFolderBtn, search, input),
    crumbs, usage, status, folderGrid, grid,
    h('p', { class: 'hint' }, 'اسحب الملفات من جهازك وأفلتها هنا لرفعها إلى المجلد الحالي، واسحب أي ملف إلى مجلد لنقله إليه. الصور والفيديو وPDF تُعرض في الموقع، وباقي الأنواع تُنزَّل.'));
  root.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types.includes('Files')) { e.preventDefault(); root.classList.add('drag') }
  });
  root.addEventListener('dragleave', (e) => { if (e.target === root) root.classList.remove('drag') });
  root.addEventListener('drop', (e) => {
    root.classList.remove('drag');
    if (!e.dataTransfer?.files.length) return;
    e.preventDefault();
    upload([...e.dataTransfer.files]);
  });
  void load();
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
