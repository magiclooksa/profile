import type { Faq as FaqData } from '../../domain/entities';
import { h } from '../dom';
import { Section, stagger } from './shared';

/** Questions that open in place; the build also gives them to search engines as FAQPage data. */
export const Faq = (data: FaqData, number: number): HTMLElement | null =>
  data.items.length === 0 ? null :
    Section({ id: 'faq', number, title: 'الأسئلة الشائعة', intro: data.intro, className: 'faq' },
      h('div', { class: 'faq-list' },
        data.items.map((item, i) => stagger(
          h('details', { class: 'faq-item' },
            h('summary', {}, h('h3', {}, item.question)),
            h('p', {}, item.answer)), i))));
