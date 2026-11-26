/**
 * Google Analytics 4: visitors, page views and browsing, in the Google Analytics dashboard.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │  ضع معرّف القياس (Measurement ID) هنا، مكان G-XXXXXXXXXX، ثم أعد بناء الموقع.               │
 * │  Put the Measurement ID here, in place of G-XXXXXXXXXX, then rebuild the site.           │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * The GA_MEASUREMENT_ID environment variable overrides it. While the value is still the
 * placeholder (or empty), nothing is added to the pages. The dashboard page is never tracked.
 */
import { basename } from 'node:path';
import type { Plugin } from 'vite';

export const GA_MEASUREMENT_ID = 'G-KMMYNYBGPG';

/** Pages that are not tracked: the content dashboard (behind a password, not for visitors). */
const UNTRACKED = new Set(['dashboard.html']);

const VALID_ID = /^G-[A-Z0-9]{4,}$/;

/** The ID to use, or null while it is still the placeholder or not a GA4 ID. */
export function measurementId(value: string | undefined = process.env.GA_MEASUREMENT_ID ?? GA_MEASUREMENT_ID): string | null {
  const id = (value ?? '').trim().toUpperCase();
  return VALID_ID.test(id) && id !== 'G-XXXXXXXXXX' ? id : null;
}

/** The gtag.js snippet Google gives for a GA4 property. */
export const gtagSnippet = (id: string): string => [
  '<!-- Google tag (gtag.js) -->',
  `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
  `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`,
].join('\n    ');

/** Adds the snippet at the top of <head> in every page the build writes. */
export function analyticsPlugin(): Plugin {
  return {
    name: 'magic-look:google-analytics',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const id = measurementId();
        if (!id || UNTRACKED.has(basename(ctx.filename)) || html.includes('googletagmanager.com/gtag/js')) return html;
        return html.replace(/<head([^>]*)>/i, (tag) => `${tag}\n    ${gtagSnippet(id)}`);
      },
    },
  };
}
