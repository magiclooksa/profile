import type { ContactMessage, MessageGateway } from '../domain/MessageGateway';
import type { JsonFetcher } from './JsonProfileRepository';

/**
 * Where the server lives. VITE_API_URL points the site at another address
 * (e.g. the GitHub Pages copy reading from the hosted server); by default the
 * site asks the server it was loaded from.
 */
export const apiBase = (): string => {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  return configured ? `${configured.replace(/\/+$/, '')}/` : import.meta.env.BASE_URL;
};

/**
 * Reads each section from the database through the API, in one request for all of them.
 * A section the database does not have yet, or a site with no server (plain static hosting),
 * falls back to the JSON file shipped with the site.
 */
export class ApiContent {
  private bundle: Promise<Record<string, unknown> | null> | null = null;

  constructor(private readonly base: string, private readonly fallback: JsonFetcher) {}

  private load(): Promise<Record<string, unknown> | null> {
    // A server that is asleep or slow must not hold the page: after a few seconds the files are used.
    this.bundle ??= fetch(`${this.base}api/content`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) })
      .then(async (r) => {
        if (!r.ok || !r.headers.get('content-type')?.includes('json')) return null;
        const body: unknown = await r.json();
        return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
      })
      .catch(() => null);
    return this.bundle;
  }

  /** True when the server answered, so features that need it (the contact form) can be shown. */
  async online(): Promise<boolean> {
    return (await this.load()) !== null;
  }

  readonly fetcher: JsonFetcher = async (file) => {
    const sections = await this.load();
    const key = file.replace(/\.json$/, '');
    return sections && key in sections ? sections[key] : this.fallback(file);
  };
}

/** Sends contact-form messages to the server, which stores them in the database. */
export class ApiMessageGateway implements MessageGateway {
  constructor(private readonly base: string) {}

  async send(message: ContactMessage): Promise<void> {
    const response = await fetch(`${this.base}api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    }).catch(() => null);
    if (!response) throw new Error('تعذّر الاتصال، تحقق من الإنترنت وحاول مرة أخرى');
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'تعذّر إرسال الرسالة، حاول مرة أخرى');
    }
  }
}
