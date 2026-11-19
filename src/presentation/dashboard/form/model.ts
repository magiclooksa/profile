/** Pure rules the form editor follows. No DOM here, so they are easy to test. */
import { isJsonObject, type JsonValue } from '../../../domain/content';

const MEDIA = /\.(jpe?g|png|webp|avif|gif|svg|mp4|webm|mov)$/i;
const VIDEO = /\.(mp4|webm|mov)$/i;
const COLOR = /^#[0-9a-f]{6}$/i;

export const isMediaPath = (value: string): boolean => MEDIA.test(value.trim());
export const isVideoPath = (value: string): boolean => VIDEO.test(value.trim());
export const isColor = (value: string): boolean => COLOR.test(value);
/** Long texts get a text area instead of a one-line field. */
export const isLongText = (value: string): boolean => value.length > 70 || value.includes('\n');

/**
 * An empty value of the same shape, for a new list item: texts become "", numbers 0, lists empty,
 * and objects keep their fields. A field that is null stays null.
 */
export function blankLike(sample: JsonValue | undefined): JsonValue {
  if (sample === undefined || typeof sample === 'string') return '';
  if (typeof sample === 'number') return 0;
  if (typeof sample === 'boolean') return false;
  if (sample === null) return null;
  if (Array.isArray(sample)) return [];
  return Object.fromEntries(Object.entries(sample).map(([key, value]) => [key, blankLike(value)]));
}

const FIELDS_FOR_LABEL = ['title', 'name', 'question', 'q', 'caption', 'text', 'slug', 'id', 'href'] as const;

/** A readable name for a list item: its title, name or caption, shortened. */
export function itemLabel(item: JsonValue, index: number): string {
  const fallback = `العنصر ${index + 1}`;
  let text: string | undefined;
  if (typeof item === 'string') text = item;
  else if (isJsonObject(item)) {
    for (const field of FIELDS_FOR_LABEL) {
      const value = item[field];
      if (typeof value === 'string' && value.trim()) { text = value; break; }
      if (isJsonObject(value) && typeof value.ar === 'string') { text = value.ar; break; }
    }
  }
  if (!text?.trim()) return fallback;
  const short = text.trim().replace(/\s+/g, ' ');
  return short.length > 60 ? `${short.slice(0, 57)}…` : short;
}

/** Moves one list item, returning a new list. Out-of-range moves leave the list as it was. */
export function move<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  if (from < 0 || from >= out.length || to < 0 || to >= out.length) return out;
  const [item] = out.splice(from, 1) as [T];
  out.splice(to, 0, item);
  return out;
}
