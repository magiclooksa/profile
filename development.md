# رفع الموقع على سيرفر خاص وربطه بدومين في Cloudflare

هذا الدليل ينقل الموقع من GitHub Pages إلى سيرفر خاص (VPS) بدومين خاص يمر عبر Cloudflare، ثم يضبط الظهور في محركات البحث (SEO) ومساعدي الذكاء الاصطناعي (GEO).

في الأوامر التالية استبدل:

| الرمز | المقصود |
|---|---|
| `example.com` | الدومين الخاص بك |
| `203.0.113.10` | عنوان IP للسيرفر |
| `deploy` | اسم مستخدم النشر على السيرفر |

الموقع ملفات ثابتة (HTML وCSS وJS وصور) تُبنى في مجلد `dist`، فلا يحتاج السيرفر إلى Node.js ولا قاعدة بيانات؛ يكفيه Nginx.

---

## 1. قبل البناء: اضبط رابط الموقع الجديد

كل الروابط الأساسية (canonical) وخريطة الموقع و`robots.txt` و`llms.txt` وبيانات schema.org تُكتب من `public/data/seo.json` عند البناء. **إذا بنيت الموقع قبل تغيير الرابط ستشير كل الصفحات إلى GitHub Pages.**

في `public/data/seo.json`:

```json
"siteUrl": "https://example.com/",
```

الرابط كامل، بـ `https`، دون `www`، وينتهي بـ `/`.

وأكمل في الملف نفسه الحقول الفارغة لأنها تؤثر مباشرة في البحث المحلي (انظر القسم 8):

- `business.city` و`business.region` و`business.latitude` و`business.longitude`
- `business.openingHours` مثل `["Sa-Th 09:00-22:00"]`
- `business.foundingDate` و`business.priceRange`
- `social`: روابط الحسابات الرسمية كاملة ورابط خرائط Google
- وفي `public/data/contact.json`: الجوال والبريد والعنوان

ثم ابنِ وافحص:

```bash
npm ci
npm test
npm run build
```

تأكد أن الرابط الجديد ظهر:

```bash
grep -m1 "Sitemap" dist/robots.txt      # Sitemap: https://example.com/sitemap.xml
grep -c "example.com" dist/sitemap.xml
```

---

## 2. تجهيز السيرفر

أي VPS بنظام **Ubuntu 24.04** يكفي (1 vCPU و1GB ذاكرة). يُفضل أن يكون في منطقة قريبة من السعودية (البحرين، دبي، فرانكفورت)، مع أن Cloudflare يقدّم الملفات من أقرب نقطة للزائر.

### 2.1 مستخدم النشر ومفتاح SSH

من جهازك (PowerShell في Windows 11 فيه `ssh` جاهز):

```powershell
ssh-keygen -t ed25519 -C "magiclook-deploy"
```

على السيرفر بحساب root:

```bash
adduser --disabled-password --gecos "" deploy
mkdir -p /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys     # الصق محتوى ملف id_ed25519.pub
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

بعد التأكد أن الدخول بالمفتاح يعمل، أوقف الدخول بكلمة المرور في `/etc/ssh/sshd_config`:

```
PasswordAuthentication no
PermitRootLogin prohibit-password
```

```bash
systemctl restart ssh
```

### 2.2 التحديثات والجدار الناري وNginx

```bash
apt update && apt upgrade -y
apt install -y nginx ufw unattended-upgrades
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
dpkg-reconfigure -plow unattended-upgrades     # تحديثات أمنية تلقائية
```

### 2.3 مجلد الموقع

نشر كل نسخة في مجلد مستقل ثم تحويل الرابط `current` إليها، فلا يرى الزائر موقعاً نصف مرفوع، ويمكن الرجوع للنسخة السابقة بأمر واحد:

```bash
mkdir -p /var/www/magiclook/releases
chown -R deploy:deploy /var/www/magiclook
```

```
/var/www/magiclook/
├── releases/
│   ├── 20261116-1530/
│   └── 20261120-0910/
└── current -> releases/20261120-0910
```

---

## 3. شهادة SSL من Cloudflare

بما أن الزوار يمرون عبر Cloudflare، أسهل شهادة وأطولها عمراً هي **Origin Certificate** (صالحة حتى 15 سنة، ولا تحتاج تجديداً مثل Let's Encrypt).

1. في Cloudflare: **SSL/TLS → Origin Server → Create Certificate**.
2. اترك RSA، والأسماء `example.com` و`*.example.com`، والمدة 15 سنة، ثم **Create**.
3. انسخ الشهادة والمفتاح الخاص إلى السيرفر (المفتاح يظهر مرة واحدة فقط):

```bash
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/example.com.pem     # Origin Certificate
nano /etc/ssl/cloudflare/example.com.key     # Private Key
chmod 600 /etc/ssl/cloudflare/example.com.key
```

هذه الشهادة لا يثق بها المتصفح مباشرة، فهي تعمل فقط والسحابة البرتقالية مفعّلة في Cloudflare (القسم 5).

---

## 4. إعداد Nginx

أنشئ `/etc/nginx/sites-available/magiclook`:

```nginx
# HTTP → HTTPS (Cloudflare يحوّل أيضاً، هذا احتياط)
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://example.com$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate     /etc/ssl/cloudflare/example.com.pem;
    ssl_certificate_key /etc/ssl/cloudflare/example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # نسخة واحدة للموقع: www تتحول إلى الدومين الأساسي
    if ($host = www.example.com) {
        return 301 https://example.com$request_uri;
    }

    root  /var/www/magiclook/current;
    index index.html;
    charset utf-8;

    # رؤوس أمان
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # ضغط النصوص (Cloudflare يضيف Brotli للزائر)
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/javascript application/json
               application/xml image/svg+xml;

    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # صفحات HTML وملفات البيانات تتغير مع كل نشر: يتحقق المتصفح منها كل مرة
    location ~* \.(?:html|json|xml|txt)$ {
        # add_header داخل location يلغي رؤوس الأمان أعلاه، فنكررها هنا
        add_header Cache-Control "no-cache";
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        try_files $uri =404;
    }

    # ملفات JS وCSS التي يضيف Vite إلى اسمها بصمة: لا تتغير أبداً
    location ~* "-[A-Za-z0-9_-]{8}\.(?:js|css)$" {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # الصور والفيديو والخطوط: 30 يوماً
    location ~* \.(?:webp|avif|jpe?g|png|gif|svg|ico|mp4|webm|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }

    # منع الوصول للملفات المخفية
    location ~ /\. {
        deny all;
    }
}
```

فعّل الإعداد:

```bash
ln -s /etc/nginx/sites-available/magiclook /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### عنوان الزائر الحقيقي في السجلات (اختياري)

بدون هذا يسجل Nginx عناوين Cloudflare بدل عناوين الزوار. أنشئ `/etc/nginx/conf.d/cloudflare-realip.conf`:

```bash
{
  for ip in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do
    echo "set_real_ip_from $ip;"
  done
  echo "real_ip_header CF-Connecting-IP;"
} > /etc/nginx/conf.d/cloudflare-realip.conf
nginx -t && systemctl reload nginx
```

---

## 5. ربط الدومين في Cloudflare

### 5.1 إضافة الدومين

1. في Cloudflare: **Add a domain**، اكتب `example.com`، واختر الخطة المجانية.
2. يعطيك Cloudflare خادمَي أسماء (Nameservers) مثل `xxx.ns.cloudflare.com`.
3. في لوحة الجهة التي اشتريت منها الدومين، استبدل خوادم الأسماء الحالية بهما.
4. انتظر حتى تصبح حالة الدومين **Active** (عادة دقائق، وقد تصل إلى 24 ساعة).

إذا اشتريت الدومين من Cloudflare Registrar نفسه فهذه الخطوة جاهزة.

### 5.2 سجلات DNS

في **DNS → Records**:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `203.0.113.10` | Proxied (سحابة برتقالية) |
| A | `www` | `203.0.113.10` | Proxied (سحابة برتقالية) |
| AAAA | `@` | عنوان IPv6 للسيرفر إن وُجد | Proxied |

احذف أي سجلات A قديمة تشير إلى استضافة سابقة. **لا تلمس سجلات MX أو TXT الخاصة بالبريد.**

### 5.3 إعدادات SSL/TLS

| المكان | الإعداد |
|---|---|
| SSL/TLS → Overview | **Full (strict)** |
| SSL/TLS → Edge Certificates → Always Use HTTPS | On |
| SSL/TLS → Edge Certificates → Automatic HTTPS Rewrites | On |
| SSL/TLS → Edge Certificates → Minimum TLS Version | TLS 1.2 |
| SSL/TLS → Edge Certificates → HSTS | فعّله **بعد** التأكد أن الموقع يعمل بـ HTTPS بالكامل: max-age 6 أشهر، includeSubDomains |

لا تختر Flexible: يسبب حلقة تحويل لا تنتهي مع إعداد Nginx أعلاه.

### 5.4 السرعة

| المكان | الإعداد |
|---|---|
| Speed → Optimization → Protocol Optimization | HTTP/3 وEarly Hints: On |
| Speed → Optimization → Content Optimization → Rocket Loader | **Off** (يعطّل سكربتات الموقع من نوع module) |
| Caching → Configuration → Browser Cache TTL | **Respect Existing Headers** |
| Caching → Configuration → Crawler Hints | On (يبلغ محركات البحث بالتحديثات عبر IndexNow) |

### 5.5 إعدادات البوتات والذكاء الاصطناعي (مهمة لـ GEO)

Cloudflare يمنع بعض بوتات الذكاء الاصطناعي افتراضياً في الحسابات الجديدة، وهذا يلغي إعداد `"aiCrawlers": true` في `seo.json`:

| المكان | الإعداد |
|---|---|
| Security → Bots → Block AI bots | **Do not block** |
| AI Crawl Control → Crawlers | اسمح لـ GPTBot وOAI-SearchBot وClaudeBot وPerplexityBot وGoogle-Extended وApplebot |
| Security → Bots → Manage your robots.txt / Content Signals | **Off**، حتى لا يستبدل Cloudflare ملف `robots.txt` الذي يكتبه الموقع |
| Security → Bots → Bot Fight Mode | Off، أو راقب أنه لا يتحدى بوتات البحث |

بعدها صفحة **AI Crawl Control** تريك أي مساعدي ذكاء اصطناعي يزورون الموقع وكم مرة.

---

## 6. رفع الموقع

### الطريقة أ: يدوياً من Windows

PowerShell في Windows 11 فيه `tar` و`scp` و`ssh`:

```powershell
npm run build
$release = Get-Date -Format "yyyyMMdd-HHmm"
tar -czf site.tgz -C dist .
scp site.tgz deploy@203.0.113.10:/tmp/site.tgz
ssh deploy@203.0.113.10 "set -e; R=/var/www/magiclook/releases/$release; mkdir -p `$R; tar -xzf /tmp/site.tgz -C `$R; ln -sfn `$R /var/www/magiclook/current; rm /tmp/site.tgz; ls -1dt /var/www/magiclook/releases/* | tail -n +6 | xargs -r rm -rf"
Remove-Item site.tgz
```

الأمر الأخير يحتفظ بآخر 5 نسخ ويحذف الأقدم.

### الطريقة ب: تلقائياً مع كل رفع إلى GitHub (موصى بها)

1. على جهازك أنشئ مفتاحاً خاصاً بالنشر:
   ```powershell
   ssh-keygen -t ed25519 -f gh-deploy -N '""' -C "github-actions"
   ```
   أضف محتوى `gh-deploy.pub` إلى `/home/deploy/.ssh/authorized_keys` على السيرفر.
2. في GitHub: **Settings → Secrets and variables → Actions** أضف:
   - `DEPLOY_HOST`: `203.0.113.10`
   - `DEPLOY_USER`: `deploy`
   - `DEPLOY_KEY`: محتوى الملف الخاص `gh-deploy` كاملاً
   - `DEPLOY_KNOWN_HOSTS`: ناتج الأمر `ssh-keyscan 203.0.113.10`
3. احذف ملفي المفتاح من جهازك بعد حفظهما.
4. استبدل `.github/workflows/deploy.yml` بالتالي:

```yaml
name: Deploy to server

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - run: npm ci
      - run: npm test
      - run: npm run build

      - name: Check the site points at the custom domain
        run: grep -q "^Sitemap: https://" dist/robots.txt && ! grep -q "github.io" dist/robots.txt

      - name: Set up SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DEPLOY_KEY }}" > ~/.ssh/id_ed25519
          echo "${{ secrets.DEPLOY_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
          chmod 600 ~/.ssh/id_ed25519

      - name: Upload a new release and switch to it
        env:
          HOST: ${{ secrets.DEPLOY_HOST }}
          USER: ${{ secrets.DEPLOY_USER }}
        run: |
          RELEASE=/var/www/magiclook/releases/$(date +%Y%m%d-%H%M%S)
          ssh $USER@$HOST "mkdir -p $RELEASE"
          rsync -az --delete dist/ $USER@$HOST:$RELEASE/
          ssh $USER@$HOST "ln -sfn $RELEASE /var/www/magiclook/current && ls -1dt /var/www/magiclook/releases/* | tail -n +6 | xargs -r rm -rf"
```

على السيرفر ثبّت rsync مرة واحدة: `apt install -y rsync`.

### الرجوع إلى نسخة سابقة

```bash
ls -1t /var/www/magiclook/releases
ln -sfn /var/www/magiclook/releases/<اسم-النسخة> /var/www/magiclook/current
```

### بعد كل نشر

صفحات HTML وملفات JSON لا يخزنها Cloudflare، فتظهر التعديلات فوراً. إذا استبدلت صورة **بالاسم نفسه**، امسحها من الكاش: **Caching → Configuration → Purge Cache → Custom Purge** والصق رابطها.

---

## 7. الفحص بعد الربط

```bash
curl -sI https://example.com/ | head -5                 # 200 وserver: cloudflare
curl -sI http://example.com/ | grep -i location         # https://example.com/
curl -sI https://www.example.com/ | grep -i location    # https://example.com/
curl -s https://example.com/robots.txt | tail -1        # Sitemap: https://example.com/sitemap.xml
curl -s https://example.com/sitemap.xml | head -5
curl -s https://example.com/llms.txt | head -3
curl -sI https://example.com/villa-wood.html | grep -i cache-control   # no-cache
```

وفي المتصفح: افتح الصفحة الرئيسية وصفحة كتالوج وصفحة خدمة من `services/`، وجرّب البحث (`Ctrl+K`) وتشغيل الفيديو.

### إيقاف GitHub Pages

بعد أن يعمل الدومين الجديد:

1. **Settings → Pages** في المستودع: اختر **Unpublish site** أو أوقف المصدر.
2. GitHub Pages لا يدعم تحويل 301 إلى دومين آخر. إن أردت إبقاءه فترة انتقالية، يكفي أن آخر نسخة منشورة عليه بُنيت بالرابط الجديد في `seo.json`، فتشير كل صفحاتها (canonical) إلى الدومين الجديد وتنقل Google الترتيب إليه.

---

## 8. تحسين الظهور في محركات البحث (SEO)

الموقع يكتب العناوين والأوصاف وschema.org وخريطة الموقع تلقائياً. ما بقي هو ربطه بأدوات المحركات وإكمال البيانات.

### 8.1 Google Search Console

1. افتح [search.google.com/search-console](https://search.google.com/search-console) → **Add property → Domain** واكتب `example.com`.
2. اختر التحقق عبر Cloudflare، فيضيف سجل TXT تلقائياً (أو أضفه يدوياً في **DNS → Records**).
3. **Sitemaps** → أرسل `https://example.com/sitemap.xml`.
4. **URL Inspection** → افحص الصفحة الرئيسية واطلب الفهرسة (Request Indexing)، ثم صفحات الخدمات الأهم.
5. إن كان للموقع رابط قديم على GitHub Pages مفهرس، أضفه كخاصية أيضاً لمتابعة انتقال الصفحات.

التحقق بسجل DNS يغني عن حقل `verification.google` في `seo.json`؛ استخدم الحقل فقط إن اخترت التحقق بوسم HTML.

### 8.2 Bing Webmaster Tools

مهم أيضاً لـ GEO، لأن ChatGPT وCopilot يعتمدان على فهرس Bing.

1. افتح [bing.com/webmasters](https://www.bing.com/webmasters) → **Import from Google Search Console** (يستورد الموقع وخريطته في خطوة واحدة).
2. فعّل **IndexNow** (Cloudflare Crawler Hints يرسل له التحديثات تلقائياً بعد تفعيله في القسم 5.4).

### 8.3 ملف النشاط التجاري في Google (Google Business Profile)

أهم خطوة لظهور «تصميم داخلي قريب مني» و«محل كنب في الرياض» وخرائط Google:

1. أنشئ الملف من [business.google.com](https://business.google.com) باسم «النظرة الساحرة MAGIC LOOK» وفئة **Interior designer** وفئات إضافية مثل **Furniture store**.
2. اكتب رابط الموقع `https://example.com/`، والجوال وساعات العمل والعنوان **بنفس الصياغة** المكتوبة في `contact.json` و`seo.json`.
3. ارفع صوراً حقيقية من المشاريع، واطلب من العملاء تقييمات.
4. ضع رابط الملف على خرائط Google في `social` داخل `seo.json`، فيدخل في `sameAs` ضمن بيانات schema.org.

كرر الشيء نفسه في **Bing Places** و**Apple Business Connect**.

### 8.4 إكمال البيانات

- **الاسم والعنوان والجوال (NAP)** متطابقة حرفياً في الموقع وملف Google وإنستغرام وسناب وأي دليل.
- املأ كل قيم `null` في `seo.json` (المدينة، الإحداثيات، ساعات العمل، سنة التأسيس). كل قيمة فارغة تُحذف من بيانات schema.org فيخسر الموقع معلومة يقرؤها Google.
- `description` لكل صفحة خدمة في `service-pages.json` بين 120 و160 حرفاً، ويذكر الخدمة والمدينة.
- أضف صفحة خدمة لكل عبارة بحث مهمة (مثل «تفصيل مجالس في الرياض») بدل حشو الكلمات في صفحة واحدة.

### 8.5 السرعة (Core Web Vitals)

السرعة عامل ترتيب، والجوال هو الأساس.

- افحص بـ [pagespeed.web.dev](https://pagespeed.web.dev) الصفحة الرئيسية وصفحة كتالوج.
- مجلد `public/images` كبير (أكثر من 300MB). احرص أن كل صورة بصيغة WebP أو AVIF، وأن عرضها لا يتجاوز 2000px، وحجمها غالباً أقل من 300KB.
- الفيديوهات: MP4 بترميز H.264، بأقل دقة مقبولة (720p للخلفيات)، مع صورة `poster`.
- راقب **Core Web Vitals** في Search Console بعد 28 يوماً من النشر.

### 8.6 فحص البيانات المنظمة

- [search.google.com/test/rich-results](https://search.google.com/test/rich-results): الصفحة الرئيسية (LocalBusiness وFAQPage) وصفحة كتالوج (BreadcrumbList).
- [validator.schema.org](https://validator.schema.org): للتأكد من خلو البيانات من الأخطاء.
- معاينة المشاركة في واتساب وX: [opengraph.xyz](https://www.opengraph.xyz).

### 8.7 روابط من مواقع أخرى

- ضع رابط الموقع في البايو لكل حساب رسمي.
- سجّل في الأدلة التجارية السعودية وأدلة شركات التصميم والأثاث.
- اطلب من الموردين والشركاء ذكر المؤسسة برابط في مواقعهم.

---

## 9. تحسين الظهور في مساعدي الذكاء الاصطناعي (GEO)

GEO هو أن يذكر ChatGPT وClaude وPerplexity وGemini وGoogle AI Overviews المؤسسة ويستشهدوا بموقعها عند سؤال مثل «أفضل شركة تصميم مجالس في السعودية».

### ما يفعله الموقع جاهزاً

- `robots.txt` يسمح لبوتات الذكاء الاصطناعي (عند `"aiCrawlers": true`).
- `llms.txt` في جذر الدومين: ملخص المؤسسة وخدماتها وأسئلتها بنص واضح. على الدومين الخاص يصبح في `https://example.com/llms.txt` حيث تبحث عنه المساعدات.
- نص كل صفحة مكتوب بـ HTML عادي، فتقرؤه البوتات التي لا تشغّل JavaScript.
- بيانات schema.org تعرّف المؤسسة كنشاط واحد واضح (Entity) بخدماتها ورئيسها التنفيذي.

### ما عليك فعله

1. **لا تجعل Cloudflare يمنعها**: نفّذ القسم 5.5، ثم تأكد:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -A "GPTBot" https://example.com/
   curl -s -o /dev/null -w "%{http_code}\n" -A "ClaudeBot" https://example.com/llms.txt
   ```
   كلاهما يجب أن يعطي `200`، لا `403`.
2. **الأسئلة الشائعة** في `faq.json`: أضف أسئلة بالصيغة التي يسألها الناس فعلاً للمساعدات («كم تكلفة تفصيل مجلس؟»، «كم مدة تنفيذ غرفة نوم؟»، «هل تخدمون جدة؟») بإجابات قصيرة مباشرة تبدأ بالجواب ثم التفصيل.
3. **حقائق قابلة للاقتباس**: المساعدات تفضّل الأرقام والتفاصيل المحددة: عدد المشاريع المنفذة، سنوات الخبرة، المدن المخدومة، مدة التنفيذ المعتادة، الخامات المستخدمة. اكتبها في `company.json` وصفحات الخدمات.
4. **هوية موحدة**: الاسم «النظرة الساحرة MAGIC LOOK» بنفس الصياغة في كل مكان، وروابط كل الحسابات في `social` (تصبح `sameAs`)، حتى تربط المساعدات كل الإشارات بالمؤسسة نفسها.
5. **الحضور خارج الموقع**: المساعدات تثق بما تقوله المصادر الأخرى. ملف Google Business بتقييمات، Bing Places (يستخدمه ChatGPT)، مقالات أو لقاءات في مواقع سعودية، ومشاركات في المعارض.
6. **التحديث المستمر**: أضف المشاريع الجديدة كتالوجات أولاً بأول؛ تاريخ `lastmod` في خريطة الموقع يتحدث مع كل بناء.

### القياس

- **Cloudflare → AI Crawl Control**: أي البوتات تزور الموقع وأي الصفحات.
- **Search Console → Performance**: يشمل ظهور AI Overviews ضمن نتائج Google.
- اسأل كل مساعد شهرياً الأسئلة نفسها (مثل «شركات تصميم داخلي وتفصيل مجالس في السعودية») وسجّل هل ذُكرت المؤسسة وأي رابط استُشهد به.

---

## قائمة مختصرة

- [ ] `siteUrl` في `seo.json` = `https://example.com/`، وإكمال حقول `business` و`social`
- [ ] `npm test` و`npm run build` ينجحان، و`dist/robots.txt` يشير للدومين الجديد
- [ ] السيرفر: مستخدم `deploy`، جدار ناري، Nginx، Origin Certificate
- [ ] Cloudflare: Nameservers، سجلات A مفعّل فيها Proxy، SSL على Full (strict)
- [ ] Cloudflare: Rocket Loader Off، Crawler Hints On، بوتات الذكاء الاصطناعي غير ممنوعة، robots.txt المُدار Off
- [ ] النشر: يدوي أو GitHub Actions، والفحص بأوامر القسم 7
- [ ] HSTS بعد التأكد من HTTPS
- [ ] Google Search Console + خريطة الموقع، وBing Webmaster + IndexNow
- [ ] Google Business Profile وBing Places وApple Business Connect
- [ ] إيقاف GitHub Pages أو إبقاؤه مع canonical للدومين الجديد
