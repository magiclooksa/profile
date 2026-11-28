/**
 * The type and pixel size of a PNG or JPEG, read from the file's header, so link previews
 * (Open Graph, X cards) describe the image as it really is.
 */
import { closeSync, existsSync, openSync, readSync } from 'node:fs';

export interface ImageInfo {
  readonly type: 'image/png' | 'image/jpeg' | 'image/webp';
  readonly width: number;
  readonly height: number;
}

const HEAD = 64 * 1024;

function readHead(file: string): Buffer {
  const fd = openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(HEAD);
    return buffer.subarray(0, readSync(fd, buffer, 0, HEAD, 0));
  } finally {
    closeSync(fd);
  }
}

/** PNG: the IHDR chunk right after the signature holds the width and height. */
function png(b: Buffer): ImageInfo | null {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { type: 'image/png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/** JPEG: walk the segments to the first start-of-frame marker, which holds the size. */
function jpeg(b: Buffer): ImageInfo | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let at = 2;
  while (at + 9 < b.length) {
    if (b[at] !== 0xff) return null;
    const marker = b[at + 1] ?? 0;
    const length = b.readUInt16BE(at + 2);
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return { type: 'image/jpeg', height: b.readUInt16BE(at + 5), width: b.readUInt16BE(at + 7) };
    at += 2 + length;
  }
  return null;
}

/** WebP: the first chunk after the RIFF header holds the size, in one of three layouts. */
function webp(b: Buffer): ImageInfo | null {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') return { type: 'image/webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { type: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') return { type: 'image/webp', width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  return null;
}

/** The image's type and size, or null when the file is missing or not a PNG, JPEG or WebP. */
export function imageInfo(file: string): ImageInfo | null {
  if (!existsSync(file)) return null;
  const head = readHead(file);
  return png(head) ?? jpeg(head) ?? webp(head);
}

/** X shows a large card only for wide images; a square logo reads better as the small card. */
export const twitterCard = (info: ImageInfo | null): 'summary' | 'summary_large_image' =>
  info && info.width / info.height < 1.4 ? 'summary' : 'summary_large_image';
