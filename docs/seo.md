# السيو في موقع النظرة الساحرة

ما يطبّقه الموقع من بريف السيو، وأين يُعدَّل كل شيء. كل البيانات في `public/data` وتُعدَّل من لوحة التحكم أو من الملف مباشرة، ثم يُعاد بناء الموقع.

## النطاق والتحويلات (IIS)

الملف `deploy/iis-static/web.config` يُنسخ تلقائيًا إلى جذر الموقع المبني (`dist/web.config`).

- كل العناوين الأخرى تُحوَّل 301 إلى `https://mgiclook.com/` مع الحفاظ على المسار: `www.mgiclook.com` و`magiclook.com` و`http://`.
- `/index.html` يُحوَّل إلى `/`، والروابط الداخلية للرئيسية تشير إلى `/` مباشرة.
- أي رابط غير موجود يعرض `404.html` بكود 404 فعلي.
- **مطلوب على السيرفر:** وحدة **URL Rewrite** في IIS ([تحميل](https://www.iis.net/downloads/microsoft/url-rewrite)). بدونها يرجع IIS خطأ 500 لكل الصفحات، فثبّتها قبل رفع الملف. السكربت `deploy/iis-static/install-prerequisites.ps1` يثبّتها مع ميزات IIS اللازمة ويفحص الشهادة: انسخه للسيرفر وشغّله كمسؤول بالأمر `powershell -ExecutionPolicy Bypass -File .\install-prerequisites.ps1` (أضف `-WithNode` لنسخة Node.js مع لوحة التحكم).
- الشهادة يجب أن تغطي `mgiclook.com` و`www.mgiclook.com` (و`magiclook.com` إن كان يشير للسيرفر نفسه).

## العناوين والأوصاف

| الصفحة | أين يُعدَّل العنوان والوصف |
|---|---|
| الرئيسية | `seo.json`: `title` و`description` |
| من نحن، الخدمات، المشاريع، تواصل | `site.json`: `pages.<الصفحة>.title` و`description` |
| المقاولات | `site.json`: `contracting.title` و`description` |
| صفحات الخدمات | `service-pages.json`: `title` و`description` لكل خدمة، وH1 في `heading` |
| صفحات المشاريع | تُكتب تلقائيًا: «اسم المشروع \| مشاريع النظرة الساحرة في الدمام»، والوصف من `tagline` و`kicker` في `catalogues.json` |

كل صفحة لها canonical ذاتي، ووسوم Open Graph وTwitter، و`lang="ar" dir="rtl"`، وH1 واحد.

## البيانات المنظمة (JSON-LD)

تُولَّد تلقائيًا عند البناء:

- الرئيسية: `HomeAndConstructionBusiness` (مع `FurnitureStore`) و`WebSite` و`FAQPage`.
- كل الصفحات الداخلية: `BreadcrumbList`.
- صفحات الخدمات: `Service` مع `provider` و`areaServed`، و`FAQPage`.
- صفحات المشاريع: `CreativeWork` بصور المشروع وقطعه وخاماته.

بيانات النشاط في `seo.json` → `business`. **ينقصها من العميل:** `openingHours` (مثل `"Sa-Th 09:00-21:00"`)، و`social` (روابط انستغرام وسناب وGoogle Business Profile كاملة)، و`areaServed` (المدن الأخرى إن وُجدت).

اختبر بعد كل نشر: [Rich Results Test](https://search.google.com/test/rich-results) و[Schema Markup Validator](https://validator.schema.org/).

## الفهرسة

- `sitemap.xml` يُكتب عند كل بناء بكل الصفحات القابلة للفهرسة (الرئيسية، الصفحات الرئيسية، الخدمات، المشاريع).
- `robots.txt` يسمح بالزحف ويشير إلى الـ sitemap.
- `projects-catalogue.html` عليها `noindex, follow` وخارج الـ sitemap، لأنها تكرر صفحات المشاريع.
- رموز التحقق (إن لم يُستخدم DNS): `seo.json` → `verification.google` و`verification.bing`.

## التتبع

المعرّفات في `seo.json`:

- `gtmId` (مثل `GTM-ABC1234`): عند تعبئته يُركَّب Google Tag Manager في كل الصفحات ويُحذف كود GA4 المباشر، فيُضاف GA4 من داخل GTM.
- `ga4Id` (حاليًا `G-KMMYNYBGPG`): يُستخدم مباشرة فقط ما دام `gtmId` فارغًا.

الأحداث التي يرسلها الموقع (إلى GA4 مباشرة، أو إلى dataLayer عند وجود GTM):

| الحدث | متى |
|---|---|
| `click_call` | ضغط رابط اتصال (`tel:`) |
| `click_whatsapp` | ضغط رابط واتساب (`wa.me`) |
| `generate_lead` | إرسال فورم عرض السعر |
| `click_directions` | ضغط رابط الخريطة |

مع كل حدث: `page_location` و`page_title` و`link_url`. سجّل الثلاثة الأولى كـ **Key events** في GA4 (Admin ← Events). مع GTM: أنشئ Trigger من نوع Custom Event لكل اسم، وTag من نوع GA4 Event بنفس الاسم.

رسائل واتساب الجاهزة تذكر الصفحة، مثل «السلام عليكم، أبغى استفسار عن خدمة المطابخ والخزائن».

## الصور والسرعة

- الصور WebP، وصورة الهيرو بدون lazy ومع `fetchpriority="high"`، وباقي الصور `loading="lazy"`.
- صور الصفحات المبنية تأخذ `width` و`height` من الملف نفسه عند البناء لتجنب اهتزاز الصفحة.
- فيديو الرئيسية: `poster` و`preload="metadata"`.
- لم يُنفَّذ بعد: نسخ متعددة المقاسات (`srcset`) للموبايل، ونسخة فيديو مضغوطة للموبايل، وCDN.

## المصطلحات

التزم بها في كل النصوص: «تكسية جداري»، «خشب زان» (لا جوز ولا كرز)، «كنب مودرن» مع «زوايا منحنية» للكنب المنحني، «قماش مشجر» و«قماش جاكار». لا يُذكر السجاد ولا الثريات.
