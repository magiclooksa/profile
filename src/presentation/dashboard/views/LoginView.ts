import type { SessionGateway } from '../../../domain/content';
import { h } from '../../shared/dom';

/** The sign-in screen. Calls `onSignedIn` once the password is accepted. */
export function renderLogin(session: SessionGateway, siteBase: string, onSignedIn: () => void, notice?: string): HTMLElement {
  const password = h('input', {
    type: 'password', name: 'password', class: 'input', autocomplete: 'current-password', required: true, dir: 'ltr',
  });
  const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, 'دخول');
  const status = h('p', { class: 'login-status', role: 'alert' }, notice ?? '');
  const form = h('form', { class: 'login-card' },
    h('img', { src: `${siteBase}assets/brand/logo-on-light.svg`, alt: 'النظرة الساحرة', width: 173, height: 40 }),
    h('h1', {}, 'لوحة التحكم'),
    h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'كلمة المرور'), password),
    submit,
    status);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit.disabled = true;
    status.textContent = '';
    session.login(password.value)
      .then(onSignedIn)
      .catch((error: unknown) => {
        status.textContent = error instanceof Error ? error.message : String(error);
        password.select();
      })
      .finally(() => { submit.disabled = false; });
  });
  queueMicrotask(() => password.focus());
  return h('div', { class: 'login' }, form);
}
