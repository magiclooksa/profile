import type { Media } from '../../domain/entities';
import { h } from '../dom';
import { MediaView } from '../components/shared';

let compareCount = 0;

/** Before/after slider: drag to reveal the finished space, plus detail photos. */
export function Compare(before: Media, after: Media, details: readonly Media[]): HTMLElement {
  const id = `compare-${++compareCount}`;
  const range = h('input', {
    type: 'range', id, min: 0, max: 100, value: 50, 'aria-label': 'اسحب للمقارنة بين قبل التنفيذ وبعده',
  });
  const frame = h('div', { class: 'compare' },
    MediaView(before, 'before'),
    h('div', { class: 'after' }, MediaView(after)),
    h('span', { class: 'lbl b' }, 'قبل'),
    h('span', { class: 'lbl a' }, 'بعد'),
    h('i', { class: 'line', 'aria-hidden': 'true' }),
    range);

  // In RTL the range runs right to left, so the divider sits at (100 - value)% from the left.
  range.addEventListener('input', () => frame.style.setProperty('--pos', `${100 - Number(range.value)}%`));

  return h('div', { class: 'g g-compare' },
    frame,
    details.length > 0 ? h('div', { class: 'side' }, details.map((m) => MediaView(m))) : null);
}
