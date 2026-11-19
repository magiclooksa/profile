import type { DocumentGroup } from '../../../application/content/catalog';
import type { DashboardStats } from '../../../application/content/ContentService';
import { h } from '../../shared/dom';
import { documentHref } from '../routes';

const STAT_LABELS: readonly [keyof DashboardStats, string][] = [
  ['catalogues', 'كتالوج'],
  ['projects', 'مشروع في المعرض'],
  ['servicePages', 'صفحة خدمة'],
  ['products', 'فئة منتجات'],
  ['faq', 'سؤال شائع'],
  ['media', 'صورة وفيلم'],
];

/** The home of the dashboard: the numbers at a glance, then every document by group. */
export function renderOverview(groups: readonly DocumentGroup[], stats: DashboardStats): HTMLElement {
  return h('div', { class: 'view overview' },
    h('header', { class: 'view-head' },
      h('div', {},
        h('p', { class: 'kicker' }, 'لوحة التحكم'),
        h('h1', {}, 'محتوى الموقع'),
        h('p', { class: 'muted' }, 'اختر قسماً لتعديله. يُفحص كل تعديل قبل حفظه، فلا يصل خطأ إلى الموقع.'))),
    h('section', { class: 'stats', 'aria-label': 'أرقام الموقع' },
      STAT_LABELS.map(([key, label]) =>
        h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, String(stats[key])), h('span', { class: 'stat-label' }, label)))),
    groups.map((group) => h('section', { class: 'doc-group' },
      h('h2', {}, group.title),
      h('ul', { class: 'doc-cards' }, group.documents.map((d) =>
        h('li', {}, h('a', { class: 'doc-card', href: documentHref(d.path) },
          h('span', { class: 'doc-title' }, d.title),
          h('span', { class: 'doc-desc' }, d.description),
          h('span', { class: 'doc-path', dir: 'ltr' }, d.path))))))),
    h('aside', { class: 'note' },
      h('h2', {}, 'كيف تصل التعديلات إلى الموقع المنشور؟'),
      h('ol', {},
        h('li', {}, 'يحفظ زر «حفظ» الملف في مجلد public/data ويحدّث صفحات الكتالوجات والخدمات.'),
        h('li', {}, 'راجع النتيجة في الموقع المحلي من رابط «عرض الموقع».'),
        h('li', {}, 'ارفع التعديلات إلى فرع main على GitHub، فيُبنى الموقع ويُنشر تلقائياً.'))));
}
