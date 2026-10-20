import { h } from '../dom';

const STORAGE_KEY = 'magic-look:background-sound-muted';
const VOLUME = 0.45;

const readMuted = (): boolean => {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
};
const saveMuted = (muted: boolean): void => {
  try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0') } catch { /* storage blocked */ }
};

/**
 * Looping background sound with a floating mute button.
 * Browsers block audible autoplay, so playback starts on the first user interaction.
 * It also pauses while the tab is hidden or while a page video has its own sound on.
 */
export function BackgroundSound(src: string): HTMLElement {
  const audio = h('audio', { loop: true, preload: 'auto' });
  audio.src = src;
  audio.volume = VOLUME;
  let muted = readMuted();

  const button = h('button', { type: 'button', class: 'bg-sound', 'aria-pressed': 'false' },
    h('span', { class: 'bg-sound-bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')));

  const videoHasSound = (): boolean =>
    Array.from(document.querySelectorAll('video')).some((v) => !v.muted && !v.paused);

  const sync = (): void => {
    const text = muted ? 'تشغيل الصوت' : 'كتم الصوت';
    button.setAttribute('aria-label', `${text} الخلفي`);
    button.title = text;
    button.setAttribute('aria-pressed', String(muted));
    button.classList.toggle('is-muted', muted);
    if (muted || document.hidden || videoHasSound()) audio.pause();
    else void audio.play().then(() => button.classList.remove('is-blocked'), () => button.classList.add('is-blocked'));
  };

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    // A click on a blocked-but-unmuted button should start the sound, not mute it.
    if (!button.classList.contains('is-blocked') || muted) muted = !muted;
    saveMuted(muted);
    sync();
  });

  // Start on the first interaction anywhere on the page.
  const unlock = (): void => {
    for (const type of ['pointerdown', 'keydown', 'touchstart'] as const) removeEventListener(type, unlock, true);
    sync();
  };
  for (const type of ['pointerdown', 'keydown', 'touchstart'] as const) addEventListener(type, unlock, true);

  document.addEventListener('visibilitychange', sync);
  // Video sound buttons change mute state; video play/pause also matters.
  const onVideoEvent = (event: Event): void => { if (event.target instanceof HTMLVideoElement) sync() };
  for (const type of ['volumechange', 'play', 'pause'] as const) document.addEventListener(type, onVideoEvent, true);

  sync();
  return h('div', { class: 'bg-sound-wrap' }, audio, button);
}
