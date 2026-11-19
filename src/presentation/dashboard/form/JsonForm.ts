/**
 * A form for any JSON document: objects become groups, lists get add / move / remove, texts become
 * fields or text areas, colours get a picker, and photo paths show the photo. It edits the value in
 * place and reports each change, so the document view decides when to save.
 */
import { isJsonObject, type JsonValue } from '../../../domain/content';
import { h } from '../../shared/dom';
import { fieldLabel } from './labels';
import { blankLike, isColor, isLongText, isMediaPath, isVideoPath, itemLabel, move } from './model';

export interface FormContext {
  /** Prefix that turns a data path ("images/a.jpg") into a URL the dashboard can show. */
  readonly mediaBase: string;
  /** Id of a <datalist> with every media path, for suggestions. */
  readonly mediaListId: string;
  readonly readOnly: boolean;
  onChange(): void;
  /** Uploads a photo or film and returns its path, or null when it failed (the caller reports why). */
  upload(file: File): Promise<string | null>;
}

/** Reads and replaces one value inside its parent. */
interface Slot {
  get(): JsonValue;
  set(value: JsonValue): void;
}

const MEDIA_KEYS = new Set(['src', 'poster', 'swatch', 'card', 'photo', 'mapImage', 'signature', 'logo']);

const iconButton = (label: string, symbol: string, onClick: () => void, disabled = false): HTMLButtonElement => {
  const button = h('button', { type: 'button', class: 'icon-btn', title: label, 'aria-label': label, disabled }, symbol);
  button.addEventListener('click', onClick);
  return button;
};

function mediaPreview(ctx: FormContext, path: string): { element: HTMLElement; update(value: string): void } {
  const element = h('span', { class: 'media-preview' });
  const update = (value: string): void => {
    element.replaceChildren();
    if (!isMediaPath(value)) return;
    const url = `${ctx.mediaBase}${encodeURI(value.trim())}`;
    element.append(isVideoPath(value)
      ? h('video', { src: url, muted: true, preload: 'metadata' })
      : h('img', { src: url, alt: '', loading: 'lazy' }));
  };
  update(path);
  return { element, update };
}

/** A button that uploads a photo or film and puts its path in the field. */
function uploadButton(ctx: FormContext, onUploaded: (path: string) => void): HTMLElement {
  const picker = h('input', { type: 'file', accept: 'image/*,video/*', hidden: true });
  const button = h('button', { type: 'button', class: 'btn btn-ghost btn-sm' }, 'رفع');
  button.addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => {
    const file = picker.files?.[0];
    if (!file) return;
    button.disabled = true;
    button.textContent = 'جارٍ الرفع…';
    void ctx.upload(file).then((path) => {
      if (path) onUploaded(path);
    }).finally(() => {
      button.disabled = false;
      button.textContent = 'رفع';
      picker.value = '';
    });
  });
  return h('span', {}, button, picker);
}

function stringControl(key: string, slot: Slot, ctx: FormContext): HTMLElement {
  const value = slot.get() as string;
  const write = (next: string): void => { slot.set(next); ctx.onChange(); };

  if (isColor(value)) {
    const text = h('input', { type: 'text', value, dir: 'ltr', class: 'input color-text', disabled: ctx.readOnly });
    const picker = h('input', { type: 'color', value, class: 'color-picker', disabled: ctx.readOnly, 'aria-label': 'اختيار اللون' });
    text.addEventListener('input', () => { if (isColor(text.value)) picker.value = text.value; write(text.value); });
    picker.addEventListener('input', () => { text.value = picker.value.toUpperCase(); write(text.value); });
    return h('span', { class: 'control-row' }, picker, text);
  }

  if (MEDIA_KEYS.has(key) || isMediaPath(value)) {
    const input = h('input', { type: 'text', value, dir: 'ltr', class: 'input', list: ctx.mediaListId, disabled: ctx.readOnly });
    const preview = mediaPreview(ctx, value);
    const set = (path: string): void => {
      input.value = path;
      write(path);
      preview.update(path);
    };
    input.addEventListener('input', () => set(input.value));
    return h('span', { class: 'control-media' }, preview.element, input, ctx.readOnly ? null : uploadButton(ctx, set));
  }

  if (isLongText(value)) {
    const area = h('textarea', { class: 'input', rows: Math.min(10, Math.max(3, Math.ceil(value.length / 70))), disabled: ctx.readOnly });
    area.value = value;
    area.addEventListener('input', () => write(area.value));
    return area;
  }

  const input = h('input', { type: 'text', value, class: 'input', disabled: ctx.readOnly });
  input.addEventListener('input', () => write(input.value));
  return input;
}

function primitiveControl(key: string, slot: Slot, ctx: FormContext, rerender: () => void): HTMLElement {
  const value = slot.get();
  if (typeof value === 'string') return stringControl(key, slot, ctx);
  if (typeof value === 'number') {
    const input = h('input', { type: 'number', step: 'any', value, dir: 'ltr', class: 'input input-number', disabled: ctx.readOnly });
    input.addEventListener('input', () => {
      if (input.value === '' || !Number.isFinite(input.valueAsNumber)) return;
      slot.set(input.valueAsNumber);
      ctx.onChange();
    });
    return input;
  }
  if (typeof value === 'boolean') {
    const input = h('input', { type: 'checkbox', class: 'switch', checked: value, disabled: ctx.readOnly });
    input.addEventListener('change', () => { slot.set(input.checked); ctx.onChange(); });
    return input;
  }
  // null: the value is not known yet.
  const add = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', disabled: ctx.readOnly }, 'إضافة قيمة');
  add.addEventListener('click', () => { slot.set(''); ctx.onChange(); rerender(); });
  return h('span', { class: 'control-row' }, h('span', { class: 'empty-value' }, 'غير محدد'), add);
}

/** Renders one value; containers re-render themselves when their structure changes. */
function field(key: string, label: string, slot: Slot, ctx: FormContext, depth: number): HTMLElement {
  let element: HTMLElement;
  const rerender = (): void => {
    const next = field(key, label, slot, ctx, depth);
    element.replaceWith(next);
    element = next;
  };
  const value = slot.get();
  if (Array.isArray(value)) element = listGroup(key, label, slot, ctx, depth, rerender);
  else if (isJsonObject(value)) element = objectGroup(label, slot, ctx, depth);
  else element = h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), primitiveControl(key, slot, ctx, rerender));
  return element;
}

function objectGroup(label: string, slot: Slot, ctx: FormContext, depth: number): HTMLElement {
  const object = slot.get() as Record<string, JsonValue>;
  const fields = Object.keys(object).map((key) =>
    field(key, fieldLabel(key), { get: () => object[key] as JsonValue, set: (v) => { object[key] = v; } }, ctx, depth + 1));
  if (depth === 0) return h('div', { class: 'form-root' }, fields);
  return h('details', { class: 'group', open: depth < 2 },
    h('summary', {}, h('span', { class: 'group-title' }, label)),
    h('div', { class: 'group-body' }, fields));
}

function listGroup(key: string, label: string, slot: Slot, ctx: FormContext, depth: number, rerender: () => void): HTMLElement {
  const list = slot.get() as JsonValue[];
  const replace = (next: JsonValue[]): void => { slot.set(next); ctx.onChange(); rerender(); };

  const items = list.map((item, i) => {
    const itemSlot: Slot = { get: () => list[i] as JsonValue, set: (v) => { list[i] = v; } };
    const tools = ctx.readOnly ? [] : [
      iconButton('تحريك لأعلى', '↑', () => replace(move(list, i, i - 1)), i === 0),
      iconButton('تحريك لأسفل', '↓', () => replace(move(list, i, i + 1)), i === list.length - 1),
      iconButton('حذف', '×', () => {
        if (confirm(`حذف «${itemLabel(item, i)}»؟`)) replace(list.filter((_, j) => j !== i));
      }),
    ];
    const isContainer = typeof item === 'object' && item !== null;
    if (!isContainer) {
      return h('div', { class: 'list-row' }, field(key, `${i + 1}`, itemSlot, ctx, depth + 1), h('span', { class: 'tools' }, tools));
    }
    return h('details', { class: 'list-item' },
      h('summary', {}, h('span', { class: 'item-index' }, String(i + 1)), h('span', { class: 'item-title' }, itemLabel(item, i)),
        h('span', { class: 'tools' }, tools)),
      h('div', { class: 'group-body' }, field(key, itemLabel(item, i), itemSlot, ctx, 0)));
  });

  const add = h('button', { type: 'button', class: 'btn btn-ghost btn-sm add-item', disabled: ctx.readOnly }, '+ إضافة عنصر');
  add.addEventListener('click', () => replace([...list, blankLike(list[list.length - 1])]));

  const body = h('div', { class: 'group-body list-body' }, items, items.length === 0 ? h('p', { class: 'empty-value' }, 'القائمة فارغة') : null, add);
  if (depth === 0) return h('div', { class: 'form-root' }, body);
  return h('details', { class: 'group', open: depth < 2 },
    h('summary', {}, h('span', { class: 'group-title' }, label), h('span', { class: 'count' }, String(list.length))),
    body);
}

/** Builds the form. `document` is edited in place; read it back after onChange. */
export function renderJsonForm(document: { value: JsonValue }, ctx: FormContext): HTMLElement {
  return field('', '', { get: () => document.value, set: (v) => { document.value = v; } }, ctx, 0);
}
