import type { Media } from '../../domain/entities';
import { h, pad2, splitWords } from '../dom';
import { pattern } from '../icons';
import { openImageViewer } from './ImageViewer';
import { bindMediaAspectRatio } from '../behaviors/mediaAspectRatio';

/** The LM mark, drawn from the logo's alpha so it follows the theme colour. */
export const Mark = (className = ''): HTMLElement =>
  h('i', { class: `mark ${className}`.trim(), 'aria-hidden': 'true' });

/** An image or looping video, with a branded placeholder for missing media. */
export function MediaView(media: Media, className = ''): HTMLElement {
  if (media.src) {
    const isVideo = media.type === 'video' ||
      (!media.type && /\.(mp4|webm|ogv|mov|m4v)(?:[?#]|$)/i.test(media.src));
    if (isVideo) {
      const video = h('video', {
        autoplay: true, loop: true, muted: true, playsinline: true,
        preload: 'metadata', poster: media.poster, 'aria-label': media.caption,
      });
      // Set the property as well as the attribute before assigning the source.
      video.defaultMuted = true;
      video.muted = true;
      video.src = media.src;
      const sound = h('button', {
        type: 'button', class: 'media-sound', 'aria-label': 'تشغيل الصوت', 'aria-pressed': 'false',
      }, 'تشغيل الصوت');
      const syncSound = (): void => {
        const label = video.muted ? 'تشغيل الصوت' : 'كتم الصوت';
        sound.textContent = label;
        sound.setAttribute('aria-label', label);
        sound.setAttribute('aria-pressed', String(!video.muted));
      };
      sound.addEventListener('click', () => {
        video.muted = !video.muted;
        syncSound();
        if (video.paused) void video.play().catch(() => { video.controls = true });
      });
      video.addEventListener('volumechange', syncSound);
      const failure = h('span', { class: 'media-error', role: 'status', hidden: true },
        'تعذّر تحميل الفيديو');
      video.addEventListener('error', () => { failure.hidden = false; sound.hidden = true });
      const frame = h('figure', { class: `media media-video ${className}`.trim() }, video, sound, failure);
      bindMediaAspectRatio(frame, video, media.aspectRatio);
      return frame;
    }
    const src = media.src;
    const open = h('button', {
      type: 'button', class: 'media-open', 'aria-label': `تكبير الصورة: ${media.caption}`,
      'aria-haspopup': 'dialog', 'data-cursor': 'تكبير',
    }, h('span', { 'aria-hidden': 'true' }, 'تكبير ⤢'));
    open.addEventListener('click', () => openImageViewer(src, media.caption, media.aspectRatio));
    const image = h('img', { src, alt: media.caption, loading: 'lazy', decoding: 'async' });
    const frame = h('figure', { class: `media ${className}`.trim() }, image, open);
    bindMediaAspectRatio(frame, image, media.aspectRatio);
    return frame;
  }
  const placeholder = h('div', { class: `media ph ${className}`.trim(), role: 'img', 'aria-label': `صورة مطلوبة: ${media.caption}` },
    pattern(),
    h('div', { class: 'ph-in' }, Mark(), h('span', {}, `صورة: ${media.caption}`)));
  bindMediaAspectRatio(placeholder, null, media.aspectRatio);
  return placeholder;
}

interface SectionOptions {
  readonly id: string;
  readonly number?: number;
  readonly title: string;
  readonly intro?: string;
  readonly className?: string;
  readonly withPattern?: boolean;
}

/** A big heading that rises word by word, with the section number as a small label. */
export function Section(opts: SectionOptions, ...content: (Node | null)[]): HTMLElement {
  const head = h('div', { class: 's-head' },
    opts.number !== undefined ? h('span', { class: 'no latin reveal' }, `(${pad2(opts.number)})`) : null,
    h('h2', { class: 'split reveal' }, splitWords(opts.title)),
    opts.intro ? h('p', { class: 'reveal' }, opts.intro) : null);
  return h('section', { id: opts.id, class: opts.className ?? '' },
    opts.withPattern ? pattern() : null,
    h('div', { class: 'wrap' }, head, ...content));
}

/** A label that rolls up to a copy of itself on hover. The copy is hidden from screen readers. */
export const RollText = (label: string): HTMLElement =>
  h('span', { class: 'roll' }, h('span', {}, label), h('span', { 'aria-hidden': 'true' }, label));

/** Pill link whose fill rises from below on hover and which leans towards the pointer. */
export const Button = (label: string, href: string, variant: 'solid' | 'ghost' = 'ghost'): HTMLElement =>
  h('a', { class: `btn ${variant}`, href, 'data-magnetic': '0.25' },
    h('span', { class: 'mag-inner' }, RollText(label)));

/** The large round call-to-action button. */
export const RoundButton = (label: string, href: string, external = false): HTMLElement =>
  h('a', {
    class: 'btn-round', href, 'data-magnetic': '0.35',
    target: external ? '_blank' : undefined, rel: external ? 'noopener' : undefined,
  }, h('span', { class: 'mag-inner' }, label));

/** Staggers reveal animations inside a group. */
export const stagger = (el: HTMLElement, index: number, every = 5): HTMLElement => {
  el.classList.add('reveal');
  el.style.setProperty('--i', String(index % every));
  return el;
};
