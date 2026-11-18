import './styles/tokens.css';
import './styles/base.css';
import './styles/site.css';
import { initSiteChrome } from './presentation/siteChrome';
import { openImageViewer } from './presentation/components/ImageViewer';

// Every page's content is already in its HTML (see build/site.ts). This adds what needs a browser.
initSiteChrome(document.body.dataset.root ?? './');

/** Old one-page links such as "#contact" or "#collection-3-2" lead to the page that holds them now. */
function followLegacyHash(): void {
  const data = document.getElementById('legacy-routes');
  const id = decodeURIComponent(location.hash.slice(1));
  if (!data?.textContent || !id || document.getElementById(id)) return;
  const target = (JSON.parse(data.textContent) as Record<string, string>)[id];
  if (target) location.replace(target);
}

function initZoom(): void {
  document.querySelectorAll<HTMLImageElement>('[data-zoom] img').forEach((img) => {
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'media-open';
    open.setAttribute('aria-label', `تكبير الصورة: ${img.alt}`);
    open.setAttribute('aria-haspopup', 'dialog');
    open.addEventListener('click', () => openImageViewer(img.currentSrc || img.src, img.alt));
    img.parentElement?.append(open);
  });
}

function initProjectFilters(): void {
  const bar = document.querySelector<HTMLElement>('[data-filters]');
  const list = document.querySelector<HTMLElement>('[data-filter-list]');
  if (!bar || !list) return;
  bar.hidden = false;
  const buttons = [...bar.querySelectorAll<HTMLButtonElement>('button')];
  buttons.forEach((button) => button.addEventListener('click', () => {
    const place = button.dataset.filter ?? '';
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    list.querySelectorAll<HTMLElement>('li').forEach((item) => {
      item.hidden = place !== '' && item.dataset.place !== place;
    });
  }));
}

/** The quote form keeps nothing: it writes a WhatsApp message for the visitor to review and send. */
function initQuoteForm(): void {
  const form = document.querySelector<HTMLFormElement>('#quote-form');
  if (!form) return;
  const select = form.elements.namedItem('service') as HTMLSelectElement;
  const details = form.elements.namedItem('details') as HTMLTextAreaElement;
  const params = new URLSearchParams(location.search);
  const wanted = params.get('type') ?? params.get('service');
  if (wanted && [...select.options].some((o) => o.value === wanted)) select.value = wanted;
  const project = params.get('project');
  if (project) {
    select.value = 'other';
    details.value = `أرغب في مشروع مشابه لـ: ${project}`;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = (name: string): string =>
      (form.elements.namedItem(name) as HTMLInputElement).value.trim();
    const lines = [
      'السلام عليكم، أرغب في طلب عرض سعر.',
      `الاسم: ${value('name')}`,
      value('city') && `المدينة: ${value('city')}`,
      `نوع الطلب: ${select.selectedOptions[0]?.text ?? ''}`,
      value('details') && `التفاصيل: ${value('details')}`,
    ].filter(Boolean);
    window.open(`https://wa.me/${form.dataset.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });
}

function initHeroVideo(): void {
  const video = document.querySelector<HTMLVideoElement>('[data-hero-video]');
  if (video && matchMedia('(prefers-reduced-motion: reduce)').matches) video.pause();
}

followLegacyHash();
initZoom();
initProjectFilters();
initQuoteForm();
initHeroVideo();
