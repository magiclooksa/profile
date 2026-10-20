/** Minimal, typed DOM builder. Text always goes through textContent, never innerHTML. */

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | undefined | null>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    el.setAttribute(key, value === true ? '' : String(value));
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: (Child | Child[])[]): void {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Two-digit number in Latin digits, used for section and step numbers. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Shows the value, or a bracketed placeholder when the data is still missing. */
export const orPlaceholder = (value: string | null, placeholder: string): string =>
  value ?? `[${placeholder}]`;

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Splits text into word spans (`.w > span`) for masked reveals and scroll fills.
 * Words stay whole so Arabic letters keep joining; spaces stay as text nodes.
 */
export function splitWords(text: string, start = 0, className = ''): Node[] {
  const nodes: Node[] = [];
  text.trim().split(/\s+/).forEach((word, i) => {
    if (i > 0) nodes.push(document.createTextNode(' '));
    const inner = h('span', {}, word);
    inner.style.setProperty('--wi', String(start + i));
    nodes.push(h('span', { class: `w ${className}`.trim() }, inner));
  });
  return nodes;
}

export const finePointer = (): boolean =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;
