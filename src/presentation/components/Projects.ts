import type { Project } from '../../domain/entities';
import { h, orPlaceholder, pad2 } from '../dom';
import { renderGallery } from '../galleries';
import { Section } from './shared';

function Swatches(colors: readonly string[]): HTMLElement {
  const swatches = colors.length > 0
    ? colors.map((c) => h('i', { style: `background:${c}`, title: c }))
    : [h('i', { class: 'empty' }), h('i', { class: 'empty' }), h('i', { class: 'empty' })];
  return h('span', { class: 'sw' }, 'الألوان المستخدمة', ...swatches);
}

function ProjectCard(project: Project, index: number): HTMLElement {
  return h('article', { class: `proj reveal proj-${project.layout}`, id: project.id },
    h('div', { class: 'proj-head' },
      h('div', { class: 't' },
        h('span', { class: 'latin' }, pad2(index + 1)),
        h('h3', {}, orPlaceholder(project.name, 'اسم المشروع')),
        h('em', { class: 'kind' }, project.category)),
      h('div', { class: 'meta' },
        h('span', {}, `الموقع: ${orPlaceholder(project.city, 'المدينة')}، المملكة العربية السعودية`),
        Swatches(project.colors))),
    renderGallery(project));
}

export const Projects = (projects: readonly Project[], number: number): HTMLElement =>
  Section({ id: 'works', number, title: 'بعض أعمالنا', className: 'works' },
    h('div', { class: 'projects' }, projects.map(ProjectCard)));
