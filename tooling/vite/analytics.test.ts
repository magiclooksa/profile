import { describe, expect, it } from 'vitest';
import { containerId, EVENTS_SCRIPT, gtagSnippet, gtmNoscript, gtmSnippet, measurementId, trackingTags } from './analytics';

describe('Google Analytics and Tag Manager', () => {
  it('is off while the ID is the placeholder or invalid', () => {
    expect(measurementId('G-XXXXXXXXXX')).toBeNull();
    expect(measurementId('')).toBeNull();
    expect(measurementId(null)).toBeNull();
    expect(measurementId('UA-12345-1')).toBeNull();
    expect(measurementId('G-1"><script>')).toBeNull();
    expect(containerId('GTM-XXXXXXX')).toBeNull();
    expect(containerId('GTM-1"><script>')).toBeNull();
  });

  it('accepts GA4 and GTM IDs', () => {
    expect(measurementId(' g-ab12cd34ef ')).toBe('G-AB12CD34EF');
    expect(containerId('gtm-ab12cd3')).toBe('GTM-AB12CD3');
  });

  it('writes the snippets for the IDs', () => {
    expect(gtagSnippet('G-AB12CD34EF')).toContain("gtag('config','G-AB12CD34EF')");
    expect(gtmSnippet('GTM-AB12CD3')).toContain("'dataLayer','GTM-AB12CD3'");
    expect(gtmNoscript('GTM-AB12CD3')).toContain('ns.html?id=GTM-AB12CD3');
  });

  it('prefers GTM, and loads GA4 directly only without it', () => {
    const gtm = trackingTags({ gtm: 'GTM-AB12CD3', ga4: 'G-AB12CD34EF' });
    expect(gtm?.head).toContain('gtm.js');
    expect(gtm?.head).not.toContain('gtag/js');
    expect(gtm?.body).toContain('ns.html');
    const ga4 = trackingTags({ gtm: null, ga4: 'G-AB12CD34EF' });
    expect(ga4?.head).toContain('gtag/js?id=G-AB12CD34EF');
    expect(ga4?.head).toContain('mlUseGtag=true');
    expect(trackingTags({ gtm: null, ga4: null })).toBeNull();
  });

  it('tracks calls, WhatsApp, directions and the quote form', () => {
    for (const name of ['click_call', 'click_whatsapp', 'click_directions', 'generate_lead']) expect(EVENTS_SCRIPT).toContain(name);
  });
});
