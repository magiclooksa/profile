import type { EngagementLevels } from '../../domain/entities';
import { h } from '../dom';
import { Section, stagger } from './shared';

export const Levels = (data: EngagementLevels, number: number): HTMLElement =>
  Section({ id: 'levels', number, title: 'مستويات التعامل', intro: data.intro, className: 'levels' },
    h('ol', { class: 'lvls' },
      data.items.map((text, i) =>
        stagger(h('li', { class: 'lvl' }, h('span', { class: 'latin' }, String(i + 1)), h('p', {}, text)), i))));
