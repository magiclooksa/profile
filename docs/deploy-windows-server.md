# نشر الموقع على Windows Server

يعمل الموقع ولوحة التحكم في برنامج Node.js واحد. يستقبل IIS الزوار على النطاق وشهادة HTTPS، ثم يمرر الطلبات إلى Node.js على المنفذ 8080 داخل السيرفر.

```
الزائر ── https://النطاق ──▶ IIS (443، الشهادة) ──▶ Node.js (127.0.0.1:8080)
                                                     ├─ الموقع
                                                     ├─ /dashboard.html  لوحة التحكم
                                                     └─ /__content/...   واجهة اللوحة (بكلمة مرور)
```

## ١. التجهيز (مرة واحدة)

1. ثبّت **Node.js 22 LTS** أو أحدث من nodejs.org (نسخة Windows x64 بصيغة .msi).
2. ثبّت **Git for Windows**.
3. في IIS ثبّت الوحدتين **URL Rewrite** و**Application Request Routing (ARR)**، ثم فعّل الـ proxy:
   IIS Manager ← اسم السيرفر ← Application Request Routing Cache ← Server Proxy Settings ← **Enable proxy** ← Apply.

## ٢. تنزيل المشروع وبناؤه

افتح PowerShell كمسؤول:

```powershell
cd C:\sites
git clone <رابط المستودع> magic-look
cd magic-look
npm ci
npm run build:server
npm run set-password      # اختر كلمة مرور لوحة التحكم (10 أحرف على الأقل)
```

تُحفظ كلمة المرور مشفّرة (scrypt) في `server.config.json`، ولا تُرفع إلى Git.

## ٣. الإعدادات

افتح `server.config.json` وأضف الإعدادات التالية، مع إبقاء `passwordHash` و`sessionSecret` كما هما:

```json
{
  "host": "127.0.0.1",
  "port": 8080,
  "secureCookies": true,
  "trustProxy": true
}
```

| الحقل | المعنى |
|---|---|
| `host` | `127.0.0.1` حتى لا يصل أحد إلى Node.js إلا عبر IIS |
| `port` | المنفذ الداخلي، ويجب أن يطابق `web.config` |
| `secureCookies` | `true` عندما يعمل الموقع بـ HTTPS، فلا تُرسل جلسة الدخول على اتصال غير مشفّر |
| `trustProxy` | `true` خلف IIS، ليُعرف عنوان الزائر الحقيقي عند تقييد محاولات الدخول |

وتأكد أن `siteUrl` في `public/data/seo.json` هو نطاق الموقع (القيمة الحالية `https://mgiclook.com/`). يُكتب منه الرابط الأساسي لكل صفحة، و`sitemap.xml`، ومعاينات الروابط.

## ٤. التشغيل كخدمة Windows

ليعمل الموقع تلقائياً مع تشغيل السيرفر ويعود للعمل إذا توقف. الطريقة الأبسط بأداة **NSSM** (nssm.cc):

```powershell
nssm install MagicLook "C:\Program Files\nodejs\node.exe" "C:\sites\magic-look\server-dist\main.mjs"
nssm set MagicLook AppDirectory "C:\sites\magic-look"
nssm set MagicLook AppStdout "C:\sites\magic-look\storage\server.log"
nssm set MagicLook AppStderr "C:\sites\magic-look\storage\server.log"
nssm start MagicLook
```

عند أول تشغيل يبني الخادم الموقع في `storage/releases` خلال دقيقة تقريباً، ويعرض للزوار صفحة «يُجهَّز الموقع» حتى ينتهي.

## ٥. ربط IIS بالنطاق

1. أنشئ موقعاً في IIS يشير إلى مجلد فارغ، مثل `C:\sites\magic-look-iis`.
2. انسخ إليه الملف `deploy\windows\web.config`.
3. أضف للموقع ربطين (Bindings): HTTP على المنفذ 80، وHTTPS على 443 بشهادة النطاق. شهادة مجانية من Let's Encrypt ممكنة بأداة win-acme.
4. افتح `https://النطاق/` للموقع، و`https://النطاق/dashboard.html` للوحة التحكم.

لا تفتح المنفذ 8080 في جدار الحماية، فـ IIS وحده يصل إليه.

## كيف يعمل الحفظ

- عند الحفظ في اللوحة يُفحص الملف أولاً، ثم يُكتب في `public/data`، وتُحفظ النسخة السابقة في `storage/history`. يُحتفظ بآخر 30 نسخة لكل ملف.
- بعد الحفظ يُعاد بناء صفحات الموقع في مجلد جديد داخل `storage/releases`، ولا ينتقل الخادم إليه إلا إذا نجح البناء. لذلك لا يرى الزائر موقعاً نصف مبني، وإن فشل البناء يبقى الموقع السابق يعمل. حالة النشر تظهر في القائمة الجانبية للوحة.
- الصور والفيديوهات والبيانات تُقرأ مباشرة من `public/`، فلا تُنسخ مع كل بناء.
- الملفات المرفوعة من اللوحة تُحفظ في `public/images/uploads/<السنة-الشهر>/`.

## التحديث بعد تعديل الكود

### الطريقة المقترحة: حزمة إصدار

على جهاز التطوير (يحتاج Python 3.9 أو أحدث):

```bash
python release.py --bump patch --tag
```

يتأكد السكربت أن كل التعديلات محفوظة في Git، ويرفع رقم الإصدار، ويشغّل الاختبارات وبناء الموقع والخادم. بعدها يكتب في مجلد `release/` ملفين: `magic-look-<الإصدار>-<الوقت>-code.zip`، وملف `.sha256` بجانبه للتحقق من سلامة النسخ.

| الخيار | المعنى |
|---|---|
| (دون خيارات) | حزمة للكود فقط، دون `public/`، فلا تمسّ المحتوى المعدّل من اللوحة على السيرفر |
| `--full` | تضيف `public/` (الصور والفيديوهات والبيانات)؛ للتثبيت الأول فقط |
| `--bump patch` أو `minor` أو `major` | ترفع رقم الإصدار في `package.json` |
| `--tag` | تحفظ رفع الإصدار في Git وتضع عليه وسم `vX.Y.Z` (يحتاج `--bump`) |
| `--allow-dirty` | تسمح بتعديلات غير محفوظة في Git، ويُسجَّل ذلك في الحزمة |
| `--skip-install` و`--skip-tests` | تتخطى `npm ci` أو الاختبارات |

انسخ الملفين إلى السيرفر، ثم شغّل في PowerShell كمسؤول:

```powershell
cd C:\sites\magic-look
.\deploy\windows\install-release.ps1 -Zip C:\Downloads\magic-look-1.0.1-20261119-1530-code.zip
```

يتحقق السكربت من سلامة الملف بالـ SHA-256، ويأخذ نسخة احتياطية من المحتوى في `storage\backups`، ويوقف الخدمة. بعدها يفك الحزمة فوق مجلد الموقع، ويشغّل `npm ci`، ثم يعيد تشغيل الخدمة. عند التشغيل يبني الخادم الصفحات من الكود الجديد، ويبقى الموقع السابق يعمل حتى ينتهي البناء.

في أول تثبيت لا يوجد السكربت على السيرفر بعد: فك حزمة `--full` يدوياً في `C:\sites\magic-look`، ثم أكمل من الخطوة ٢.

### طريقة بديلة: Git على السيرفر

```powershell
cd C:\sites\magic-look
git pull
npm ci
npm run build:server
nssm restart MagicLook
```

**تنبيه:** بعد تشغيل اللوحة يصبح المحتوى الأحدث هو الموجود على السيرفر (`public/data` والصور المرفوعة)، لا الموجود في Git. في الطريقة البديلة، قبل `git pull` انسخ `public/data` احتياطياً، ولا تعدّل ملفات `public/data` في المستودع إلا بعد نقل نسخة السيرفر إليه، حتى لا يُكتب محتوى قديم فوق الجديد.

## النسخ الاحتياطي

خذ نسخة دورية من هذه المجلدات والملفات:

- `public/data`: المحتوى
- `public/images/uploads`: الصور المرفوعة
- `storage/history`: النسخ السابقة من الملفات
- `server.config.json`: كلمة المرور ومفتاح الجلسات

## حل المشكلات

| المشكلة | الحل |
|---|---|
| «لم تُضبط كلمة مرور بعد» | شغّل `npm run set-password` ثم `nssm restart MagicLook` |
| خطأ 502 من IIS | خدمة Node.js متوقفة: `nssm status MagicLook`، وراجع `storage\server.log` |
| «محاولات كثيرة» | انتظر ربع ساعة، أو أعد تشغيل الخدمة |
| «تعذّر تحديث الموقع» في اللوحة | مرّر المؤشر على الرسالة لرؤية الخطأ، وراجع `storage\server.log`؛ الموقع السابق يبقى يعمل |
| رفع فيديو كبير يفشل | تأكد من `maxAllowedContentLength` في `web.config` (300 ميغابايت) |
