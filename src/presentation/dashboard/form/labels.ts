/** Arabic names for the field keys used across the data files. Unknown keys show as they are. */
const LABELS: Readonly<Record<string, string>> = {
  ar: 'بالعربية', en: 'بالإنجليزية',
  name: 'الاسم', title: 'العنوان', subtitle: 'العنوان الفرعي', kicker: 'العنوان الصغير', heading: 'العنوان الرئيسي',
  tagline: 'الشعار', text: 'النص', lead: 'المقدمة', intro: 'المقدمة', note: 'ملاحظة', description: 'الوصف',
  paragraphs: 'الفقرات', message: 'الرسالة', quote: 'الاقتباس', highlight: 'الجملة البارزة',
  items: 'العناصر', steps: 'الخطوات', points: 'النقاط', traits: 'السمات', facts: 'الحقائق',
  image: 'الصورة', images: 'الصور', photo: 'الصورة', cover: 'الغلاف', poster: 'صورة الغلاف', video: 'الفيديو',
  src: 'المسار', caption: 'وصف الصورة', alt: 'النص البديل', aspectRatio: 'نسبة العرض', ratio: 'نسبة العرض', type: 'النوع',
  icon: 'الأيقونة', color: 'اللون', colors: 'الألوان', palette: 'لوحة الألوان', style: 'نمط العرض', layout: 'طريقة العرض',
  phone: 'الجوال', whatsapp: 'واتساب', email: 'البريد', website: 'الموقع', address: 'العنوان', handle: 'الحساب',
  mapQuery: 'البحث في الخريطة', mapUrl: 'رابط الخريطة', mapImage: 'صورة الخريطة',
  role: 'المسمى', signature: 'التوقيع', city: 'المدينة', category: 'الفئة', place: 'المكان', id: 'المعرّف',
  slug: 'الرابط المختصر', href: 'الرابط', cta: 'نص الزر', keywords: 'الكلمات المفتاحية', faq: 'الأسئلة',
  question: 'السؤال', answer: 'الإجابة', q: 'السؤال', a: 'الإجابة',
  hero: 'الواجهة الرئيسية', feature: 'القسم المميز', about: 'من نحن', statements: 'الرؤية والرسالة والقيمة',
  interiorDesign: 'التصميم الداخلي', films: 'الأفلام', collections: 'معارض الصور', closingLine: 'جملة الختام',
  entityType: 'نوع الكيان', field: 'المجال', segments: 'فئات العملاء', partners: 'الشركاء', credentials: 'الشهادات',
  before: 'قبل', after: 'بعد', spaces: 'المساحات', products: 'القطع', materials: 'الخامات', swatch: 'عينة الخامة',
  card: 'صورة البطاقة', closing: 'الختام', film: 'الفيلم', collection: 'المجموعة', pages: 'الصفحات',
  tag: 'الوسم', spots: 'النقاط على الصورة', siteUrl: 'رابط الموقع', logo: 'الشعار', business: 'بيانات النشاط',
  social: 'الحسابات الرسمية', verification: 'رموز التحقق', aiCrawlers: 'السماح لمساعدي الذكاء الاصطناعي',
  openingHours: 'ساعات العمل', priceRange: 'نطاق الأسعار', areaServed: 'مناطق الخدمة', country: 'الدولة',
  region: 'المنطقة', latitude: 'خط العرض', longitude: 'خط الطول', foundingDate: 'تاريخ التأسيس', types: 'الأنواع',
};

export const fieldLabel = (key: string): string => LABELS[key] ?? key;
