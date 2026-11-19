/**
 * Server settings, from server.config.json at the project root (kept out of Git), with
 * environment variables taking precedence: PORT, HOST, SECURE_COOKIES, TRUST_PROXY.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AuthSettings } from './http/auth';

export const CONFIG_FILE = 'server.config.json';

export interface ServerConfig extends AuthSettings {
  readonly port: number;
  readonly host: string;
}

type StoredConfig = Partial<{
  port: number; host: string; passwordHash: string; sessionSecret: string; secureCookies: boolean; trustProxy: boolean;
}>;

const flag = (value: string | undefined, fallback: boolean): boolean =>
  value === undefined ? fallback : ['1', 'true', 'yes'].includes(value.toLowerCase());

export function readStoredConfig(root: string): StoredConfig {
  const file = resolve(root, CONFIG_FILE);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as StoredConfig : {};
}

export function writeStoredConfig(root: string, config: StoredConfig): void {
  writeFileSync(resolve(root, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
}

/** Loads the settings, creating the session secret on first run so sessions survive restarts. */
export function loadConfig(root: string, env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const stored = readStoredConfig(root);
  const sessionSecret = stored.sessionSecret ?? randomBytes(32).toString('base64url');
  if (!stored.sessionSecret) writeStoredConfig(root, { ...stored, sessionSecret });
  return {
    port: Number(env.PORT ?? stored.port ?? 8080),
    host: env.HOST ?? stored.host ?? '0.0.0.0',
    passwordHash: stored.passwordHash ?? null,
    sessionSecret,
    secureCookies: flag(env.SECURE_COOKIES, stored.secureCookies ?? false),
    trustProxy: flag(env.TRUST_PROXY, stored.trustProxy ?? false),
  };
}
