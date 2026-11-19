/** How the site presents itself to search engines and AI assistants (public/data/seo.json). */
export interface SeoSettings {
  /** Public address of the site, ending in "/". Link previews and sitemaps need absolute URLs. */
  readonly siteUrl: string;
  /** Title of the home page, as it shows in search results. */
  readonly title: string;
  /** About 120 to 160 characters: the snippet under the title in search results. */
  readonly description: string;
  readonly keywords: readonly string[];
  /** Share image of the home page (1200 × 630), relative to the site. */
  readonly image: { readonly src: string; readonly alt: string };
  readonly logo: string;
  readonly business: {
    /** schema.org types, e.g. HomeAndConstructionBusiness, FurnitureStore. */
    readonly types: readonly string[];
    readonly foundingDate: string | null;
    readonly city: string | null;
    readonly region: string | null;
    /** Two-letter country code. */
    readonly country: string;
    readonly latitude: number | null;
    readonly longitude: number | null;
    /** schema.org format, e.g. "Sa-Th 09:00-22:00". */
    readonly openingHours: readonly string[];
    /** e.g. "$$" or "SAR 5,000 - 100,000". */
    readonly priceRange: string | null;
    readonly areaServed: readonly string[];
  };
  /** Full links to the company's official accounts: Instagram, X, TikTok, Snapchat, Google Maps… */
  readonly social: readonly string[];
  /** The content value of each search console's verification meta tag. */
  readonly verification: { readonly google: string | null; readonly bing: string | null };
  /** Let AI assistants (ChatGPT, Claude, Perplexity, Gemini…) read the site so they can cite it. */
  readonly aiCrawlers: boolean;
}
