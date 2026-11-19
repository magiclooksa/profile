/**
 * Content management: the site's content is a set of JSON documents (public/data/*.json).
 * The dashboard reads and writes them through these ports, never through files or HTTP directly.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** Where a document belongs in the dashboard's menu. */
export type ContentGroup = 'identity' | 'sections' | 'catalogues' | 'pages' | 'settings';

export interface ContentDocument {
  /** Path inside the data folder, e.g. "faq.json" or "projects/majlis-sofa-room.json". */
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly group: ContentGroup;
}

/** Port: where documents are stored (the dev server's files today, an API or Git tomorrow). */
export interface ContentRepository {
  /** Every document path, relative to the data folder. */
  list(): Promise<readonly string[]>;
  read(path: string): Promise<JsonValue>;
  write(path: string, value: JsonValue): Promise<void>;
}

/** Port: the photos and films the site can show, as paths relative to the site root. */
export interface MediaLibrary {
  list(): Promise<readonly string[]>;
  /** Stores a new photo or film and returns its path. */
  upload(file: Blob, name: string): Promise<string>;
}

/** Whether the live site already shows the latest save. */
export interface PublishStatus {
  readonly state: 'live' | 'building' | 'failed';
  readonly updatedAt: string | null;
  readonly message: string | null;
}

/** Port: the state of publishing on the server. */
export interface PublishMonitor {
  status(): Promise<PublishStatus>;
}

/** Port: signing in to the dashboard. */
export interface SessionGateway {
  status(): Promise<{ readonly authenticated: boolean; readonly required: boolean }>;
  /** Throws an Error with a message for the person when the password is refused. */
  login(password: string): Promise<void>;
  logout(): Promise<void>;
}

/** Any port throws this when the session has ended, so the dashboard can ask to sign in again. */
export class SessionExpiredError extends Error {
  constructor(message = 'انتهت الجلسة، سجّل الدخول من جديد') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

/** Port: checks a document against its schema. Throws an Error that says what is wrong and where. */
export type ContentValidator = (path: string, value: JsonValue) => void;

export const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
