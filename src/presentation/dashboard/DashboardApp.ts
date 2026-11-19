import { describeDocument, type DocumentGroup } from '../../application/content/catalog';
import type { ContentService } from '../../application/content/ContentService';
import { SessionExpiredError, type PublishStatus, type SessionGateway } from '../../domain/content';
import { h } from '../shared/dom';
import { documentHref, parseRoute, type Route } from './routes';
import { DocumentView } from './views/DocumentView';
import { renderLogin } from './views/LoginView';
import { renderOverview } from './views/OverviewView';

export interface DashboardOptions {
  /** Where the site's files are served from, relative to the dashboard page. */
  readonly siteBase: string;
}

const MEDIA_LIST_ID = 'media-library';
const STATUS_POLL_MS = 4000;

const PUBLISH_LABELS: Readonly<Record<PublishStatus['state'], string>> = {
  live: 'الموقع محدَّث',
  building: 'يُحدَّث الموقع…',
  failed: 'تعذّر تحديث الموقع',
};

/** The dashboard shell: sign-in, the menu, the router, and the guard against losing unsaved changes. */
export class DashboardApp {
  private groups: readonly DocumentGroup[] = [];
  private current: DocumentView | null = null;
  private hash = location.hash;
  private listening = false;
  private pollTimer: number | null = null;
  private readonly view = h('main', { class: 'dash-main', id: 'main', tabindex: '-1' });
  private readonly nav = h('nav', { class: 'dash-nav', 'aria-label': 'أقسام المحتوى' });
  private readonly publish = h('p', { class: 'publish-state', role: 'status', 'aria-live': 'polite' });
  private readonly mediaList = h('datalist', { id: MEDIA_LIST_ID });

  constructor(
    private readonly root: HTMLElement,
    private readonly service: ContentService,
    private readonly session: SessionGateway,
    private readonly options: DashboardOptions,
  ) {}

  async start(): Promise<void> {
    const { authenticated } = await this.session.status();
    if (authenticated) await this.open();
    else this.showLogin();
  }

  private showLogin(notice?: string): void {
    this.current = null;
    this.stopPolling();
    this.root.removeAttribute('aria-busy');
    this.root.classList.add('is-login');
    this.root.replaceChildren(renderLogin(this.session, this.options.siteBase, () => void this.open(), notice));
  }

  private async open(): Promise<void> {
    const [groups, media, { required }] = await Promise.all([
      this.service.listDocuments(), this.service.listMedia().catch(() => []), this.session.status(),
    ]);
    this.groups = groups;
    this.mediaList.replaceChildren(...media.map((path) => h('option', { value: path })));

    const logout = h('button', { type: 'button', class: 'dash-logout' }, 'تسجيل الخروج');
    logout.addEventListener('click', () => {
      if (this.current?.isDirty && !confirm('في الصفحة تعديلات غير محفوظة. الخروج دون حفظ؟')) return;
      void this.session.logout().finally(() => this.showLogin());
    });

    this.root.classList.remove('is-login');
    this.root.replaceChildren(
      h('a', { class: 'skip', href: '#main' }, 'تخطَّ إلى المحتوى'),
      h('aside', { class: 'dash-side' },
        h('a', { class: 'dash-brand', href: '#/' },
          h('img', { src: `${this.options.siteBase}assets/brand/logo-on-green.svg`, alt: 'النظرة الساحرة', width: 150, height: 35 }),
          h('span', {}, 'لوحة التحكم')),
        this.nav,
        this.publish,
        h('a', { class: 'dash-site-link', href: `${this.options.siteBase}index.html`, target: '_blank', rel: 'noopener' }, 'عرض الموقع ↗'),
        required ? logout : null),
      this.view,
      this.mediaList);
    this.root.removeAttribute('aria-busy');

    if (!this.listening) {
      this.listening = true;
      window.addEventListener('hashchange', () => void this.onHashChange());
      window.addEventListener('beforeunload', (event) => { if (this.current?.isDirty) event.preventDefault(); });
      document.addEventListener('keydown', (event) => this.current?.handleKey(event));
    }
    void this.refreshPublishState();
    await this.show(parseRoute(location.hash));
  }

  private async onHashChange(): Promise<void> {
    if (this.current?.isDirty && !confirm('في الصفحة تعديلات غير محفوظة. الخروج دون حفظ؟')) {
      history.replaceState(null, '', this.hash);
      return;
    }
    this.hash = location.hash;
    await this.show(parseRoute(location.hash));
  }

  /** Shows whether the site already has the last save; checks again while a build runs. */
  private async refreshPublishState(): Promise<void> {
    this.stopPolling();
    try {
      const status = await this.service.publishStatus();
      this.publish.dataset.state = status.state;
      this.publish.textContent = PUBLISH_LABELS[status.state];
      this.publish.title = status.message ?? '';
      if (status.state === 'building') {
        this.pollTimer = window.setTimeout(() => void this.refreshPublishState(), STATUS_POLL_MS);
      }
    } catch (error) {
      if (error instanceof SessionExpiredError) this.showLogin(error.message);
    }
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) window.clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  private renderNav(route: Route): void {
    const active = route.name === 'document' ? route.path : null;
    const link = (href: string, label: string, current: boolean): HTMLAnchorElement =>
      h('a', { class: 'nav-link', href, 'aria-current': current ? 'page' : null }, label);
    this.nav.replaceChildren(
      link('#/', 'نظرة عامة', active === null),
      ...this.groups.map((group) => h('div', { class: 'nav-group' },
        h('p', { class: 'nav-group-title' }, group.title),
        group.documents.map((d) => link(documentHref(d.path), d.title, d.path === active)))),
    );
  }

  private async show(route: Route): Promise<void> {
    this.current = null;
    this.renderNav(route);
    this.view.replaceChildren(h('p', { class: 'loading' }, 'جارٍ التحميل…'));
    try {
      if (route.name === 'overview') {
        this.view.replaceChildren(renderOverview(this.groups, await this.service.stats()));
      } else {
        const doc = this.groups.flatMap((g) => g.documents).find((d) => d.path === route.path)
          ?? describeDocument(route.path);
        const view = new DocumentView(this.service, doc, await this.service.loadDocument(route.path), {
          mediaBase: this.options.siteBase,
          mediaListId: MEDIA_LIST_ID,
          onDirtyChange: (dirty) => { document.title = `${dirty ? '• ' : ''}${doc.title} | لوحة التحكم`; },
          onSaved: () => void this.refreshPublishState(),
          onUploaded: (path) => this.mediaList.append(h('option', { value: path })),
          onSessionExpired: () => this.showLogin('انتهت الجلسة. سجّل الدخول ثم احفظ من جديد.'),
        });
        this.current = view;
        document.title = `${doc.title} | لوحة التحكم`;
        this.view.replaceChildren(view.element);
      }
      this.view.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    } catch (error) {
      if (error instanceof SessionExpiredError) this.showLogin(error.message);
      else this.view.replaceChildren(renderError(error));
    }
  }
}

export function renderError(error: unknown): HTMLElement {
  return h('div', { class: 'view' },
    h('p', { class: 'alert alert-error' }, error instanceof Error ? error.message : String(error)),
    h('p', { class: 'muted' }, 'تأكد أن خادم الموقع يعمل، ثم أعد تحميل الصفحة.'));
}
