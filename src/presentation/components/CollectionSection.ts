import type { Collection, CollectionItem } from '../../domain/entities';
import { h, pad2, prefersReducedMotion } from '../dom';
import { MediaView } from './shared';
import { openImageViewer } from './ImageViewer';
import { glyph, ShareButton } from '../behaviors/share';

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
    // Opened from a shared product link: bring this wall to the front.
    card.addEventListener('reveal-item', () => { auto = false; go(i) });
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
  const remote = (label: string, path: string, step: number): HTMLButtonElement => {
    const b = h('button', { type: 'button', class: 'set-remote-btn', 'aria-label': label, title: label });
    b.append(glyph([path], 'set-remote-ic'));
    b.addEventListener('click', () => { auto = false; go(active + step) });
    return b;
  };
  const stage = h('div', { class: 'set-flow-stage', tabindex: '0', 'aria-label': c.title, role: 'region' }, cards);
  stage.addEventListener('keydown', (e) => {
    // The next wall waits on the right, the previous one on the left.
    if (e.key === 'ArrowRight') { auto = false; go(active + 1) }
    if (e.key === 'ArrowLeft') { auto = false; go(active - 1) }
  });
  // Swipe: dragging left pulls in the next wall from the right.
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
        // In this right-to-left page the first button sits on the right, beside the next wall.
        remote('الجدار التالي', 'M9 5l7 7-7 7', 1), remote('الجدار السابق', 'M15 5l-7 7 7 7', -1))))];
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

/**
 * Built-in pieces shown behind a pair of cabinet doors that swing open as each one
 * scrolls into view, beside an editorial caption. Clicking the photo closes or reopens them.
 */
const cabinet = (c: Collection): HTMLElement[] => {
  const rows = c.items.map((item, i) => {
    const door = (side: 'right' | 'left'): HTMLElement =>
      h('span', { class: `set-door set-door-${side}`, 'aria-hidden': 'true' }, h('i', { class: 'set-handle' }));
    const frame = h('div', { class: 'set-cab-frame' },
      // The photo sits in its own clipped layer so its zoom never shows around the closed doors.
      h('span', { class: 'set-cab-pic' },
        h('img', { src: item.image.src ?? '', alt: item.image.caption, loading: 'lazy', decoding: 'async' })),
      door('right'), door('left'));
    frame.addEventListener('click', () => frame.classList.toggle('is-open'));
    const row = h('figure', { class: `set-cab set-cab-${i % 2 === 0 ? 'a' : 'b'}` },
      frame,
      h('figcaption', { class: 'set-cab-text reveal' },
        h('span', { class: 'latin set-cab-no', 'aria-hidden': 'true' }, pad2(i + 1)),
        item.tag ? h('span', { class: 'set-tag' }, Swatch(item), item.tag) : null,
        h('b', {}, item.title),
        h('small', {}, item.image.caption)));
    return { row, frame };
  });
  // Doors open once, the first time each piece is well in view.
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      window.setTimeout(() => entry.target.classList.add('is-open'), 250);
    }
  }, { threshold: 0.55 });
  rows.forEach(({ frame }) => io.observe(frame));
  return [h('div', { class: 'wrap' },
    Head(c, 'set-center set-cab-head reveal'),
    h('div', { class: 'set-cabs' }, rows.map(({ row }) => row)))];
};

/** An absolute address, so it stays correct inside CSS custom properties and stylesheets in other folders. */
const absolute = (src: string): string => new URL(src, document.baseURI).href;

/** Calls back whenever the element comes into or leaves view. */
const watchView = (el: Element, onChange: (visible: boolean) => void, threshold = 0.5): void => {
  new IntersectionObserver(([entry]) => onChange(entry?.isIntersecting ?? false), { threshold }).observe(el);
};

/**
 * The same room in two fabrics. Picking a sample from the fabric card floods the room
 * with the new colour, in a circle that grows from the pieces that changed.
 */
const swatches = (c: Collection): HTMLElement[] => {
  const n = c.items.length;
  let active = -1;
  let auto = true;
  const slides = c.items.map((item) => {
    const spot = item.spots?.[0];
    return h('figure', { class: 'set-sw-slide', style: `--ox: ${spot?.x ?? 50}%; --oy: ${spot?.y ?? 60}%` },
      MediaView(item.image, 'set-media'),
      spot ? h('span', { class: 'set-sw-ring', style: `left: ${spot.x}%; top: ${spot.y}%`, 'aria-hidden': 'true' },
        h('i'), h('em', {}, spot.title)) : null);
  });
  const title = h('b', {});
  const caption = h('small', {});
  const chips = h('ul', { class: 'set-sw-chips' });
  const samples = c.items.map((item, i) => {
    const sample = h('button', { type: 'button', class: 'set-sw-sample', 'aria-pressed': 'false', style: `--swatch: ${item.color ?? '#bbb'}` },
      h('i', { class: 'set-sw-fabric', 'aria-hidden': 'true' }),
      h('span', { class: 'latin set-no' }, pad2(i + 1)),
      h('span', {}, item.tag ?? item.title));
    sample.addEventListener('click', () => { auto = false; go(i) });
    return sample;
  });
  const section = (): HTMLElement | null => slides[0]?.closest('section') ?? null;
  const go = (i: number, instant = false): void => {
    const next = slides[i];
    const item = c.items[i];
    if (!next || !item || i === active) return;
    const prev = active;
    active = i;
    slides.forEach((s, j) => {
      s.classList.remove('is-active', 'is-prev');
      if (j === prev) s.classList.add('is-prev');
      s.inert = j !== i;
      if (j === i) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
    });
    // Close the circle without animating, then grow it from the changed pieces.
    next.classList.add('no-anim');
    void next.offsetWidth;
    if (!instant) next.classList.remove('no-anim');
    next.classList.add('is-active');
    if (instant) requestAnimationFrame(() => next.classList.remove('no-anim'));
    samples.forEach((s, j) => s.setAttribute('aria-pressed', String(i === j)));
    title.textContent = item.title;
    caption.textContent = item.image.caption;
    chips.replaceChildren(...(item.palette ?? []).map((p) => h('li', {},
      h('i', { style: `--swatch: ${p.color}`, 'aria-hidden': 'true' }), p.name)));
    // On the first call the section is not built yet, so wait a frame.
    requestAnimationFrame(() => section()?.style.setProperty('--tint', item.color ?? 'transparent'));
  };
  go(0, true);
  slides.forEach((s, i) => s.addEventListener('reveal-item', () => { auto = false; go(i) }));
  // Alternate on its own while on screen, until the visitor picks a sample.
  let visible = false;
  const card = h('div', { class: 'set-sw-card reveal' },
    h('p', { class: 'latin set-kicker' }, 'FABRIC SAMPLES'),
    h('div', { class: 'set-sw-samples', role: 'group', 'aria-label': 'عيّنات القماش' }, samples),
    h('div', { class: 'set-sw-info', 'aria-live': 'polite' }, title, caption),
    chips);
  const stage = h('div', { class: 'set-sw-stage reveal' }, slides);
  watchView(stage, (v) => { visible = v });
  if (!prefersReducedMotion() && n > 1) {
    window.setInterval(() => {
      if (auto && visible && !document.hidden && !stage.matches(':hover')) go((active + 1) % n);
    }, 5200);
  }
  return [h('div', { class: 'wrap' }, Head(c, 'reveal'), h('div', { class: 'set-sw' }, stage, card))];
};

/**
 * A mosaic of tiles that flip one after another, like a wave from the top right corner,
 * to turn one majlis into the next. Arch-shaped buttons pick the room.
 */
const tiles = (c: Collection): HTMLElement[] => {
  const COLS = 8;
  const ROWS = 5;
  const n = c.items.length;
  const urls = c.items.map((item) => (item.image.src ? `url("${absolute(item.image.src)}")` : 'none'));
  // Load every photo up front so no tile turns over onto an empty face.
  c.items.forEach((item) => { if (item.image.src) new Image().src = absolute(item.image.src) });
  let active = 0;
  let turn = 0;
  let busy = false;
  let auto = true;
  const stage = h('div', {
    class: 'set-tiles-stage', role: 'img', 'aria-label': c.items[0]?.image.caption ?? c.title,
    style: `--cols: ${COLS}; --rows: ${ROWS}; --turn: 0; --img-a: ${urls[0] ?? 'none'}; --img-b: ${urls[0] ?? 'none'}`,
  });
  const still = h('img', { class: 'set-tiles-still', src: c.items[0]?.image.src ?? '', alt: '', decoding: 'async' });
  stage.append(still);
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      const pos = `background-position: ${(col / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`;
      stage.append(h('span', { class: 'set-cell', style: `--d: ${(COLS - 1 - col + r) * 60}ms` },
        h('i', { class: 'set-face set-face-a', style: pos }), h('i', { class: 'set-face set-face-b', style: pos })));
    }
  }
  const tag = h('span', { class: 'set-tag' });
  const title = h('b', {});
  const caption = h('small', {});
  const info = h('div', { class: 'set-tiles-info', 'aria-live': 'polite' }, tag, title, caption);
  const zoom = h('button', { type: 'button', class: 'set-tiles-zoom', 'aria-label': 'تكبير الصورة' }, 'تكبير ⤢');
  zoom.addEventListener('click', () => {
    const item = c.items[active];
    if (item?.image.src) openImageViewer(item.image.src, item.image.caption, item.image.aspectRatio);
  });
  const arches: HTMLButtonElement[] = [];
  const show = (i: number): void => {
    const item = c.items[i];
    if (!item) return;
    tag.textContent = item.tag ?? '';
    tag.hidden = !item.tag;
    title.textContent = item.title;
    caption.textContent = item.image.caption;
    stage.setAttribute('aria-label', item.image.caption);
    arches.forEach((a, j) => a.setAttribute('aria-pressed', String(i === j)));
  };
  const go = (i: number): void => {
    if (busy || i === active || !c.items[i]) return;
    active = i;
    // Paint the new room on the faces now turned away, then turn every tile over.
    stage.style.setProperty(turn % 2 === 0 ? '--img-b' : '--img-a', urls[i] ?? 'none');
    stage.classList.add('is-turning');
    turn += 1;
    stage.style.setProperty('--turn', String(turn));
    show(i);
    busy = true;
    window.setTimeout(() => {
      busy = false;
      still.src = c.items[i]?.image.src ?? '';
      stage.classList.remove('is-turning');
    }, prefersReducedMotion() ? 0 : (COLS + ROWS) * 60 + 1000);
  };
  const figures = c.items.map((item, i) => {
    const arch = h('button', { type: 'button', class: 'set-arch-btn', 'aria-pressed': 'false' },
      h('span', { class: 'set-arch-pic' },
        h('img', { src: item.image.src ?? '', alt: '', loading: 'lazy', decoding: 'async' })),
      h('span', { class: 'latin set-no' }, pad2(i + 1)),
      h('b', {}, item.title));
    arch.addEventListener('click', () => { auto = false; go(i) });
    arches.push(arch);
    const figure = h('figure', { class: 'set-arch' }, arch);
    figure.addEventListener('reveal-item', () => { auto = false; go(i) });
    return figure;
  });
  show(0);
  let visible = false;
  watchView(stage, (v) => { visible = v });
  if (!prefersReducedMotion() && n > 1) {
    window.setInterval(() => {
      if (auto && visible && !document.hidden && !stage.matches(':hover')) go((active + 1) % n);
    }, 6000);
  }
  return [h('div', { class: 'wrap' },
    Head(c, 'set-center reveal'),
    h('div', { class: 'set-tiles-frame reveal' }, stage, zoom),
    h('div', { class: 'set-tiles-bar' }, info, h('div', { class: 'set-arches' }, figures)))];
};

/**
 * A symmetrical room split down its axis. The halves start apart like an open book,
 * with the title between them, and close into one photo as the page scrolls.
 */
const mirror = (c: Collection): HTMLElement[] => {
  const item = c.items[0];
  if (!item?.image.src) return [h('div', { class: 'wrap' }, Head(c))];
  const src = item.image.src;
  const half = (side: 'l' | 'r'): HTMLElement => h('span', { class: `set-mir-half set-mir-${side}` },
    h('img', { src, alt: '', loading: 'lazy', decoding: 'async' }));
  const stage = h('figure', { class: 'set-mir-stage' },
    h('span', { class: 'set-mir-halves', role: 'img', 'aria-label': item.image.caption }, half('l'), half('r')),
    h('span', { class: 'set-mir-axis', 'aria-hidden': 'true' }),
    h('figcaption', { class: 'set-mir-cap' },
      item.tag ? h('span', { class: 'set-tag' }, Swatch(item), item.tag) : null,
      h('b', {}, item.title), h('small', {}, item.image.caption)));
  return [h('div', { class: 'set-pin' },
    h('div', { class: 'set-mir-copy' }, Head(c),
      h('p', { class: 'set-hint', 'aria-hidden': 'true' }, h('i'), 'مرّر لتكتمل الصورة')),
    stage)];
};

/** An SVG filter that turns a photo into pale lines, like a drawing on blueprint paper. */
const edgeFilter = (): SVGSVGElement => {
  const ns = 'http://www.w3.org/2000/svg';
  const node = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>, ...kids: SVGElement[]): SVGElementTagNameMap[K] => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.append(...kids);
    return el;
  };
  const boost = (fn: 'feFuncR' | 'feFuncG' | 'feFuncB', slope: string): SVGElement => node(fn, { type: 'linear', slope });
  return node('svg', { class: 'set-bp-defs', width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' },
    node('filter', { id: 'set-bp-edges', 'color-interpolation-filters': 'sRGB' },
      node('feColorMatrix', { type: 'saturate', values: '0' }),
      node('feGaussianBlur', { stdDeviation: '0.6' }),
      node('feConvolveMatrix', { order: '3', kernelMatrix: '-1 -1 -1 -1 8 -1 -1 -1 -1', preserveAlpha: 'true' }),
      // Strengthen the lines and tint them the pale blue of a blueprint.
      node('feComponentTransfer', {}, boost('feFuncR', '4.5'), boost('feFuncG', '5.5'), boost('feFuncB', '6.5'))));
};

/**
 * From plan to wall: the piece is first shown as a blueprint with numbered notes,
 * then a scan line sweeps across and builds the real photo. Two buttons switch between them.
 */
const blueprint = (c: Collection): HTMLElement[] => {
  const item = c.items[0];
  if (!item?.image.src) return [h('div', { class: 'wrap' }, Head(c))];
  const src = item.image.src;
  const spots = item.spots ?? [];
  // Labels point towards the nearer side of the photo.
  const notes = spots.map((s, i) => h('span', {
    class: `set-bp-note${s.x < 50 ? ' to-left' : ''}`, style: `left: ${s.x}%; top: ${s.y}%`, 'aria-hidden': 'true',
  }, h('i', { class: 'latin' }, String(i + 1)), h('em', {}, s.title)));
  const frame = h('figure', { class: 'set-bp-frame' },
    edgeFilter(),
    h('span', { class: 'set-bp-sheet', 'aria-hidden': 'true' },
      h('img', { class: 'set-bp-fill', src, alt: '', loading: 'lazy', decoding: 'async' }),
      h('img', { class: 'set-bp-lines', src, alt: '', loading: 'lazy', decoding: 'async' })),
    h('span', { class: 'set-bp-real' }, h('img', { src, alt: item.image.caption, loading: 'lazy', decoding: 'async' })),
    h('span', { class: 'set-bp-grid', 'aria-hidden': 'true' }),
    h('span', { class: 'set-bp-scan', 'aria-hidden': 'true' }),
    h('span', { class: 'set-bp-dim', 'aria-hidden': 'true' }, h('em', {}, 'بمقاس الجدار')),
    ...notes,
    h('span', { class: 'latin set-bp-stamp', 'aria-hidden': 'true' }, 'MAGIC LOOK', h('small', {}, 'WALL UNIT · SHEET 01')));
  const plan = h('button', { type: 'button', class: 'set-bp-btn', 'aria-pressed': 'true' }, 'المخطط');
  const built = h('button', { type: 'button', class: 'set-bp-btn', 'aria-pressed': 'false' }, 'التنفيذ');
  const build = (on: boolean): void => {
    frame.classList.toggle('is-built', on);
    plan.setAttribute('aria-pressed', String(!on));
    built.setAttribute('aria-pressed', String(on));
  };
  let touched = false;
  plan.addEventListener('click', () => { touched = true; build(false) });
  built.addEventListener('click', () => { touched = true; build(true) });
  frame.addEventListener('reveal-item', () => { touched = true; build(true) });
  // Builds itself once, shortly after the plan comes into view.
  const io = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return;
    io.disconnect();
    window.setTimeout(() => { if (!touched) build(true) }, 1100);
  }, { threshold: 0.55 });
  io.observe(frame);
  const rows = spots.map((s, i) => {
    const row = h('li', { class: 'set-bp-row' },
      h('span', { class: 'latin set-no' }, pad2(i + 1)), h('b', {}, s.title), h('small', {}, s.text));
    row.addEventListener('mouseenter', () => notes[i]?.classList.add('is-on'));
    row.addEventListener('mouseleave', () => notes[i]?.classList.remove('is-on'));
    return row;
  });
  return [h('div', { class: 'wrap' },
    h('div', { class: 'set-bp-head reveal' }, Head(c),
      h('div', { class: 'set-bp-toggle', role: 'group', 'aria-label': 'طريقة العرض' }, plan, built)),
    frame,
    h('div', { class: 'set-bp-foot' },
      h('div', { class: 'set-bp-cap reveal' },
        item.tag ? h('span', { class: 'set-tag' }, Swatch(item), item.tag) : null,
        h('b', {}, item.title), h('small', {}, item.image.caption)),
      rows.length > 0 ? h('ol', { class: 'set-bp-list reveal' }, rows) : null))];
};

const SCENES = [
  { key: 'day', label: 'نهار', note: 'كل الإضاءة تعمل مع ضوء النهار' },
  { key: 'dusk', label: 'مساء', note: 'إضاءة عامة خافتة ترافقها الإضاءة المخفية' },
  { key: 'night', label: 'ليل', note: 'الإضاءة المخفية وحدها ترسم الغرفة' },
] as const;

/**
 * A room with a lighting keypad: day, evening and night scenes. At night the room goes
 * dark and only its hidden lights (the photo's spots) keep glowing.
 */
const lights = (c: Collection): HTMLElement[] => {
  const item = c.items[0];
  if (!item?.image.src) return [h('div', { class: 'wrap' }, Head(c))];
  const src = item.image.src;
  const zones = item.spots ?? [];
  const glows = zones.map((z) => h('span', {
    class: 'set-glow-zone', 'aria-hidden': 'true',
    style: `--x: ${z.x}%; --y: ${z.y}%; --w: ${z.w ?? 12}%; --h: ${z.h ?? 12}%; background-image: url("${absolute(src)}")`,
  }));
  // Each label sits on the upper edge of its light, so the glow itself stays clear.
  const labels = zones.map((z, i) => h('span', {
    class: 'set-glow-label', style: `left: ${z.x}%; top: ${Math.max(6, z.y - (z.h ?? 12) * 0.85)}%`, 'aria-hidden': 'true',
  }, h('i', { class: 'latin' }, String(i + 1)), z.title));
  // The night tint sits under the lights so they keep their warm colour.
  const frame = h('figure', { class: 'set-lights-frame' },
    h('img', { class: 'set-lights-base', src, alt: item.image.caption, loading: 'lazy', decoding: 'async' }),
    h('span', { class: 'set-lights-shade', 'aria-hidden': 'true' }),
    ...glows,
    ...labels);
  const status = h('p', { class: 'set-lights-status', 'aria-live': 'polite' });
  let touched = false;
  const keys = SCENES.map((s) => {
    const key = h('button', { type: 'button', class: 'set-key', 'aria-pressed': 'false' },
      h('i', { class: 'set-key-led', 'aria-hidden': 'true' }), s.label);
    key.addEventListener('click', () => { touched = true; set(s.key) });
    return key;
  });
  const set = (scene: (typeof SCENES)[number]['key']): void => {
    SCENES.forEach((s, i) => {
      frame.classList.toggle(`scene-${s.key}`, s.key === scene);
      keys[i]?.setAttribute('aria-pressed', String(s.key === scene));
      if (s.key === scene) status.textContent = s.note;
    });
  };
  set('day');
  frame.addEventListener('reveal-item', () => { touched = true; set('night') });
  // The first time the room is in view, the evening falls on its own.
  if (!prefersReducedMotion()) {
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      window.setTimeout(() => { if (!touched) set('dusk') }, 1200);
      window.setTimeout(() => { if (!touched) set('night') }, 3600);
    }, { threshold: 0.6 });
    io.observe(frame);
  }
  const keypad = h('div', { class: 'set-keypad', role: 'group', 'aria-label': 'مشاهد الإضاءة' },
    h('span', { class: 'latin set-keypad-brand', 'aria-hidden': 'true' }, 'LIGHT SCENES'),
    h('div', { class: 'set-keys' }, keys));
  return [h('div', { class: 'wrap' },
    Head(c, 'reveal'),
    h('div', { class: 'set-lights-stage reveal' }, frame, keypad),
    h('div', { class: 'set-lights-foot' },
      h('div', { class: 'set-lights-cap' }, status,
        item.tag ? h('span', { class: 'set-tag' }, Swatch(item), item.tag) : null,
        h('b', {}, item.title), h('small', {}, item.image.caption)),
      zones.length > 0
        ? h('ol', { class: 'set-lights-list' }, zones.map((z, i) => h('li', {},
            h('span', { class: 'latin set-no' }, pad2(i + 1)), h('b', {}, z.title), h('small', {}, z.text))))
        : null))];
};

const LAYOUTS: Record<Collection['style'], (c: Collection) => HTMLElement[]> = {
  panels, collage, switch: switcher, stagger, strip, duo, journey, spotlight, hotspots, coverflow, moodboard, cabinet,
  swatches, tiles, mirror, blueprint, lights,
};

/** Styles whose section is pinned and driven by scroll progress. */
const SCROLL_DRIVEN: ReadonlySet<Collection['style']> = new Set(['journey', 'spotlight', 'mirror']);

/** Where each product's photo sits in a layout, in item order. */
const ITEM_FRAMES: Record<Collection['style'], string> = {
  panels: '.set-panel', collage: '.set-tile', switch: '.set-slide', stagger: '.set-step',
  strip: '.set-card', duo: '.set-side', journey: '.set-room:not(.set-room-intro)',
  spotlight: '.set-pin', hotspots: '.set-hot-photo', coverflow: '.set-flow-card', moodboard: '.set-board-img', cabinet: '.set-cab-frame',
  swatches: '.set-sw-slide', tiles: '.set-arch', mirror: '.set-mir-stage', blueprint: '.set-bp-frame', lights: '.set-lights-frame',
};

export function CollectionSection(c: Collection, index: number): HTMLElement {
  const id = `collection-${index + 1}`;
  const section = h('section', {
    class: `set set--${c.style}`, id, 'aria-label': c.title,
    'data-scroll-progress': SCROLL_DRIVEN.has(c.style),
    // The journey has one intro screen plus a screen per room.
    style: c.style === 'journey' ? `--n: ${c.items.length + 1}` : undefined,
  }, ...LAYOUTS[c.style](c));

  // Give every product an address (collection-<section>-<item>) and a share button on its photo.
  section.querySelectorAll<HTMLElement>(ITEM_FRAMES[c.style]).forEach((frame, i) => {
    const item = c.items[i];
    if (!item) return;
    frame.id = `${id}-${i + 1}`;
    frame.classList.add('has-share');
    frame.append(ShareButton(frame.id, item.title));
    if (c.style === 'switch') {
      // Select this photo's tab before scrolling to it.
      frame.addEventListener('reveal-item', () => section.querySelectorAll<HTMLElement>('.set-tab')[i]?.click());
    }
    if (c.style === 'journey') {
      // Rooms slide sideways, so scroll down to the point where this room is on screen.
      frame.addEventListener('reveal-item', (e) => {
        e.preventDefault();
        const travel = section.offsetHeight - innerHeight;
        const top = section.getBoundingClientRect().top + scrollY;
        scrollTo({ top: top + travel * ((i + 1) / c.items.length), behavior: 'instant' });
      });
    }
    if (c.style === 'mirror') {
      // Scroll to where the two halves have closed into one photo.
      frame.addEventListener('reveal-item', (e) => {
        e.preventDefault();
        const travel = section.offsetHeight - innerHeight;
        scrollTo({ top: section.getBoundingClientRect().top + scrollY + travel * 0.92, behavior: 'instant' });
      });
    }
  });
  return section;
}
