import type { Company, Contact as ContactData, IconName } from '../../domain/entities';
import type { ContactMessage, MessageGateway } from '../../domain/MessageGateway';
import { h, orPlaceholder } from '../dom';
import { icon } from '../icons';
import { MediaView } from './shared';

function Card(iconName: IconName, label: string, value: string, href?: string | null): HTMLElement {
  const text = href ? h('a', { href, target: '_blank', rel: 'noopener' }, value) : h('bdi', {}, value);
  return h('div', { class: 'card' }, icon(iconName), h('div', {}, h('small', {}, label), text));
}

const field = (name: keyof ContactMessage, label: string, attrs: Record<string, string | boolean>, multiline = false): HTMLElement =>
  h('label', { class: `cf-field${multiline ? ' wide' : ''}` }, h('span', {}, label),
    multiline ? h('textarea', { name, rows: 5, ...attrs }) : h('input', { name, ...attrs }));

/** The request form: sends the visitor's details to the server, which stores them for the dashboard. */
function ContactForm(gateway: MessageGateway): HTMLElement {
  const status = h('p', { class: 'cf-status', role: 'status', 'aria-live': 'polite' });
  const submit = h('button', { class: 'btn solid', type: 'submit' }, 'إرسال الطلب');
  const form = h('form', { class: 'contact-form reveal' },
    h('h3', {}, 'اطلب استشارة'),
    h('p', { class: 'cf-lead' }, 'اترك بياناتك ونتواصل معك لفهم مساحتك.'),
    h('div', { class: 'cf-grid' },
      field('name', 'الاسم', { required: true, autocomplete: 'name', maxlength: '120' }),
      field('phone', 'رقم الجوال', { required: true, type: 'tel', autocomplete: 'tel', inputmode: 'tel', dir: 'ltr', maxlength: '30' }),
      field('email', 'البريد الإلكتروني (اختياري)', { type: 'email', autocomplete: 'email', dir: 'ltr', maxlength: '200' }),
      field('city', 'المدينة (اختياري)', { autocomplete: 'address-level2', maxlength: '80' }),
      field('message', 'تفاصيل الطلب', { required: true, maxlength: '4000', placeholder: 'نوع المساحة، المساحة التقريبية، وما تحتاجه…' }, true),
      h('label', { class: 'cf-trap', 'aria-hidden': 'true' }, 'اترك هذا الحقل فارغاً',
        h('input', { name: 'website', tabindex: '-1', autocomplete: 'off' }))),
    h('div', { class: 'cf-actions' }, submit, status));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const value = (k: keyof ContactMessage): string => String(data.get(k) ?? '').trim();
    submit.disabled = true;
    status.className = 'cf-status';
    status.textContent = 'جارٍ الإرسال…';
    gateway.send({
      name: value('name'), phone: value('phone'), email: value('email'),
      city: value('city'), message: value('message'), website: value('website'),
    }).then(() => {
      form.reset();
      status.className = 'cf-status ok';
      status.textContent = 'وصلنا طلبك، سنتواصل معك قريباً.';
    }).catch((error: unknown) => {
      status.className = 'cf-status err';
      status.textContent = error instanceof Error ? error.message : 'تعذّر إرسال الرسالة';
    }).finally(() => { submit.disabled = false });
  });
  return form;
}

export const Contact = (company: Company, contact: ContactData, messages: MessageGateway | null = null): HTMLElement => {
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
        contact.mapUrl ? h('div', { class: 'map-panel' }, map,
          h('a', { class: 'map-link', href: contact.mapUrl, target: '_blank', rel: 'noopener' }, 'فتح الموقع على الخريطة')) : map),
      messages ? ContactForm(messages) : null));
};
