import type { ContentDocument, ContentGroup } from '../../domain/content';

/** What each known document holds, so the dashboard can name it in plain words. */
const KNOWN: Readonly<Record<string, Omit<ContentDocument, 'path'>>> = {
  'company.json': { group: 'identity', title: 'المؤسسة', description: 'الاسم والنبذة والرؤية والرسالة والأفلام ومعارض الصور' },
  'contact.json': { group: 'identity', title: 'التواصل', description: 'الجوال وواتساب والبريد والعنوان والخريطة' },
  'ceo.json': { group: 'identity', title: 'كلمة الرئيس التنفيذي', description: 'الاسم والمسمى والصورة والاقتباس والتوقيع' },
  'services.json': { group: 'sections', title: 'الخدمات', description: 'قائمة الخدمات وأيقوناتها' },
  'products.json': { group: 'sections', title: 'المنتجات', description: 'فئات المنتجات' },
  'advantages.json': { group: 'sections', title: 'لماذا النظرة الساحرة', description: 'المزايا وصورتها' },
  'journey.json': { group: 'sections', title: 'رحلة العمل', description: 'خطوات العمل مع العميل' },
  'levels.json': { group: 'sections', title: 'مستويات التعامل', description: 'مستويات الخدمة' },
  'projects.json': { group: 'sections', title: 'معرض المشاريع', description: 'المشاريع وصورها وطريقة عرضها' },
  'clients.json': { group: 'sections', title: 'العملاء والشركاء', description: 'فئات العملاء والشركاء والشهادات' },
  'faq.json': { group: 'sections', title: 'الأسئلة الشائعة', description: 'الأسئلة وإجاباتها' },
  'villa-wood.json': { group: 'catalogues', title: 'فيلا الخشب', description: 'كتالوج الفيلا: المساحات والقطع والخامات' },
  'service-pages.json': { group: 'pages', title: 'صفحات الخدمات', description: 'صفحة لكل خدمة: نصها وصورها وأسئلتها وكلماتها المفتاحية' },
  'site.json': { group: 'pages', title: 'الصفحات الداخلية', description: 'نصوص صفحات من نحن والخدمات والمقاولات والمشاريع والتواصل' },
  'seo.json': { group: 'settings', title: 'محركات البحث', description: 'العنوان والوصف والكلمات المفتاحية وبيانات النشاط' },
  'catalogues.json': { group: 'settings', title: 'فهرس الكتالوجات', description: 'يُكتب تلقائياً من ملفات الكتالوجات عند الحفظ' },
};

export const GROUP_TITLES: Readonly<Record<ContentGroup, string>> = {
  identity: 'الهوية والتواصل',
  sections: 'أقسام الموقع',
  catalogues: 'الكتالوجات',
  pages: 'الصفحات',
  settings: 'الإعدادات',
};

const GROUP_ORDER: readonly ContentGroup[] = ['identity', 'sections', 'catalogues', 'pages', 'settings'];

/** Documents the dashboard shows but does not let people edit, because a script writes them. */
export const GENERATED_DOCUMENTS: ReadonlySet<string> = new Set(['catalogues.json']);

const PROJECT = /^projects\/([a-z0-9-]+)\.json$/;

/**
 * Names a document. Project catalogues take their name from `projectNames` (slug → Arabic name) when
 * given; unknown files still show, under settings, by their file name.
 */
export function describeDocument(path: string, projectNames: Readonly<Record<string, string>> = {}): ContentDocument {
  const known = KNOWN[path];
  if (known) return { path, ...known };
  const project = PROJECT.exec(path)?.[1];
  if (project) {
    return { path, group: 'catalogues', title: projectNames[project] ?? project.replace(/-/g, ' '), description: 'كتالوج مشروع' };
  }
  return { path, group: 'settings', title: path, description: 'ملف بيانات' };
}

export interface DocumentGroup {
  readonly group: ContentGroup;
  readonly title: string;
  readonly documents: readonly ContentDocument[];
}

/** Groups documents in menu order, keeping the order of the known list inside each group. */
export function groupDocuments(documents: readonly ContentDocument[]): readonly DocumentGroup[] {
  const known = Object.keys(KNOWN);
  const rank = (d: ContentDocument): number => {
    const i = known.indexOf(d.path);
    return i === -1 ? known.length : i;
  };
  return GROUP_ORDER
    .map((group) => ({
      group,
      title: GROUP_TITLES[group],
      documents: documents.filter((d) => d.group === group)
        .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, 'ar')),
    }))
    .filter((g) => g.documents.length > 0);
}
