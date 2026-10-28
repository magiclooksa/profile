import '../styles/tokens.css';
import '../styles/admin.css';
import { apiBase } from '../infrastructure/api';
import { h } from '../presentation/dom';
import { AdminClient, ApiError, type SectionInfo } from './client';
import { renderEditor, revealPath, type Json } from './editor';
import { MediaLibrary, pickMedia } from './media';
import { MessagesView } from './messages';

// Dashboard: edit every section of the site, manage uploaded files, read contact requests.
const app = document.getElementById('admin');
if (!app) throw new Error('#admin not found');

const client = new AdminClient(apiBase());
const siteUrl = import.meta.env.BASE_URL;
let dirty = false;

window.addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault() });
client.onLoggedOut = () => { dirty = false; showLogin('انتهت الجلسة، سجّل الدخول من جديد.') };

const when = (iso: string | null): string => iso
  ? new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' })
  : 'لم يُنقل إلى قاعدة البيانات بعد';

function showLogin(note = ''): void {
  const password = h('input', { type: 'password', autocomplete: 'current-password', required: true, id: 'pw' });
  const error = h('p', { class: 'login-error', role: 'alert' }, note);
  const submit = h('button', { type: 'submit', class: 'ed-btn primary' }, 'دخول');
  const form = h('form', { class: 'login' },
    h('i', { class: 'login-mark', 'aria-hidden': 'true' }),
    h('h1', {}, 'لوحة التحكم'),
    h('p', {}, 'النظرة الساحرة · MAGIC LOOK'),
    h('label', { for: 'pw' }, 'كلمة المرور'), password, error, submit);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit.disabled = true;
    error.textContent = '';
    client.login(password.value)
      .then(() => { location.hash ||= '#section/company'; void showShell() })
      .catch((err: Error) => { error.textContent = err.message; submit.disabled = false; password.select() });
  });
  app!.replaceChildren(h('main', { class: 'login-page' }, form));
  password.focus();
}

async function showShell(): Promise<void> {
  let sections: SectionInfo[];
  try {
    sections = await client.sections();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return;
    app!.replaceChildren(h('main', { class: 'login-page' }, h('div', { class: 'login' },
      h('h1', {}, 'تعذّر الاتصال بالخادم'), h('p', {}, (e as Error).message),
      h('p', {}, 'تأكد أن الخادم يعمل (npm start) وأن MONGODB_URI صحيح.'))));
    return;
  }

  const unread = h('span', { class: 'badge', hidden: true });
  const nav = h('nav', { class: 'side-nav' },
    h('p', { class: 'side-title' }, 'المحتوى'),
    ...sections.map((s) => h('a', { href: `#section/${s.key}`, 'data-route': `section/${s.key}` }, s.label)),
    h('p', { class: 'side-title' }, 'أخرى'),
    h('a', { href: '#media', 'data-route': 'media' }, 'مكتبة الملفات'),
    h('a', { href: '#messages', 'data-route': 'messages' }, 'رسائل التواصل', unread));
  const logout = h('button', { type: 'button', class: 'ed-btn quiet' }, 'تسجيل الخروج');
  logout.addEventListener('click', () => {
    if (dirty && !confirm('لديك تعديلات غير محفوظة. الخروج على أي حال؟')) return;
    dirty = false; client.logout(); showLogin();
  });
  const menu = h('button', { type: 'button', class: 'ed-btn quiet menu-btn', 'aria-label': 'القائمة' }, '☰');
  const view = h('section', { class: 'view' });
  const shell = h('div', { class: 'shell' },
    h('header', { class: 'topbar' }, menu,
      h('a', { class: 'brand', href: '#section/company' }, h('i', { class: 'login-mark', 'aria-hidden': 'true' }), h('span', {}, h('b', {}, 'النظرة الساحرة'), h('small', {}, 'لوحة التحكم'))),
      h('div', { class: 'ed-row' }, h('a', { class: 'ed-btn quiet', href: siteUrl, target: '_blank' }, 'عرض الموقع'), logout)),
    h('aside', { class: 'side' }, nav),
    view);
  menu.addEventListener('click', () => shell.classList.toggle('nav-open'));
  app!.replaceChildren(shell);

  const setUnread = (n: number): void => { unread.hidden = n === 0; unread.textContent = String(n) };
  client.messages().then((m) => setUnread(m.filter((x) => !x.read).length)).catch(() => {});

  let current = '';
  const route = (): void => {
    const target = location.hash.slice(1) || 'section/company';
    if (target === current) return;
    if (dirty && !confirm('لديك تعديلات غير محفوظة. تركها؟')) { location.hash = current; return }
    dirty = false;
    current = target;
    shell.classList.remove('nav-open');
    nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.dataset.route === target));
    if (target === 'media') {
      view.replaceChildren(h('h1', {}, 'مكتبة الملفات'), MediaLibrary(client));
    } else if (target === 'messages') {
      view.replaceChildren(h('h1', {}, 'رسائل التواصل'), MessagesView(client, setUnread));
    } else {
      const section = sections.find((s) => `section/${s.key}` === target) ?? sections[0]!;
      void sectionView(view, section);
    }
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', route);
  route();
}

async function sectionView(view: HTMLElement, section: SectionInfo): Promise<void> {
  view.replaceChildren(h('h1', {}, section.label), h('p', { class: 'media-status' }, 'جارٍ التحميل…'));

  let data: Json;
  let fromFile = false;
  try {
    data = await client.section(section.key) as Json;
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 404)) {
      view.replaceChildren(h('h1', {}, section.label), h('p', { class: 'login-error' }, (e as Error).message));
      return;
    }
    // Not in the database yet: start from the file shipped with the site.
    const r = await fetch(`${siteUrl}data/${section.key}.json`);
    data = await r.json() as Json;
    fromFile = true;
  }

  const saved = h('small', { class: 'saved-at' }, fromFile ? 'مصدره الملف الحالي؛ أول حفظ ينقله إلى قاعدة البيانات' : `آخر حفظ: ${when(section.updatedAt)}`);
  const message = h('p', { class: 'save-msg', role: 'status', 'aria-live': 'polite' });
  const save = h('button', { type: 'button', class: 'ed-btn primary', disabled: !fromFile }, 'حفظ التعديلات');
  const modeBtn = h('button', { type: 'button', class: 'ed-btn quiet' }, 'تحرير JSON');
  const historyBtn = h('button', { type: 'button', class: 'ed-btn quiet' }, 'النسخ السابقة');
  const body = h('div', { class: 'section-body' });
  const historyBox = h('div', { class: 'history', hidden: true });
  let jsonMode = false;
  let jsonArea: HTMLTextAreaElement | null = null;

  const markDirty = (): void => { dirty = true; save.disabled = false; message.textContent = ''; message.className = 'save-msg' };
  const ctx = {
    onChange: markDirty,
    upload: (file: File, onProgress: (f: number) => void) =>
      client.upload([file], onProgress).then((files) => files[0]?.url ?? ''),
    pick: () => pickMedia(client),
    resolve: (url: string) => /^(https?:|data:|blob:)/.test(url) ? url
      : url.includes('api/files/') ? client.resolve(url) : `${siteUrl}${url.replace(/^\.?\//, '')}`,
  };

  const draw = (): void => {
    if (jsonMode) {
      jsonArea = h('textarea', { class: 'json-area', dir: 'ltr', spellcheck: 'false' });
      jsonArea.value = JSON.stringify(data, null, 2);
      jsonArea.addEventListener('input', markDirty);
      body.replaceChildren(jsonArea);
    } else {
      jsonArea = null;
      body.replaceChildren(renderEditor(data, section.key, ctx));
    }
  };

  /** In JSON mode, reads the text back into the data. */
  const syncJson = (): boolean => {
    if (!jsonArea) return true;
    try {
      data = JSON.parse(jsonArea.value) as Json;
      return true;
    } catch (e) {
      message.className = 'save-msg err';
      message.textContent = `صيغة JSON غير صحيحة: ${(e as Error).message}`;
      return false;
    }
  };

  modeBtn.addEventListener('click', () => {
    if (!syncJson()) return;
    jsonMode = !jsonMode;
    modeBtn.textContent = jsonMode ? 'العودة للنموذج' : 'تحرير JSON';
    draw();
  });

  save.addEventListener('click', () => {
    if (!syncJson()) return;
    save.disabled = true;
    message.className = 'save-msg';
    message.textContent = 'جارٍ الحفظ…';
    client.save(section.key, data).then(({ updatedAt }) => {
      dirty = false;
      fromFile = false;
      section.updatedAt = updatedAt;
      saved.textContent = `آخر حفظ: ${when(updatedAt)}`;
      message.className = 'save-msg ok';
      message.textContent = 'تم الحفظ ✓ يظهر التعديل في الموقع عند إعادة تحميله.';
      if (!historyBox.hidden) void loadHistory();
    }).catch((e: unknown) => {
      save.disabled = false;
      message.className = 'save-msg err';
      message.textContent = e instanceof Error ? e.message : 'تعذّر الحفظ';
      if (e instanceof ApiError && e.path && !jsonMode) revealPath(body, e.path);
    });
  });

  const loadHistory = async (): Promise<void> => {
    historyBox.replaceChildren(h('p', { class: 'media-status' }, 'جارٍ التحميل…'));
    const versions = await client.history(section.key).catch(() => []);
    historyBox.replaceChildren(
      h('h2', {}, 'النسخ السابقة'),
      versions.length ? h('ul', {}, ...versions.map((v) => {
        const restore = h('button', { type: 'button', class: 'ed-btn quiet' }, 'استرجاع');
        restore.addEventListener('click', () => {
          if (!confirm('استرجاع هذه النسخة؟ النسخة الحالية تُحفظ في السجل أولاً.')) return;
          client.restore(section.key, v.id).then((r) => {
            data = r.data as Json;
            dirty = false;
            save.disabled = true;
            message.className = 'save-msg ok';
            message.textContent = 'تم استرجاع النسخة ✓';
            draw();
            void loadHistory();
          }).catch((e: Error) => alert(e.message));
        });
        return h('li', {}, h('span', {}, when(v.savedAt)), restore);
      })) : h('p', { class: 'hint' }, 'لا توجد نسخ سابقة بعد. كل حفظ يحتفظ بالنسخة التي قبله (آخر 30 نسخة).'));
  };
  historyBtn.addEventListener('click', () => {
    historyBox.hidden = !historyBox.hidden;
    if (!historyBox.hidden) void loadHistory();
  });

  view.replaceChildren(
    h('div', { class: 'section-head' },
      h('div', {}, h('h1', {}, section.label), saved),
      h('div', { class: 'ed-row' }, historyBtn, modeBtn, save)),
    message, historyBox, body);
  draw();
}

if (client.loggedIn) {
  client.check().then(() => showShell()).catch(() => { if (client.loggedIn) void showShell() });
} else {
  showLogin();
}
