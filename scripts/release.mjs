#!/usr/bin/env node
/**
 * Builds a release of the site and server, and optionally installs it on this computer.
 *
 *   npm run release                         test, build, and package the current version
 *   npm run release -- patch|minor|major    raise the version first (1.0.0 → 1.0.1 / 1.1.0 / 2.0.0)
 *   npm run release -- --install            also install it (Windows: %LOCALAPPDATA%\MagicLook, else ~/magic-look)
 *   npm run release -- --install D:\Sites\MagicLook   install into that folder
 *   npm run release -- --tag                also create the git tag v<version>
 *   npm run release -- --skip-tests         skip the tests (not recommended)
 *
 * The result is release/magic-look-v<version>/ plus a .zip (or .tar.gz) of it, which can be copied
 * to any computer and installed there with install.cmd (Windows) or install.sh (macOS / Linux).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = platform() === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';

const argv = process.argv.slice(2);
const bump = argv.find((a) => ['patch', 'minor', 'major'].includes(a));
const tag = argv.includes('--tag');
const skipTests = argv.includes('--skip-tests');
const installAt = argv.indexOf('--install');
const install = installAt >= 0;
const installArg = install && argv[installAt + 1] && !argv[installAt + 1].startsWith('--') ? argv[installAt + 1] : null;
const installDir = resolve(installArg ?? (isWindows
  ? join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'MagicLook')
  : join(homedir(), 'magic-look')));

const step = (text) => console.log(`\n\x1b[33m▶ ${text}\x1b[0m`);
const fail = (text) => { console.error(`\n\x1b[31m✗ ${text}\x1b[0m`); process.exit(1) };
const run = (cmd, args, cwd = ROOT) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWindows });
  if (r.status !== 0) fail(`فشل الأمر: ${cmd} ${args.join(' ')}`);
};

// 1. Checks
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 9)) fail(`يلزم Node.js 22.9 أو أحدث (الموجود ${process.versions.node}). حمّله من https://nodejs.org`);

const pkgPath = join(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

if (bump) {
  const [a, b, c] = pkg.version.split('.').map(Number);
  pkg.version = bump === 'major' ? `${a + 1}.0.0` : bump === 'minor' ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  const lockPath = join(ROOT, 'package-lock.json');
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    lock.version = pkg.version;
    if (lock.packages?.['']) lock.packages[''].version = pkg.version;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  }
  console.log(`الإصدار الجديد: ${pkg.version}`);
}
const name = `magic-look-v${pkg.version}`;

// 2. Test and build
if (!existsSync(join(ROOT, 'node_modules'))) { step('تثبيت الحزم'); run(npm, ['ci']) }
if (!skipTests) { step('الاختبارات'); run(npm, ['test']) }
step('البناء');
run(npm, ['run', 'build']);

// 3. Assemble the release folder: only what is needed to run (the site is already built).
step(`تجهيز الحزمة ${name}`);
const out = join(ROOT, 'release', name);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const notTest = (src) => !/\.test\.ts$/.test(src);
const copy = (from, to = from, filter = notTest) => cpSync(join(ROOT, from), join(out, to), { recursive: true, filter });
copy('dist');
copy('server');
copy('src/domain');
copy('src/infrastructure');
copy('tsconfig.json');
copy('package-lock.json');
copy('.env.example');
copy('README.md');
copy('scripts/installer/install.mjs', 'install.mjs');
copy('scripts/installer/install.cmd', 'install.cmd');
copy('scripts/installer/install.sh', 'install.sh');
// package.json without the build tools (typescript, vite, vitest are not needed to run).
const runtimePkg = { ...pkg, scripts: { start: pkg.scripts.start, seed: pkg.scripts.seed } };
delete runtimePkg.devDependencies;
writeFileSync(join(out, 'package.json'), `${JSON.stringify(runtimePkg, null, 2)}\n`);
writeFileSync(join(out, 'VERSION'), `${pkg.version}\n`);

// 4. Archive it, to copy to another computer.
step('ضغط الحزمة');
let archive = null;
const tryRun = (cmd, args) => spawnSync(cmd, args, { cwd: join(ROOT, 'release'), stdio: 'ignore' }).status === 0;
if (isWindows && tryRun('tar', ['-a', '-c', '-f', `${name}.zip`, name])) archive = `${name}.zip`;
else if (!isWindows && tryRun('zip', ['-rqy', `${name}.zip`, name])) archive = `${name}.zip`;
else if (tryRun('tar', ['-czf', `${name}.tar.gz`, name])) archive = `${name}.tar.gz`;
console.log(archive ? `release/${archive}` : 'تعذّر الضغط؛ استخدم المجلد مباشرة.');

// 5. Git tag
if (tag) {
  step(`وسم git: v${pkg.version}`);
  try {
    execFileSync('git', ['tag', '-a', `v${pkg.version}`, '-m', `Release ${pkg.version}`], { cwd: ROOT, stdio: 'inherit' });
    console.log(`ارفع الوسم بالأمر: git push origin v${pkg.version}`);
  } catch {
    console.warn('تعذّر إنشاء الوسم (ربما موجود مسبقاً).');
  }
}

// 6. Install on this computer
if (install) {
  step(`التثبيت في ${installDir}`);
  mkdirSync(installDir, { recursive: true });
  // Replace the program files, keep .env (settings) and anything else the user added.
  for (const entry of ['dist', 'server', 'src']) rmSync(join(installDir, entry), { recursive: true, force: true });
  cpSync(out, installDir, { recursive: true });
  const r = spawnSync(process.execPath, ['install.mjs', ...argv.filter((a) => a === '--yes')], { cwd: installDir, stdio: 'inherit' });
  if (r.status !== 0) fail('لم يكتمل التثبيت');
}

console.log(`\n\x1b[32m✓ تم إصدار ${pkg.version}\x1b[0m  →  release/${name}${install ? `\n  مثبّت في: ${installDir}` : ''}`);
