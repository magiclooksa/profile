/** Talks to the server on behalf of the dashboard, carrying the login token. */

const TOKEN_KEY = 'ml-admin-token';

export interface SectionInfo { key: string; label: string; updatedAt: string | null }
export interface MediaFile {
  id: string; name: string; size: number; contentType: string; url: string;
  folder?: string; uploadedAt?: string; driver?: 'disk' | 'gridfs';
}
export interface FolderListing {
  folder: string;
  folders: { path: string; name: string }[];
  files: MediaFile[];
  usage: { count: number; bytes: number; driver: 'disk' | 'gridfs' };
}
export interface Message {
  id: string; name: string; phone: string; email: string | null; city: string | null;
  message: string; read: boolean; createdAt: string;
}
export interface Version { id: string; savedAt: string }

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly path?: string) {
    super(message);
  }
}

const storage = {
  get: (): string | null => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (v: string): void => { try { localStorage.setItem(TOKEN_KEY, v) } catch { /* private mode */ } },
  clear: (): void => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ } },
};

export class AdminClient {
  private token = storage.get();
  /** Called when the server says the login has expired. */
  onLoggedOut: () => void = () => {};

  constructor(private readonly base: string) {}

  get loggedIn(): boolean { return this.token !== null }

  /** Turns a stored file URL into one the dashboard can show (relative URLs are relative to the server). */
  resolve(url: string): string {
    return /^(https?:|data:|blob:)/.test(url) ? url : `${this.base}${url.replace(/^\.?\//, '')}`;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }

    const response = await fetch(`${this.base}api/${path}`, { method, headers, ...(payload ? { body: payload } : {}) })
      .catch(() => { throw new ApiError('تعذّر الاتصال بالخادم', 0) });
    const data = await response.json().catch(() => ({})) as { error?: string; path?: string };
    if (response.status === 401 && path !== 'auth/login') { this.logout(); this.onLoggedOut() }
    if (!response.ok) throw new ApiError(data.error ?? `خطأ ${response.status}`, response.status, data.path);
    return data as T;
  }

  async login(password: string): Promise<void> {
    const { token } = await this.request<{ token: string }>('POST', 'auth/login', { password });
    this.token = token;
    storage.set(token);
  }

  logout(): void {
    this.token = null;
    storage.clear();
  }

  check = (): Promise<unknown> => this.request('GET', 'auth/me');
  sections = (): Promise<SectionInfo[]> => this.request('GET', 'content/sections');
  section = (key: string): Promise<unknown> => this.request('GET', `content/${encodeURIComponent(key)}`);
  save = (key: string, data: unknown): Promise<{ updatedAt: string }> => this.request('PUT', `content/${encodeURIComponent(key)}`, data);
  history = (key: string): Promise<Version[]> => this.request('GET', `content/${encodeURIComponent(key)}/history`);
  restore = (key: string, id: string): Promise<{ data: unknown }> =>
    this.request('POST', `content/${encodeURIComponent(key)}/history/${id}/restore`);

  /** A folder's contents, or a search across every folder when q is given. */
  files = (folder = '', q = ''): Promise<FolderListing> =>
    this.request('GET', `files?folder=${encodeURIComponent(folder)}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  deleteFile = (id: string): Promise<unknown> => this.request('DELETE', `files/${id}`);
  updateFile = (id: string, change: { name?: string; folder?: string }): Promise<MediaFile> => this.request('PATCH', `files/${id}`, change);
  allFolders = (): Promise<string[]> => this.request('GET', 'folders');
  createFolder = (path: string): Promise<unknown> => this.request('POST', 'folders', { path });
  moveFolder = (from: string, to: string): Promise<unknown> => this.request('PATCH', 'folders', { from, to });
  deleteFolder = (path: string): Promise<unknown> => this.request('DELETE', `folders?path=${encodeURIComponent(path)}`);

  /** Uploads with progress (fetch cannot report upload progress, XHR can). */
  upload(files: File[], onProgress: (fraction: number) => void = () => {}, folder = ''): Promise<MediaFile[]> {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    return new Promise((done, fail) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.base}api/files?folder=${encodeURIComponent(folder)}`);
      if (this.token) xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total) };
      xhr.onerror = () => fail(new ApiError('تعذّر رفع الملف', 0));
      xhr.onload = () => {
        let body: unknown = {};
        try { body = JSON.parse(xhr.responseText) } catch { /* not JSON */ }
        if (xhr.status >= 200 && xhr.status < 300) return done(body as MediaFile[]);
        if (xhr.status === 401) { this.logout(); this.onLoggedOut() }
        fail(new ApiError((body as { error?: string }).error ?? `خطأ ${xhr.status}`, xhr.status));
      };
      xhr.send(form);
    });
  }

  messages = (): Promise<Message[]> => this.request('GET', 'messages');
  markRead = (id: string, read: boolean): Promise<unknown> => this.request('PATCH', `messages/${id}`, { read });
  deleteMessage = (id: string): Promise<unknown> => this.request('DELETE', `messages/${id}`);
}
