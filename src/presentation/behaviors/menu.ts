import { lockScroll } from './smoothScroll';

/** Full-screen menu: opens from the menu button, closes on Escape, the shade or a link. */
export function initMenu(
  button: HTMLButtonElement | null,
  menu: HTMLElement | null,
  background: readonly (HTMLElement | null)[],
): void {
  if (!button || !menu) return;
  const label = button.querySelector<HTMLElement>('.menu-lbl');
  let open = false;

  const set = (next: boolean): void => {
    if (open === next) return;
    open = next;
    menu.classList.toggle('open', open);
    menu.inert = !open;
    menu.setAttribute('aria-hidden', String(!open));
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    if (label) label.textContent = open ? 'إغلاق' : 'القائمة';
    document.documentElement.classList.toggle('menu-open', open);
    background.forEach((el) => { if (el) el.inert = open });
    lockScroll(open);
    if (open) {
      window.setTimeout(() => menu.querySelector<HTMLElement>('a')?.focus({ preventScroll: true }), 120);
    } else if (menu.contains(document.activeElement)) {
      button.focus({ preventScroll: true });
    }
  };

  button.addEventListener('click', () => set(!open));
  menu.querySelector('.menu-shade')?.addEventListener('click', () => set(false));
  // Close first, so the page is free to scroll to the chosen section.
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && open) set(false) });
}
