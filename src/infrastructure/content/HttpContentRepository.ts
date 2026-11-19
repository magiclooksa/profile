import {
  SessionExpiredError, type ContentRepository, type JsonValue, type MediaLibrary, type PublishMonitor,
  type PublishStatus, type SessionGateway,
} from '../../domain/content';

/** The content API (server/content/contentHandler.ts), the same in development and production. */
const API = '/__content';
/** Requests that change something carry this header; other sites cannot send it (CSRF). */
const WRITE_HEADERS = { 'X-Dashboard': '1' };

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...init });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (response.status === 401 && !url.endsWith('/session')) throw new SessionExpiredError(body?.error);
  if (!response.ok) throw new Error(body?.error ?? `تعذّر الاتصال بالخادم (${response.status})`);
  return body as T;
}

const sendJson = (method: string, value: unknown): RequestInit => ({
  method,
  headers: { ...WRITE_HEADERS, 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});

const documentUrl = (path: string): string =>
  `${API}/documents/${path.split('/').map(encodeURIComponent).join('/')}`;

/** Adapter: the data files, through the server. */
export class HttpContentRepository implements ContentRepository {
  list(): Promise<readonly string[]> {
    return request<string[]>(`${API}/documents`);
  }

  read(path: string): Promise<JsonValue> {
    return request<JsonValue>(documentUrl(path));
  }

  async write(path: string, value: JsonValue): Promise<void> {
    await request<unknown>(documentUrl(path), sendJson('PUT', value));
  }
}

/** Adapter: every photo and film in public/, as paths relative to the site root. */
export class HttpMediaLibrary implements MediaLibrary {
  list(): Promise<readonly string[]> {
    return request<string[]>(`${API}/media`);
  }

  async upload(file: Blob, name: string): Promise<string> {
    const { path } = await request<{ path: string }>(`${API}/media?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { ...WRITE_HEADERS, 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    return path;
  }
}

/** Adapter: whether the live site shows the latest save. */
export class HttpPublishMonitor implements PublishMonitor {
  status(): Promise<PublishStatus> {
    return request<PublishStatus>(`${API}/status`);
  }
}

/** Adapter: signing in with the dashboard password. */
export class HttpSessionGateway implements SessionGateway {
  status(): Promise<{ authenticated: boolean; required: boolean }> {
    return request(`${API}/session`);
  }

  async login(password: string): Promise<void> {
    await request<unknown>(`${API}/session`, sendJson('POST', { password }));
  }

  async logout(): Promise<void> {
    await request<unknown>(`${API}/session`, { method: 'DELETE', headers: WRITE_HEADERS });
  }
}
