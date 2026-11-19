/**
 * Sets the dashboard password: npm run set-password
 * Only its scrypt hash is stored, in server.config.json. Restart the server afterwards.
 */
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { CONFIG_FILE, readStoredConfig, writeStoredConfig } from '../config';
import { hashPassword } from '../http/auth';

const MIN_LENGTH = 10;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Reads line by line, so it works both typed and piped (echo pw && echo pw | npm run set-password).
const rl = createInterface({ input: process.stdin, terminal: false });
const lines = rl[Symbol.asyncIterator]();
const ask = async (prompt: string): Promise<string> => {
  process.stdout.write(prompt);
  const { value } = await lines.next();
  return typeof value === 'string' ? value : '';
};
const password = await ask(`كلمة مرور لوحة التحكم (${MIN_LENGTH} أحرف على الأقل): `);
const again = await ask('أعد كتابتها: ');
rl.close();

if (password.length < MIN_LENGTH) {
  console.error(`كلمة المرور قصيرة: ${MIN_LENGTH} أحرف على الأقل.`);
  process.exit(1);
}
if (password !== again) {
  console.error('الكلمتان مختلفتان.');
  process.exit(1);
}
writeStoredConfig(root, { ...readStoredConfig(root), passwordHash: hashPassword(password) });
console.log(`حُفظت في ${CONFIG_FILE}. أعد تشغيل الخادم لتعمل.`);
