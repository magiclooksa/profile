import type { Contact } from '../../domain/entities';
import { h } from '../dom';
import { pattern } from '../icons';
import { Logo } from '../brand';

export interface FooterLink { readonly href: string; readonly label: string }

export interface FooterProps {
  readonly name: { readonly ar: string; readonly en: string };
  /** One line under the logo. */
  readonly tagline: string;
  /** Where the logo leads. */
  readonly home: string;
  /** The top of the current page. */
  readonly top: string;
  readonly links: readonly FooterLink[];
  /** Only the details that exist are listed; missing ones are left out, not shown as placeholders. */
  readonly contact?: Pick<Contact, 'phone' | 'email' | 'website' | 'address' | 'mapUrl'> | null;
  /** Where "contact us" leads when no contact detail is known yet. */
  readonly contactHref: string;
}

const column = (title: string, ...children: (Node | null)[]): HTMLElement =>
  h('div', { class: 'footer-col' }, h('h2', {}, title), ...children);

function contactItems(contact: FooterProps['contact']): HTMLElement[] {
  if (!contact) return [];
  const items: HTMLElement[] = [];
  if (contact.phone) items.push(h('li', {}, h('a', { href: `tel:${contact.phone.replace(/[^\d+]/g, '')}` }, h('bdi', {}, contact.phone))));
  if (contact.email) items.push(h('li', {}, h('a', { href: `mailto:${contact.email}` }, h('bdi', {}, contact.email))));
  if (contact.website) {
    const url = `https://${contact.website.replace(/^https?:\/\//, '')}`;
    items.push(h('li', {}, h('a', { href: url, target: '_blank', rel: 'noopener' }, h('bdi', {}, contact.website))));
  }
  if (contact.address) {
    items.push(h('li', {}, contact.mapUrl
      ? h('a', { href: contact.mapUrl, target: '_blank', rel: 'noopener' }, contact.address)
      : contact.address));
  }
  return items;
}

/** Site footer, shared by the profile and the catalogue: the guide's reverse logo on Deep Forest Green. */
export function Footer(props: FooterProps): HTMLElement {
  const label = `${props.name.ar} ${props.name.en}`;
  const details = contactItems(props.contact);
  return h('footer', { class: 'site-footer' },
    pattern(),
    h('div', { class: 'wrap' },
      h('div', { class: 'footer-main' },
        h('div', { class: 'footer-brand' },
          h('a', { href: props.home, 'aria-label': label }, Logo('horizontal')),
          h('p', {}, props.tagline)),
        column('تصفّح',
          h('ul', {}, props.links.map((l) => h('li', {}, h('a', { href: l.href }, l.label))))),
        column('تواصل معنا',
          details.length ? h('ul', {}, details) : h('p', {}, 'نسعد بزيارتك وباستقبال استفسارك.'),
          h('a', { class: 'footer-cta', href: props.contactHref }, 'ابدأ مشروعك'))),
      h('div', { class: 'footer-bar' },
        h('p', {}, `© ${new Date().getFullYear()} ${props.name.ar} · ${props.name.en}`),
        h('a', { href: props.top }, 'العودة إلى الأعلى'))));
}
