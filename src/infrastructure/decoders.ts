/**
 * Tiny runtime decoders: they turn untyped JSON into typed values
 * and report the exact path of any mistake in the data files.
 */

export class DataError extends Error {
  constructor(readonly path: string, expected: string) {
    super(`بيانات غير صحيحة في ${path}: المتوقع ${expected}`);
    this.name = 'DataError';
  }
}

export type Decoder<T> = (value: unknown, path: string) => T;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const string: Decoder<string> = (v, path) => {
  if (typeof v !== 'string' || v.trim() === '') throw new DataError(path, 'نص غير فارغ');
  return v;
};

export const nullable = <T>(decoder: Decoder<T>): Decoder<T | null> => (v, path) =>
  v === null || v === undefined ? null : decoder(v, path);

export const array = <T>(decoder: Decoder<T>): Decoder<readonly T[]> => (v, path) => {
  if (!Array.isArray(v)) throw new DataError(path, 'قائمة');
  return v.map((item, i) => decoder(item, `${path}[${i}]`));
};

export const oneOf = <T extends string>(options: readonly T[]): Decoder<T> => (v, path) => {
  if (typeof v !== 'string' || !(options as readonly string[]).includes(v)) {
    throw new DataError(path, `إحدى القيم: ${options.join('، ')}`);
  }
  return v as T;
};

export const hexColor: Decoder<string> = (v, path) => {
  const s = string(v, path);
  if (!/^#[0-9a-f]{6}$/i.test(s)) throw new DataError(path, 'لون HEX مثل #7B5D08');
  return s;
};

type Shape<T> = { readonly [K in keyof T]: Decoder<T[K]> };

export const object = <T>(shape: Shape<T>): Decoder<T> => (v, path) => {
  if (!isRecord(v)) throw new DataError(path, 'كائن');
  const out = {} as { [K in keyof T]: T[K] };
  for (const key of Object.keys(shape) as (keyof T & string)[]) {
    out[key] = shape[key](v[key], `${path}.${key}`);
  }
  return out;
};

/** Reads a discriminant field first, then decodes with the matching decoder. */
export const tagged = <T>(field: string, decoders: Record<string, Decoder<T>>): Decoder<T> => (v, path) => {
  if (!isRecord(v)) throw new DataError(path, 'كائن');
  const tag = v[field];
  const decoder = typeof tag === 'string' ? decoders[tag] : undefined;
  if (!decoder) throw new DataError(`${path}.${field}`, `إحدى القيم: ${Object.keys(decoders).join('، ')}`);
  return decoder(v, path);
};
