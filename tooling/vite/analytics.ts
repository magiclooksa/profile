/**
 * Tracking: Google Tag Manager (or GA4 directly while there is no GTM container), plus the
 * lead events the SEO brief asks for, on every page the build writes except the dashboard.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │  المعرّفات في public/data/seo.json (تُعدّل من لوحة التحكم):                                 │
 * │    gtmId  مثل GTM-ABC1234  → يُركّب Google Tag Manager ويُدار GA4 من داخله                    │
 * │    ga4Id  مثل G-ABC123     → يُستخدم مباشرة فقط ما دام gtmId فارغًا                           │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * The GTM_ID and GA_MEASUREMENT_ID environment variables override the data file.
 *
 * Events (sent to the dataLayer for GTM, or straight to GA4 through gtag):
 *   click_call        a tel: link
 *   click_whatsapp    a wa.me / WhatsApp link
 *   generate_lead     the quote form is sent
 *   click_directions  a Google Maps link
 * Each carries page_location, page_title and link_url. Register the first three as Key events in GA4.
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { Plugin } from 'vite';

/** The GA4 property used before seo.json had its own field. */
export const GA_MEASUREMENT_ID = 'G-KMMYNYBGPG';

/** Pages that are not tracked: the content dashboard (behind a password, not for visitors). */
const UNTRACKED = new Set(['dashboard.html']);

const VALID_GA4 = /^G-[A-Z0-9]{4,}$/;
const VALID_GTM = /^GTM-[A-Z0-9]{4,}$/;

const pick = (value: string | null | undefined, valid: RegExp, placeholder: string): string | null => {
  const id = (value ?? '').trim().toUpperCase();
  return valid.test(id) && id !== placeholder ? id : null;
};

/** A GA4 ID, or null while it is still the placeholder or not a GA4 ID. */
export const measurementId = (value: string | null | undefined): string | null => pick(value, VALID_GA4, 'G-XXXXXXXXXX');

/** A GTM container ID, or null while it is still the placeholder or not a GTM ID. */
export const containerId = (value: string | null | undefined): string | null => pick(value, VALID_GTM, 'GTM-XXXXXXX');

/** The gtag.js snippet Google gives for a GA4 property. */
export const gtagSnippet = (id: string): string => [
  '<!-- Google tag (gtag.js) -->',
  `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
  `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`,
].join('\n    ');

/** The head snippet Google gives for a GTM container. */
export const gtmSnippet = (id: string): string => [
  '<!-- Google Tag Manager -->',
  `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');</script>`,
  '<!-- End Google Tag Manager -->',
].join('\n    ');

/** The <noscript> part GTM asks for right after <body>. */
export const gtmNoscript = (id: string): string =>
  `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;

/**
 * Lead events, by event delegation so links drawn later by scripts count too. With GTM the events
 * go to the dataLayer (one "Custom event" trigger per name); without it, straight to GA4.
 */
export const EVENTS_SCRIPT = `<script>(function(){var w=window,d=document;w.dataLayer=w.dataLayer||[];
function send(name,url){var p={page_location:location.href,page_title:d.title,link_url:url||''};
if(w.mlUseGtag&&typeof w.gtag==='function'){w.gtag('event',name,p);}else{p.event=name;w.dataLayer.push(p);}}
d.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;var h=a.getAttribute('href')||'';
if(/^tel:/i.test(h))send('click_call',h);
else if(/(wa\\.me|api\\.whatsapp\\.com|whatsapp:)/i.test(h))send('click_whatsapp',h);
else if(/(maps\\.app\\.goo\\.gl|google\\.[a-z.]+\\/maps|goo\\.gl\\/maps)/i.test(h))send('click_directions',h);},true);
d.addEventListener('submit',function(e){var f=e.target;if(f&&f.id==='quote-form')send('generate_lead',f.getAttribute('data-whatsapp')?'whatsapp':'');},true);
w.mlTrack=send;})();</script>`;

export interface TrackingIds { readonly gtm: string | null; readonly ga4: string | null }

/** The IDs from the environment, else from seo.json, else the original GA4 property. */
export function trackingIds(root?: string): TrackingIds {
  let data: { gtmId?: string | null; ga4Id?: string | null } = {};
  const file = root ? resolve(root, 'public/data/seo.json') : null;
  if (file && existsSync(file)) data = JSON.parse(readFileSync(file, 'utf8')) as typeof data;
  return {
    gtm: containerId(process.env.GTM_ID ?? data.gtmId),
    ga4: measurementId(process.env.GA_MEASUREMENT_ID ?? data.ga4Id ?? GA_MEASUREMENT_ID),
  };
}

/** What goes at the top of <head> and right after <body> for the given IDs. */
export function trackingTags(ids: TrackingIds): { head: string; body: string } | null {
  if (ids.gtm) return { head: `${gtmSnippet(ids.gtm)}\n    ${EVENTS_SCRIPT}`, body: gtmNoscript(ids.gtm) };
  if (ids.ga4) return { head: `${gtagSnippet(ids.ga4)}\n    <script>window.mlUseGtag=true</script>\n    ${EVENTS_SCRIPT}`, body: '' };
  return null;
}

/** Adds the tags to every page the build writes. */
export function analyticsPlugin(root?: string): Plugin {
  return {
    name: 'magic-look:analytics',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const tags = trackingTags(trackingIds(root));
        if (!tags || UNTRACKED.has(basename(ctx.filename)) || html.includes('googletagmanager.com/')) return html;
        const out = html.replace(/<head([^>]*)>/i, (tag) => `${tag}\n    ${tags.head}`);
        return tags.body ? out.replace(/<body([^>]*)>/i, (tag) => `${tag}\n    ${tags.body}`) : out;
      },
    },
  };
}
