#!/usr/bin/env node
/**
 * Installs a Magic Look release on this computer. Run it from the release folder:
 *   Windows: double-click install.cmd      macOS / Linux: ./install.sh
 *
 *   --yes           no questions: local MongoDB (or MONGODB_URI if set), generated password, content moved with media
 *   --reconfigure   ask for the settings again even if .env exists
 *   --no-start      do not offer to start the site at the end
 *
 * Steps: check Node.js → install packages → settings (.env) → MongoDB check (and install it locally if wanted)
 *        → move the content into the database → create the start shortcut → start.
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const OS = platform();
const isWindows = OS === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const args = new Set(process.argv.slice(2));
const auto = args.has('--yes') || !process.stdin.isTTY;
const LOCAL_URI = 'mongodb://127.0.0.1:27017';

const say = (text = '') => console.log(text);
const step = (text) => say(`\n\x1b[33m▶ ${text}\x1b[0m`);
const ok = (text) => say(`\x1b[32m✓ ${text}\x1b[0m`);
const warn = (text) => say(`\x1b[31m! ${text}\x1b[0m`);
const run = (cmd, list, opts = {}) => spawnSync(cmd, list, { cwd: DIR, stdio: 'inherit', shell: isWindows, ...opts }).status === 0;
const has = (cmd) => spawnSync(isWindows ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const rl = auto ? null : createInterface({ input: process.stdin, output: process.stdout });
async function ask(question, fallback = '') {
  if (!rl) return fallback;
  const answer = (await rl.question(`${question}${fallback ? ` [${fallback}]` : ''}: `)).trim();
  return answer || fallback;
}
const yes = async (question, fallback = true) =>
  /^(y|yes|ن|نعم)$/i.test(await ask(`${question} (نعم/لا)`, fallback ? 'نعم' : 'لا'));

const version = existsSync(join(DIR, 'VERSION')) ? readFileSync(join(DIR, 'VERSION'), 'utf8').trim() : '';
say(`\n\x1b[1mتثبيت النظرة الساحرة · MAGIC LOOK ${version}\x1b[0m\nالمجلد: ${DIR}`);

// 1. Node.js
step('التحقق من Node.js');
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 9)) {
  warn(`يلزم Node.js 22.9 أو أحدث، والموجود ${process.versions.node}. حمّل الإصدار LTS من https://nodejs.org ثم أعد التثبيت.`);
  process.exit(1);
}
ok(`Node.js ${process.versions.node}`);

// 2. Packages
step('تثبيت الحزم (قد يستغرق دقيقة)');
if (!run(npm, ['ci', '--omit=dev', '--no-audit', '--no-fund'])) { warn('فشل تثبيت الحزم. تحقق من الاتصال بالإنترنت.'); process.exit(1) }
ok('الحزم مثبتة');

// 3. Settings
const envPath = join(DIR, '.env');
const readEnv = () => Object.fromEntries(readFileSync(envPath, 'utf8').split(/\r?\n/)
  .map((l) => /^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2]]));

async function ping(uri, timeout = 5000) {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: timeout });
  try { await client.connect(); await client.db('admin').command({ ping: 1 }); return true } catch { return false } finally { await client.close().catch(() => {}) }
}

/** Installs and starts MongoDB on this computer with the system's usual tool. */
async function installLocalMongo() {
  let started = false;
  if (isWindows && has('winget')) {
    say('سيُثبَّت MongoDB Community Server بواسطة winget ويعمل كخدمة تلقائياً مع تشغيل الجهاز. قد يطلب Windows صلاحية المسؤول.');
    started = run('winget', ['install', '--id', 'MongoDB.Server', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements']);
  } else if (OS === 'darwin' && has('brew')) {
    started = run('brew', ['tap', 'mongodb/brew']) && run('brew', ['install', 'mongodb-community'])
      && run('brew', ['services', 'start', 'mongodb-community']);
  } else if (has('docker')) {
    say('سيعمل MongoDB داخل Docker باسم magiclook-mongo، وبياناته في volume باسم magiclook-mongo.');
    started = run('docker', ['run', '-d', '--name', 'magiclook-mongo', '--restart', 'unless-stopped',
      '-p', '127.0.0.1:27017:27017', '-v', 'magiclook-mongo:/data/db', 'mongo:7'])
      || run('docker', ['start', 'magiclook-mongo']);
  }
  if (!started) return false;
  for (let i = 0; i < 20; i++) { if (await ping(LOCAL_URI, 2000)) return true; await sleep(1500) }
  return false;
}

function mongoHelp() {
  say('ثبّت MongoDB يدوياً ثم أعد تشغيل التثبيت، أو استخدم قاعدة مجانية على الإنترنت:');
  say('  • على هذا الجهاز: https://www.mongodb.com/try/download/community');
  say('  • على الإنترنت (MongoDB Atlas): https://www.mongodb.com/cloud/atlas/register');
}

let env;
if (existsSync(envPath) && !args.has('--reconfigure')) {
  step('الإعدادات');
  env = readEnv();
  ok('ملف .env موجود، يُستخدم كما هو (أعد التثبيت مع --reconfigure لتغييره)');
} else {
  step('الإعدادات');
  let uri = process.env.MONGODB_URI?.trim() || '';
  if (!uri) {
    say('أين تُحفظ قاعدة البيانات؟\n  1) على هذا الجهاز (MongoDB محلي)\n  2) MongoDB Atlas أو خادم آخر (رابط اتصال)');
    const choice = await ask('اختر', '1');
    uri = choice === '2' ? await ask('رابط الاتصال (mongodb+srv://...)') : LOCAL_URI;
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) { warn('رابط الاتصال يجب أن يبدأ بـ mongodb:// أو mongodb+srv://'); process.exit(1) }

  let password = process.env.ADMIN_PASSWORD?.trim() || await ask('كلمة مرور لوحة التحكم (اتركها فارغة لتوليد كلمة قوية)');
  const generated = !password;
  if (generated) password = randomBytes(9).toString('base64url');
  if (/["\r\n]/.test(password) || password.length < 8) { warn('كلمة المرور يجب ألا تقل عن 8 أحرف ولا تحتوي علامة "'); process.exit(1) }
  const port = process.env.PORT?.trim() || await ask('المنفذ (Port)', '3000');

  env = {
    MONGODB_URI: uri, MONGODB_DB: 'magiclook', ADMIN_PASSWORD: password,
    SESSION_SECRET: randomBytes(32).toString('hex'), PORT: port,
    PUBLIC_URL: '', CORS_ORIGINS: 'https://magiclooksa.github.io', MAX_UPLOAD_MB: '100',
    STORAGE_DRIVER: 'disk', STORAGE_DIR: 'storage',
  };
  writeFileSync(envPath, `${Object.entries(env).map(([k, v]) => `${k}="${v}"`).join('\n')}\n`, { mode: 0o600 });
  ok('حُفظت الإعدادات في .env');
  if (generated) say(`\n  \x1b[1mكلمة مرور لوحة التحكم: ${password}\x1b[0m\n  احفظها في مكان آمن (وهي موجودة أيضاً في ملف .env).`);
}

// 4. Database
step('الاتصال بقاعدة البيانات');
let dbReady = await ping(env.MONGODB_URI);
if (!dbReady && env.MONGODB_URI.startsWith(LOCAL_URI)) {
  warn('لا يوجد MongoDB يعمل على هذا الجهاز.');
  if (auto || await yes('هل أثبّته وأشغّله الآن؟')) dbReady = await installLocalMongo();
  if (!dbReady) mongoHelp();
} else if (!dbReady) {
  warn('تعذّر الاتصال. تحقق من رابط الاتصال، ومن السماح لعنوان جهازك في Atlas (Network Access).');
}
if (dbReady) ok('قاعدة البيانات متصلة');

// 5. Content
if (dbReady) {
  step('نقل المحتوى إلى قاعدة البيانات');
  say('ينسخ نصوص الموقع إلى قاعدة البيانات (الأقسام الموجودة مسبقاً لا تُستبدل).');
  const media = auto || await yes('ورفع الصور والفيديوهات أيضاً لتُدار من مكتبة الملفات؟ (حوالي 140 م.ب)');
  if (run(npm, ['run', 'seed', '--', ...(media ? ['--media'] : [])])) ok('تم نقل المحتوى');
  else warn('لم يكتمل نقل المحتوى؛ يمكن إعادته لاحقاً بالأمر: npm run seed -- --media');
}

// 6. Start shortcut
step('إنشاء اختصار التشغيل');
const url = `http://localhost:${env.PORT || 3000}/`;
if (isWindows) {
  writeFileSync(join(DIR, 'start.cmd'), [
    '@echo off', 'chcp 65001 >nul', 'cd /d "%~dp0"', 'title MAGIC LOOK',
    `start "" /min cmd /c "timeout /t 4 /nobreak >nul & start ${url}"`,
    'call npm start', 'pause', '',
  ].join('\r\n'));
  // Desktop shortcut to start.cmd
  const desktop = join(homedir(), 'Desktop', 'MAGIC LOOK.lnk');
  const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${desktop.replace(/'/g, "''")}');`
    + `$s.TargetPath='${join(DIR, 'start.cmd').replace(/'/g, "''")}';$s.WorkingDirectory='${DIR.replace(/'/g, "''")}';`
    + `$s.IconLocation='${join(process.execPath).replace(/'/g, "''")},0';$s.Save()`;
  if (spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'ignore' }).status === 0) ok('اختصار «MAGIC LOOK» على سطح المكتب');
  ok(`للتشغيل لاحقاً: start.cmd في ${DIR}`);
} else {
  const opener = OS === 'darwin' ? 'open' : 'xdg-open';
  writeFileSync(join(DIR, 'start.sh'), [
    '#!/usr/bin/env bash', 'cd "$(dirname "$0")"',
    `( sleep 4; ${opener} ${url} >/dev/null 2>&1 ) &`, 'exec npm start', '',
  ].join('\n'));
  chmodSync(join(DIR, 'start.sh'), 0o755);
  ok(`للتشغيل لاحقاً: ${join(DIR, 'start.sh')}`);
}

say(`\n\x1b[32m\x1b[1m✓ اكتمل التثبيت\x1b[0m
  الموقع:        ${url}
  لوحة التحكم:   ${url}admin.html
  الإعدادات:     ${envPath}
  الملفات:       ${join(DIR, 'storage')}`);
if (!dbReady) say('  \x1b[31mملاحظة:\x1b[0m الخادم لن يعمل حتى تتصل قاعدة البيانات. بعد تجهيزها أعد تشغيل التثبيت.');

// 7. Start now
const startNow = dbReady && !args.has('--no-start') && !auto && await yes('\nتشغيل الموقع الآن؟');
rl?.close();
if (startNow) {
  say('يعمل الآن. أغلق هذه النافذة أو اضغط Ctrl+C للإيقاف.\n');
  const server = spawn(npm, ['start'], { cwd: DIR, stdio: 'inherit', shell: isWindows });
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    const up = await fetch(`${url}api/health`).then((r) => r.ok).catch(() => false);
    if (up) {
      const open = isWindows ? ['cmd', ['/c', 'start', '', url]] : [OS === 'darwin' ? 'open' : 'xdg-open', [url]];
      spawn(open[0], open[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
      break;
    }
  }
  server.on('exit', (code) => process.exit(code ?? 0));
}
