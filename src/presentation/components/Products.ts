import type { Products as ProductsData } from '../../domain/entities';
import { h } from '../dom';
import { icon } from '../icons';
import { Mark, Section, stagger } from './shared';

/** One pass of the running line: every product name, separated by the LM mark. */
const MarqueeRun = (names: readonly string[]): HTMLElement =>
  h('div', { class: 'marquee-run' }, names.flatMap((n) => [h('span', {}, n), Mark('sep')]));

export const Products = (data: ProductsData, number: number): HTMLElement => {
  const names = data.items.map((p) => p.name);
  return Section({ id: 'products', number, title: 'منتجاتنا', intro: data.intro, className: 'products' },
    // Decorative: the same names are listed below for assistive technology.
    h('div', { class: 'marquee bleed', 'aria-hidden': 'true' },
      h('div', { class: 'marquee-track' }, MarqueeRun(names), MarqueeRun(names))),
    h('ul', { class: 'prod-chips' },
      data.items.map((p, i) => stagger(h('li', { class: 'chip' }, icon(p.icon), h('span', {}, p.name)), i, 10))));
};
