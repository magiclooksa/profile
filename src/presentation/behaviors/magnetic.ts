import { finePointer, prefersReducedMotion } from '../dom';

/** Elements marked [data-magnetic] lean towards the pointer; their .mag-inner leans a little further. */
export function initMagnetic(root: ParentNode): void {
  if (!finePointer() || prefersReducedMotion()) return;
  root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.3;
    const inner = el.querySelector<HTMLElement>('.mag-inner');
    el.addEventListener('pointermove', (event) => {
      const r = el.getBoundingClientRect();
      const dx = event.clientX - (r.left + r.width / 2);
      const dy = event.clientY - (r.top + r.height / 2);
      el.style.translate = `${dx * strength}px ${dy * strength}px`;
      if (inner) inner.style.translate = `${dx * strength * 0.45}px ${dy * strength * 0.45}px`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.translate = '';
      if (inner) inner.style.translate = '';
    });
  });
}
