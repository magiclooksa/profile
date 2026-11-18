import type { Company, Contact as ContactData, IconName } from '../../domain/entities';
import { h } from '../dom';
import { icon } from '../icons';

function Card(iconName: IconName, label: string, value: string, href?: string | null): HTMLElement {
  const external = href?.startsWith('http');
  const text = href
    ? h('a', { href, ...(external ? { target: '_blank', rel: 'noopener' } : {}) }, h('bdi', {}, value))
    : h('bdi', {}, value);
  return h('div', { class: 'card' }, icon(iconName), h('div', {}, h('small', {}, label), text));
}

/** Only the details that exist get a card. */
function cards(contact: ContactData): HTMLElement[] {
  const { phone, whatsapp, handle, email, website, address, mapUrl } = contact;
  return [
    phone ? Card('phone', 'الجوال', phone, `tel:+966${phone.replace(/\D/g, '').replace(/^0/, '')}`) : null,
    whatsapp ? Card('phone', 'واتساب', 'راسلنا على واتساب', `https://wa.me/${whatsapp}`) : null,
    handle ? Card('web', 'حساباتنا', handle) : null,
    email ? Card('mail', 'البريد الإلكتروني', email, `mailto:${email}`) : null,
    website ? Card('web', 'الموقع الإلكتروني', website, `https://${website.replace(/^https?:\/\//, '')}`) : null,
    address ? Card('pin', 'موقع المعرض', `${address}، المملكة العربية السعودية`, mapUrl) : null,
  ].filter((c): c is HTMLElement => c !== null);
}

/** The map is loaded from Google only when the visitor nears it. */
function ShowroomMap(contact: ContactData): HTMLElement | null {
  const place = contact.mapQuery ?? contact.address;
  if (!place) return null;
  const src = `https://www.google.com/maps?q=${encodeURIComponent(place)}&z=17&hl=ar&output=embed`;
  const frame = h('iframe', {
    title: `موقع المعرض على الخريطة: ${contact.address ?? ''}`,
    referrerpolicy: 'no-referrer-when-downgrade',
  });
  const figure = h('figure', { class: 'media contact-map' }, frame);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      frame.src = src;
      observer.disconnect();
    }, { rootMargin: '600px 0px' });
    observer.observe(figure);
  } else {
    frame.src = src;
  }
  return h('div', { class: 'map-panel' }, figure,
    contact.mapUrl ? h('a', { class: 'map-link', href: contact.mapUrl, target: '_blank', rel: 'noopener' }, 'فتح الموقع على الخريطة') : null);
}

export const Contact = (company: Company, contact: ContactData): HTMLElement =>
  h('section', { class: 'contact', id: 'contact' },
    h('div', { class: 'wrap' },
      h('div', { class: 'grid' },
        h('div', { class: 'reveal' },
          h('h2', {}, 'شكرًا لك'),
          h('p', { class: 'say' }, company.closingLine),
          h('div', { class: 'cards' }, cards(contact)),
          h('div', { class: 'ctas' }, h('a', { class: 'btn solid', href: 'contact.html#quote' }, 'اطلب عرض سعر'))),
        ShowroomMap(contact))));
