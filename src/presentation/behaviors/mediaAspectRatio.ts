import type { Media } from '../../domain/entities';

/** An explicit JSON format takes precedence over the source dimensions. */
export function bindMediaAspectRatio(
  frame: HTMLElement,
  media: HTMLImageElement | HTMLVideoElement | null,
  aspectRatio?: Media['aspectRatio'],
): void {
  const apply = (portrait: boolean): void => {
    frame.dataset.orientation = portrait ? 'portrait' : 'landscape';
    frame.style.setProperty('--media-ratio', String(portrait ? 9 / 16 : 16 / 9));
  };
  if (aspectRatio === '9:16' || aspectRatio === '16:9') {
    apply(aspectRatio === '9:16');
    return;
  }
  if (!media) return;
  const update = (): void => {
    const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    if (!width || !height) return;
    apply(height > width);
  };
  media.addEventListener(media instanceof HTMLVideoElement ? 'loadedmetadata' : 'load', update);
  if (media instanceof HTMLVideoElement) media.addEventListener('resize', update);
  update(); // Covers images already in the browser cache.
}
