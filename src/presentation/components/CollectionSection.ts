import type { Collection, CollectionItem } from '../../domain/entities';
import { h, pad2 } from '../dom';
import { MediaView } from './shared';

const Head = (c: Collection, className = ''): HTMLElement =>
  h('div', { class: `set-head ${className}`.trim() },
    h('p', { class: 'latin set-kicker' }, c.kicker),
    h('h2', {}, c.title),
    h('p', { class: 'set-text' }, c.text));

const Caption = (item: CollectionItem, i: number): HTMLElement =>
  h('figcaption', { class: 'set-cap' },
    h('span', { class: 'latin set-no' }, pad2(i + 1)),
    h('b', {}, item.title),
    h('small', {}, item.image.caption));

/** Tall side-by-side panels; the hovered or focused one widens. */
const panels = (c: Collection): HTMLElement[] => [
  h('div', { class: 'wrap' }, Head(c, 'reveal'),
    h('div', { class: 'set-panels reveal' },
      c.items.map((item, i) => h('figure', { class: 'set-panel' },
        MediaView(item.image, 'set-media'), Caption(item, i))))),
];

/** Overlapping editorial collage with large numerals. */
const collage = (c: Collection): HTMLElement[] => [
  h('div', { class: 'wrap set-collage' },
    Head(c, 'reveal'),
    ...c.items.map((item, i) => h('figure', { class: `set-tile set-tile-${(i % 2) + 1} reveal` },
      MediaView(item.image, 'set-media'), Caption(item, i)))),
];

/** One stage with buttons that cross-fade between the photos. */
const switcher = (c: Collection): HTMLElement[] => {
  const slides = c.items.map((item, i) =>
    h('figure', { class: `set-slide${i === 0 ? ' is-active' : ''}`, 'aria-hidden': i === 0 ? undefined : 'true' },
      MediaView(item.image, 'set-media')));
  slides.slice(1).forEach((s) => { s.inert = true });
  const tabs = c.items.map((item, i) => {
    const tab = h('button', { type: 'button', class: 'set-tab', 'aria-pressed': String(i === 0) },
      h('span', { class: 'latin set-no' }, pad2(i + 1)),
      h('b', {}, item.title),
      h('small', {}, item.image.caption));
    tab.addEventListener('click', () => {
      slides.forEach((s, j) => {
        const on = i === j;
        s.classList.toggle('is-active', on);
        s.inert = !on;
        if (on) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
      });
      tabs.forEach((t, j) => t.setAttribute('aria-pressed', String(i === j)));
    });
    return tab;
  });
  return [h('div', { class: 'wrap set-switch' },
    h('div', { class: 'reveal' }, Head(c), h('div', { class: 'set-tabs' }, tabs)),
    h('div', { class: 'set-stage reveal' }, slides))];
};

/** Dark band: staggered photos beside a vertical title. */
const stagger = (c: Collection): HTMLElement[] => [
  h('div', { class: 'wrap set-stagger' },
    h('p', { class: 'latin set-vertical', 'aria-hidden': 'true' }, c.kicker),
    Head(c, 'reveal'),
    h('div', { class: 'set-steps' },
      c.items.map((item, i) => h('figure', { class: 'set-step reveal' },
        MediaView(item.image, 'set-media'), Caption(item, i))))),
];

const Swatch = (item: CollectionItem): HTMLElement | null =>
  item.color ? h('i', { class: 'set-swatch', style: `--swatch: ${item.color}`, 'aria-hidden': 'true' }) : null;

/** Horizontal scroll-snap strip with arrows and a progress bar. */
const strip = (c: Collection): HTMLElement[] => {
  const track = h('div', { class: 'set-track', tabindex: '0', role: 'region', 'aria-label': c.title },
    c.items.map((item, i) => h('figure', { class: 'set-card' },
      MediaView(item.image, 'set-media'),
      h('figcaption', { class: 'set-cap' },
        h('span', { class: 'set-card-top' },
          h('span', { class: 'latin set-no' }, pad2(i + 1)),
          item.tag ? h('span', { class: 'set-tag' }, Swatch(item), item.tag) : null),
        h('b', {}, item.title),
        h('small', {}, item.image.caption)))));
  const bar = h('i', { class: 'set-bar-fill' });
  const step = (dir: 1 | -1): void => {
    const card = track.querySelector<HTMLElement>('.set-card');
    // In RTL the track scrolls towards negative scrollLeft.
    track.scrollBy({ left: -dir * (card ? card.offsetWidth + 20 : track.clientWidth * 0.8), behavior: 'smooth' });
  };
  const prev = h('button', { type: 'button', class: 'set-arrow', 'aria-label': 'السابق' }, '→');
  const next = h('button', { type: 'button', class: 'set-arrow', 'aria-label': 'التالي' }, '←');
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  const sync = (): void => {
    const max = track.scrollWidth - track.clientWidth;
    const p = max > 0 ? Math.abs(track.scrollLeft) / max : 1;
    bar.style.setProperty('--p', p.toFixed(3));
    prev.disabled = p <= 0.01;
    next.disabled = p >= 0.99;
  };
  track.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  requestAnimationFrame(sync);
  return [
    h('div', { class: 'wrap set-strip-head' }, Head(c, 'reveal'),
      h('div', { class: 'set-arrows' }, prev, next)),
    h('div', { class: 'wrap' }, track,
      h('div', { class: 'set-bar', 'aria-hidden': 'true' }, bar)),
  ];
};

/** Two looks facing each other across a centred label. */
const duo = (c: Collection): HTMLElement[] => {
  const [a, b] = c.items;
  const side = (item: CollectionItem | undefined, i: number): HTMLElement | null => item
    ? h('figure', { class: `set-side set-side-${i + 1} reveal` },
        MediaView(item.image, 'set-media'),
        h('figcaption', { class: 'set-cap' },
          h('span', { class: 'set-tag' }, Swatch(item), item.tag ?? item.title),
          h('b', {}, item.title),
          h('small', {}, item.image.caption)))
    : null;
  return [h('div', { class: 'wrap' },
    Head(c, 'set-center reveal'),
    h('div', { class: 'set-duo' },
      side(a, 0),
      h('div', { class: 'set-versus', 'aria-hidden': 'true' },
        h('span', {}, a?.tag ?? ''), h('i'), h('span', {}, b?.tag ?? '')),
      side(b, 1)))];
};

/**
 * Pinned horizontal journey: scrolling down slides through full-screen rooms.
 * The section's --p (set by scrollProgress) drives the rail.
 */
const journey = (c: Collection): HTMLElement[] => {
  const total = c.items.length;
  const counter = h('span', { class: 'latin set-count' }, `01 / ${pad2(total)}`);
  const intro = h('div', { class: 'set-room set-room-intro' },
    h('div', { class: 'wrap' }, Head(c),
      h('p', { class: 'set-hint', 'aria-hidden': 'true' }, h('i'), 'مرّر للأسفل لتتنقل بين المساحات')));
  const rooms = c.items.map((item, i) => h('figure', { class: 'set-room' },
    MediaView(item.image, 'set-media'),
    h('span', { class: 'latin set-giant', 'aria-hidden': 'true' }, pad2(i + 1)),
    h('figcaption', { class: 'set-room-cap' },
      item.tag ? h('span', { class: 'set-tag' }, Swatch(item), item.tag) : null,
      h('b', {}, item.title),
      h('small', {}, item.image.caption))));
  const rail = h('div', { class: 'set-rail' }, intro, rooms);
  const pin = h('div', { class: 'set-pin' }, rail,
    h('div', { class: 'set-hud', 'aria-hidden': 'true' }, counter, h('span', { class: 'set-hud-line' }, h('i'))));
  // Keep the counter in step with the rail.
  let last = -1;
  const sync = (): void => {
    const section = pin.parentElement;
    if (!section) return;
    // Same formula as scrollProgress, read from layout so it never lags a frame behind.
    const rect = section.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)));
    const index = Math.min(total, Math.max(1, Math.round(p * total)));
    if (index !== last) { last = index; counter.textContent = `${pad2(index)} / ${pad2(total)}` }
  };
  addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  return [pin];
};

/** A dark, colourless scene that the pointer lights up; scrolling floods it with light. */
const spotlight = (c: Collection): HTMLElement[] => {
  const item = c.items[0];
  if (!item?.image.src) return [h('div', { class: 'wrap' }, Head(c))];
  const src = item.image.src;
  const pin = h('div', { class: 'set-pin' },
    h('img', { class: 'set-dim', src, alt: '', 'aria-hidden': 'true', loading: 'lazy', decoding: 'async' }),
    h('img', { class: 'set-lit', src, alt: item.image.caption, loading: 'lazy', decoding: 'async' }),
    h('div', { class: 'set-glow', 'aria-hidden': 'true' }),
    h('div', { class: 'wrap set-spot-copy' }, Head(c),
      h('div', { class: 'set-spot-cap' },
        item.tag ? h('span', { class: 'set-tag' }, Swatch(item), item.tag) : null,
        h('b', {}, item.title), h('small', {}, item.image.caption))));

  let x = 0.5; let y = 0.55; let idle = true; let idleTimer = 0; let visible = false; let raf = 0;
  const place = (): void => {
    pin.style.setProperty('--x', `${(x * 100).toFixed(2)}%`);
    pin.style.setProperty('--y', `${(y * 100).toFixed(2)}%`);
  };
  pin.addEventListener('pointermove', (e) => {
    const r = pin.getBoundingClientRect();
    x = (e.clientX - r.left) / r.width; y = (e.clientY - r.top) / r.height;
    idle = false; clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => { idle = true }, 2500);
    place();
  });
  // When nobody is pointing, the light drifts slowly on its own.
  const drift = (t: number): void => {
    raf = 0;
    if (!visible) return;
    if (idle) { x = 0.5 + Math.sin(t / 2600) * 0.24; y = 0.55 + Math.cos(t / 3400) * 0.16; place() }
    raf = requestAnimationFrame(drift);
  };
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (visible && !raf) raf = requestAnimationFrame(drift);
    }).observe(pin);
  }
  place();
  return [pin];
};

/** A photo with glowing points; each opens a note and lights its line in the list beside it. */
const hotspots = (c: Collection): HTMLElement[] => {
  const item = c.items[0];
  const spots = item?.spots ?? [];
  if (!item?.image.src || spots.length === 0) return [h('div', { class: 'wrap' }, Head(c))];
  let open = -1;
  const pins: HTMLButtonElement[] = [];
  const notes: HTMLElement[] = [];
  const rows: HTMLButtonElement[] = [];
  const select = (i: number): void => {
    open = open === i ? -1 : i;
    pins.forEach((p, j) => p.setAttribute('aria-expanded', String(open === j)));
    notes.forEach((n, j) => { n.hidden = open !== j });
    rows.forEach((r, j) => r.setAttribute('aria-pressed', String(open === j)));
  };
  spots.forEach((s, i) => {
    const noteId = `${c.kicker.replace(/\W+/g, '-').toLowerCase()}-spot-${i + 1}`;
    const pin = h('button', {
      type: 'button', class: 'set-pin-dot', style: `left: ${s.x}%; top: ${s.y}%`,
      'aria-expanded': 'false', 'aria-controls': noteId, 'aria-label': s.title,
    }, h('span', { class: 'latin' }, String(i + 1)));
    pin.addEventListener('click', () => select(i));
    // Notes open towards the roomier side of the photo.
    const note = h('div', {
      class: `set-note${s.x > 55 ? ' to-left' : ''}${s.y > 60 ? ' to-top' : ''}`, id: noteId, role: 'note',
      style: `left: ${s.x}%; top: ${s.y}%`, hidden: true,
    }, h('b', {}, s.title), h('p', {}, s.text));
    const row = h('button', { type: 'button', class: 'set-spot-row', 'aria-pressed': 'false' },
      h('span', { class: 'latin set-no' }, pad2(i + 1)), h('b', {}, s.title), h('small', {}, s.text));
    row.addEventListener('click', () => select(i));
    row.addEventListener('mouseenter', () => pin.classList.add('is-hint'));
    row.addEventListener('mouseleave', () => pin.classList.remove('is-hint'));
    pins.push(pin); notes.push(note); rows.push(row);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open !== -1) select(open) });
  return [h('div', { class: 'wrap set-hot' },
    h('div', { class: 'set-hot-side reveal' }, Head(c), h('div', { class: 'set-spot-list' }, rows)),
    h('figure', { class: 'set-hot-photo reveal' },
      h('img', { src: item.image.src, alt: item.image.caption, loading: 'lazy', decoding: 'async' }),
      ...pins, ...notes))];
};

/** 3D cover-flow with TV-remote style channel buttons, swipe and gentle auto-advance. */
const coverflow = (c: Collection): HTMLElement[] => {
  const n = c.items.length;
  let active = 0;
  let auto = true;
  const cards = c.items.map((item, i) => {
    const card = h('figure', { class: 'set-flow-card' }, MediaView(item.image, 'set-media'));
    card.addEventListener('click', () => { if (i !== active) { auto = false; go(i) } });
    return card;
  });
  const channel = h('span', { class: 'latin set-ch' });
  const tag = h('span', { class: 'set-tag' });
  const title = h('b', {});
  const caption = h('small', {});
  const info = h('div', { class: 'set-flow-info', 'aria-live': 'polite' }, h('div', {}, channel, tag), title, caption);
  const go = (i: number): void => {
    active = (i + n) % n;
    cards.forEach((card, j) => {
      // Shortest signed distance around the ring.
      let d = j - active;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      card.style.setProperty('--d', String(d));
      card.style.setProperty('--ad', String(Math.abs(d)));
      card.classList.toggle('is-active', d === 0);
      card.inert = d !== 0;
      card.setAttribute('aria-hidden', String(d !== 0));
    });
    const item = c.items[active];
    if (!item) return;
    channel.textContent = `CH ${pad2(active + 1)}`;
    tag.replaceChildren(...[Swatch(item), item.tag ?? ''].filter((x): x is HTMLElement | string => x !== null));
    title.textContent = item.title;
    caption.textContent = item.image.caption;
  };
  const remote = (label: string, text: string, step: number): HTMLButtonElement => {
    const b = h('button', { type: 'button', class: 'set-remote-btn latin', 'aria-label': label }, text);
    b.addEventListener('click', () => { auto = false; go(active + step) });
    return b;
  };
  const stage = h('div', { class: 'set-flow-stage', tabindex: '0', 'aria-label': c.title, role: 'region' }, cards);
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { auto = false; go(active + 1) }
    if (e.key === 'ArrowRight') { auto = false; go(active - 1) }
  });
  // Swipe: in RTL, dragging left moves forward.
  let startX = 0;
  stage.addEventListener('pointerdown', (e) => { startX = e.clientX });
  stage.addEventListener('pointerup', (e) => {
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) { auto = false; go(active + (dx < 0 ? 1 : -1)) }
  });
  // Advance on its own while on screen, until the visitor takes over.
  let visible = false;
  new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false }, { threshold: 0.5 }).observe(stage);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.setInterval(() => { if (auto && visible && !document.hidden && !stage.matches(':hover')) go(active + 1) }, 4500);
  }
  go(0);
  return [h('div', { class: 'wrap' },
    Head(c, 'set-center reveal'),
    stage,
    h('div', { class: 'set-flow-bar' }, info,
      h('div', { class: 'set-remote', role: 'group', 'aria-label': 'تبديل الجدار' },
        remote('الجدار السابق', 'CH −', -1), remote('الجدار التالي', 'CH +', 1))))];
};

/** Designer's board: the photo, round lenses magnifying its details, and its colour palette. */
const moodboard = (c: Collection): HTMLElement[] => {
  const item = c.items[0];
  if (!item?.image.src) return [h('div', { class: 'wrap' }, Head(c))];
  const src = item.image.src;
  const spots = item.spots ?? [];
  const marks = spots.map((s, i) => h('span', {
    class: 'set-mark', style: `left: ${s.x}%; top: ${s.y}%`, 'aria-hidden': 'true',
  }, h('i', { class: 'latin' }, String(i + 1))));
  const lenses = spots.map((s, i) => {
    const lens = h('figure', { class: 'set-lens reveal', tabindex: '0', style: `--i: ${i}` },
      h('div', {
        class: 'set-lens-zoom', role: 'img', 'aria-label': s.title,
        style: `background-image: url("${src}"); background-position: ${s.x}% ${s.y}%`,
      }),
      h('figcaption', {},
        h('span', { class: 'latin set-no' }, pad2(i + 1)), h('b', {}, s.title), h('small', {}, s.text)));
    // Point to where this detail sits in the photo.
    const on = (): void => marks[i]?.classList.add('is-on');
    const off = (): void => marks[i]?.classList.remove('is-on');
    lens.addEventListener('mouseenter', on); lens.addEventListener('mouseleave', off);
    lens.addEventListener('focus', on); lens.addEventListener('blur', off);
    return lens;
  });
  const palette = (item.palette ?? []).map((p) => h('li', { class: 'set-chip' },
    h('i', { style: `--swatch: ${p.color}`, 'aria-hidden': 'true' }),
    h('b', {}, p.name), h('small', { class: 'latin' }, p.color.toUpperCase())));
  return [h('div', { class: 'wrap set-board' },
    Head(c, 'set-board-head reveal'),
    h('figure', { class: 'set-board-photo reveal' },
      // Markers are placed against the image area only, not the caption below it.
      h('div', { class: 'set-board-img' },
        h('img', { src, alt: item.image.caption, loading: 'lazy', decoding: 'async' }), ...marks),
      h('figcaption', {}, item.tag ? h('span', { class: 'set-tag' }, Swatch(item), item.tag) : null, item.title)),
    h('div', { class: 'set-lenses' }, lenses),
    palette.length > 0
      ? h('div', { class: 'set-palette reveal' },
          h('p', { class: 'latin set-kicker' }, 'COLOUR PALETTE'), h('ul', {}, palette))
      : null)];
};

const LAYOUTS: Record<Collection['style'], (c: Collection) => HTMLElement[]> = {
  panels, collage, switch: switcher, stagger, strip, duo, journey, spotlight, hotspots, coverflow, moodboard,
};

/** Styles whose section is pinned and driven by scroll progress. */
const SCROLL_DRIVEN: ReadonlySet<Collection['style']> = new Set(['journey', 'spotlight']);

export const CollectionSection = (c: Collection, index: number): HTMLElement =>
  h('section', {
    class: `set set--${c.style}`, id: `collection-${index + 1}`, 'aria-label': c.title,
    'data-scroll-progress': SCROLL_DRIVEN.has(c.style),
    // The journey has one intro screen plus a screen per room.
    style: c.style === 'journey' ? `--n: ${c.items.length + 1}` : undefined,
  }, ...LAYOUTS[c.style](c));
