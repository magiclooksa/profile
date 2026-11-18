import type { Journey as JourneyData } from '../../domain/entities';
import { h, pad2 } from '../dom';
import { Section } from './shared';

export const Journey = (data: JourneyData, number: number): HTMLElement =>
  Section({ id: 'journey', number, title: 'رحلة العمل معنا', intro: data.intro, className: 'journey band', withPattern: true },
    h('ol', { class: 'track', id: 'track' },
      data.steps.map((step, i) => h('li', { class: 'step' }, h('b', { class: 'latin' }, pad2(i + 1)), h('p', {}, step)))));
