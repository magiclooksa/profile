import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/service.css';
import { Logo } from './presentation/brand';
import { Footer } from './presentation/components/Footer';
import { openImageViewer } from './presentation/components/ImageViewer';

// A service page (services/<slug>.html). Its content is already in the HTML, written at build
// time for search engines; this only adds the logo, the shared footer and full-screen photos.
document.querySelector('.sp-brand')?.append(Logo('horizontal'));

document.querySelectorAll<HTMLImageElement>('.sp-grid img, .sp-hero-img img').forEach((img) => {
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'media-open';
  open.setAttribute('aria-label', `تكبير الصورة: ${img.alt}`);
  open.setAttribute('aria-haspopup', 'dialog');
  open.addEventListener('click', () => openImageViewer(img.currentSrc || img.src, img.alt));
  img.parentElement?.append(open);
});

document.body.append(Footer({
  name: { ar: 'النظرة الساحرة', en: 'MAGIC LOOK' },
  tagline: 'للتصميم الداخلي والديكور والتأثيث',
  home: '../index.html',
  top: '#sp-title',
  links: [
    { href: '../index.html#about', label: 'من نحن' },
    { href: '../index.html#services', label: 'خدماتنا' },
    { href: '../index.html#products', label: 'منتجاتنا' },
    { href: '../index.html#projects', label: 'مشاريعنا' },
    { href: '../index.html#faq', label: 'الأسئلة الشائعة' },
  ],
  contactHref: '../index.html#contact',
}));
