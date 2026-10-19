import type { Products as ProductsData } from '../../domain/entities';
import { h } from '../dom';
import { icon } from '../icons';
import { Section, stagger } from './shared';

export const Products = (data: ProductsData, number: number): HTMLElement =>
  Section({ id: 'products', number, title: 'منتجاتنا', intro: data.intro, className: 'products' },
    h('div', { class: 'prod-grid' },
      data.items.map((p, i) => stagger(h('div', { class: 'prod' }, icon(p.icon), h('p', {}, p.name)), i))));
