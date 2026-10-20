/** Use one of the two presentation formats without changing the source file. */
export function bindMediaAspectRatio(
  frame: HTMLElement,
  media: HTMLImageElement | HTMLVideoElement,
): void {
  const update = (): void => {
    const width = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
    const height = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
    if (!width || !height) return;
    const portrait = height > width;
    frame.dataset.orientation = portrait ? 'portrait' : 'landscape';
    frame.style.setProperty('--media-ratio', String(portrait ? 9 / 16 : 16 / 9));
  };
  media.addEventListener(media instanceof HTMLVideoElement ? 'loadedmetadata' : 'load', update);
  if (media instanceof HTMLVideoElement) media.addEventListener('resize', update);
  update(); // Covers images already in the browser cache.
}
