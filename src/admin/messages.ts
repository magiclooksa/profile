import { h } from '../presentation/dom';
import type { AdminClient, Message } from './client';

const when = (iso: string): string =>
  new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });

/** Inbox of requests sent from the site's contact form. */
export function MessagesView(client: AdminClient, onUnread: (n: number) => void): HTMLElement {
  const list = h('div', { class: 'msg-list' });
  const status = h('p', { class: 'media-status', role: 'status' }, 'جارٍ التحميل…');
  let messages: Message[] = [];

  const report = (): void => onUnread(messages.filter((m) => !m.read).length);

  const item = (m: Message): HTMLElement => {
    const toggle = h('button', { type: 'button', class: 'ed-btn quiet' }, m.read ? 'تعليم كغير مقروءة' : 'تعليم كمقروءة');
    const remove = h('button', { type: 'button', class: 'ed-btn quiet danger' }, 'حذف');
    const el = h('article', { class: `msg${m.read ? '' : ' unread'}` },
      h('header', {},
        h('b', {}, m.name),
        h('time', { datetime: m.createdAt }, when(m.createdAt))),
      h('p', { class: 'msg-meta' },
        h('a', { href: `tel:${m.phone.replace(/[^\d+]/g, '')}`, dir: 'ltr' }, m.phone),
        m.phone ? h('a', { href: `https://wa.me/${m.phone.replace(/\D/g, '').replace(/^0/, '966')}`, target: '_blank', rel: 'noopener' }, 'واتساب') : null,
        m.email ? h('a', { href: `mailto:${m.email}`, dir: 'ltr' }, m.email) : null,
        m.city ? h('span', {}, m.city) : null),
      h('p', { class: 'msg-body' }, m.message),
      h('div', { class: 'ed-row' }, toggle, remove));
    toggle.addEventListener('click', () => {
      client.markRead(m.id, !m.read).then(() => {
        m.read = !m.read;
        el.replaceWith(item(m));
        report();
      }).catch((e: Error) => alert(e.message));
    });
    remove.addEventListener('click', () => {
      if (!confirm('حذف هذه الرسالة نهائياً؟')) return;
      client.deleteMessage(m.id).then(() => {
        messages = messages.filter((x) => x !== m);
        el.remove();
        report();
      }).catch((e: Error) => alert(e.message));
    });
    return el;
  };

  client.messages().then((all) => {
    messages = all;
    list.replaceChildren(...all.map(item));
    status.textContent = all.length ? '' : 'لا توجد رسائل بعد. تظهر هنا طلبات نموذج «اطلب استشارة» في الموقع.';
    report();
  }).catch((e: Error) => { status.textContent = e.message });

  return h('div', { class: 'messages' }, status, list);
}
