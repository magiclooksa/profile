import type { Project } from '../../domain/entities';
import { Compare } from './Compare';
import { Filmstrip } from './Filmstrip';
import { Mosaic } from './Mosaic';
import { Slideshow } from './Slideshow';

/** Each project picks its own way of showing its photos. */
export function renderGallery(project: Project): HTMLElement {
  switch (project.layout) {
    case 'mosaic': return Mosaic(project.images);
    case 'slideshow': return Slideshow(project.images);
    case 'filmstrip': return Filmstrip(project.images);
    case 'compare': return Compare(project.before, project.after, project.images);
    default: {
      const unreachable: never = project;
      throw new Error(`Unknown layout: ${JSON.stringify(unreachable)}`);
    }
  }
}
