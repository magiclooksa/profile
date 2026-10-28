import { resolve } from 'node:path';

/** Server settings, all read from environment variables (see .env.example). */

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`متغير البيئة ${name} مطلوب (راجع ملف .env.example)`);
  return value;
};

export interface Config {
  port: number;
  mongoUri: string;
  dbName: string;
  adminPassword: string;
  sessionSecret: string;
  /** Public address of the server, used to build absolute file URLs. Empty means relative URLs. */
  publicUrl: string;
  /** Other sites allowed to call the API from the browser (e.g. the GitHub Pages copy). */
  corsOrigins: string[];
  /** Largest upload accepted, in megabytes. */
  maxUploadMb: number;
  /** Where new uploads go: "disk" (a folder in the project) or "gridfs" (inside MongoDB). */
  storageDriver: 'disk' | 'gridfs';
  /** The storage folder for the disk driver. */
  storageDir: string;
}

export function loadConfig(): Config {
  const sessionSecret = required('SESSION_SECRET');
  if (sessionSecret.length < 32) throw new Error('SESSION_SECRET يجب أن يكون 32 حرفاً على الأقل');
  return {
    port: Number(process.env.PORT ?? 3000),
    mongoUri: required('MONGODB_URI'),
    dbName: process.env.MONGODB_DB?.trim() || 'magiclook',
    adminPassword: required('ADMIN_PASSWORD'),
    sessionSecret,
    publicUrl: (process.env.PUBLIC_URL ?? '').trim().replace(/\/+$/, ''),
    corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean),
    maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 100),
    storageDriver: process.env.STORAGE_DRIVER?.trim() === 'gridfs' ? 'gridfs' : 'disk',
    storageDir: resolve(import.meta.dirname, '..', process.env.STORAGE_DIR?.trim() || 'storage'),
  };
}
