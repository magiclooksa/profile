import type { Company } from '../../domain/entities';
import { h } from '../dom';
import { MediaView, Section, stagger } from './shared';

/** Wraps the highlighted phrase of the lead in <em>, as text nodes only. */
function leadWithHighlight(lead: string, highlight: string): HTMLElement {
  const at = lead.indexOf(highlight);
  if (at < 0) return h('p', { class: 'lead reveal' }, lead);
  return h('p', { class: 'lead reveal' },
    lead.slice(0, at), h('em', {}, highlight), lead.slice(at + highlight.length));
}

export const About = (company: Company, number: number): HTMLElement =>
  Section({ id: 'about', number, title: 'من نحن', className: 'about' },
    h('div', { class: 'grid' },
      h('div', { class: 'copy' },
        leadWithHighlight(company.about.lead, company.about.highlight),
        company.about.paragraphs.map((p) => h('p', { class: 'reveal' }, p))),
      MediaView(company.about.image, 'reveal')),
    h('div', { class: 'statements' },
      company.statements.map((s, i) =>
        stagger(h('article', {}, h('h3', {}, s.title), h('p', {}, s.text)), i))));
