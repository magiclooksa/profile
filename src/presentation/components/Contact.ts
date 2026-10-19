import type { Company, Contact as ContactData, IconName } from '../../domain/entities';
import { h, orPlaceholder } from '../dom';
import { icon } from '../icons';
import { MediaView } from './shared';

function Card(iconName: IconName, label: string, value: string, href?: string | null): HTMLElement {
  const text = href ? h('a', { href, target: '_blank', rel: 'noopener' }, value) : h('bdi', {}, value);
  return h('div', { class: 'card' }, icon(iconName), h('div', {}, h('small', {}, label), text));
}

export const Contact = (company: Company, contact: ContactData): HTMLElement => {
  const map = MediaView(contact.mapImage);
  return h('section', { class: 'contact', id: 'contact' },
    h('div', { class: 'wrap' },
      h('div', { class: 'grid' },
        h('div', { class: 'reveal' },
          h('h2', {}, 'شكرًا لك'),
          h('p', { class: 'say' }, company.closingLine),
          h('div', { class: 'cards' },
            Card('phone', 'الجوال', orPlaceholder(contact.phone, 'رقم الجوال')),
            Card('mail', 'البريد الإلكتروني', orPlaceholder(contact.email, 'البريد الإلكتروني')),
            Card('web', 'الموقع الإلكتروني', orPlaceholder(contact.website, 'الموقع الإلكتروني'),
              contact.website ? `https://${contact.website.replace(/^https?:\/\//, '')}` : null),
            Card('pin', 'موقع المعرض',
              `${orPlaceholder(contact.address, 'الحي، الشارع، المدينة')}، المملكة العربية السعودية`, contact.mapUrl))),
        contact.mapUrl ? h('a', { class: 'map-link', href: contact.mapUrl, target: '_blank', rel: 'noopener' }, map) : map)));
};
