import type { Company } from '../../domain/entities';
import { h, pad2 } from '../dom';
import { MediaView, Section, stagger } from './shared';

/** The lead as word spans that light up while it is read; the highlighted phrase lights in ochre. */
function Lead(lead: string, highlight: string): HTMLElement {
  const at = highlight ? lead.indexOf(highlight) : -1;
  const end = at + highlight.length;
  const p = h('p', { class: 'lead', 'data-fill': '' });
  Array.from(lead.matchAll(/\S+/g)).forEach((m, i) => {
    const start = m.index;
    const marked = at >= 0 && start < end && start + m[0].length > at;
    if (i > 0) p.append(' ');
    p.append(h('span', { class: marked ? 'w hl' : 'w' }, m[0]));
  });
  return p;
}

export function About(company: Company, number: number): HTMLElement {
  const image = MediaView(company.about.image, 'about-media reveal');
  image.dataset.parallax = '0.05';
  return Section({ id: 'about', number, title: 'من نحن', className: 'about' },
    Lead(company.about.lead, company.about.highlight),
    h('div', { class: 'grid' },
      image,
      h('div', { class: 'copy' }, company.about.paragraphs.map((p) => h('p', { class: 'reveal' }, p)))),
    h('div', { class: 'statements' },
      company.statements.map((s, i) =>
        stagger(h('article', {},
          h('span', { class: 'latin' }, pad2(i + 1)),
          h('h3', {}, s.title),
          h('p', {}, s.text)), i))));
}
