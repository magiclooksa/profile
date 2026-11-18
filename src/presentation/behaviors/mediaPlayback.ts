/** Play only visible media; pause hidden slides and background tabs. */
export function initMediaPlayback(root: HTMLElement): void {
  const videos = Array.from(root.querySelectorAll('video'));
  const visible = new Set<HTMLVideoElement>();
  const sync = (video: HTMLVideoElement): void => {
    if (visible.has(video) && !document.hidden && !video.closest('[aria-hidden="true"]') &&
      !document.querySelector('.image-viewer[open]')) {
      void video.play().catch(() => { video.controls = true });
    } else {
      video.pause();
    }
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const video = entry.target as HTMLVideoElement;
      if (entry.isIntersecting) visible.add(video);
      else visible.delete(video);
      sync(video);
    }
  });
  videos.forEach((video) => observer.observe(video));

  // Slideshow visibility changes without leaving the viewport.
  new MutationObserver(() => videos.forEach(sync)).observe(root, {
    subtree: true, attributes: true, attributeFilter: ['aria-hidden'],
  });
  document.addEventListener('visibilitychange', () => videos.forEach(sync));
  document.addEventListener('imageviewerchange', () => videos.forEach(sync));
}
