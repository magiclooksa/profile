import type { Company, Contact as ContactData, IconName } from '../../domain/entities';
import { h, orPlaceholder, splitWords } from '../dom';
import { icon, pattern } from '../icons';
import { MediaView, RoundButton } from './shared';

function Card(iconName: IconName, label: string, value: string, href?: string | null): HTMLElement {
  const text = href ? h('a', { href, target: '_blank', rel: 'noopener' }, value) : h('bdi', {}, value);
  return h('div', { class: 'card reveal' }, icon(iconName), h('div', {}, h('small', {}, label), text));
}

/** The first way to reach the company that is filled in, for the round call-to-action. */
function primaryLink(contact: ContactData): { href: string; external: boolean } | null {
  if (contact.phone) return { href: `tel:${contact.phone.replace(/[^\d+]/g, '')}`, external: false };
  if (contact.email) return { href: `mailto:${contact.email}`, external: false };
  if (contact.website) return { href: `https://${contact.website.replace(/^https?:\/\//, '')}`, external: true };
  return null;
}

export const Contact = (company: Company, contact: ContactData): HTMLElement => {
  const map = MediaView(contact.mapImage);
  const primary = primaryLink(contact);
  return h('section', { class: 'contact band', id: 'contact' },
    pattern(),
    h('div', { class: 'wrap' },
      h('div', { class: 'cta' },
        h('div', {},
          h('h2', { class: 'split reveal' }, splitWords('شكرًا لك')),
          h('p', { class: 'say reveal' }, company.closingLine)),
        primary ? RoundButton('تواصل معنا', primary.href, primary.external) : null),
      h('div', { class: 'grid' },
        h('div', { class: 'cards' },
          Card('phone', 'الجوال', orPlaceholder(contact.phone, 'رقم الجوال')),
          Card('mail', 'البريد الإلكتروني', orPlaceholder(contact.email, 'البريد الإلكتروني')),
          Card('web', 'الموقع الإلكتروني', orPlaceholder(contact.website, 'الموقع الإلكتروني'),
            contact.website ? `https://${contact.website.replace(/^https?:\/\//, '')}` : null),
          Card('pin', 'موقع المعرض',
            `${orPlaceholder(contact.address, 'الحي، الشارع، المدينة')}، المملكة العربية السعودية`, contact.mapUrl)),
        contact.mapUrl ? h('div', { class: 'map-panel' }, map,
          h('a', { class: 'map-link', href: contact.mapUrl, target: '_blank', rel: 'noopener' }, 'فتح الموقع على الخريطة')) : map)));
};
