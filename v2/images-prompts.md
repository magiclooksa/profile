# برومبتات صور مستقلة بأسلوب صور الموقع في الفيديو — MAGIC LOOK (v2)

الهدف: توليد **صور مستقلة** (ليست لقطة لابتوب) بنفس نمط الصور التي يعرضها الموقع داخل الفيديو المرجعي:
1. **كتالوج مفتوح يطفو مائلاً** مع شارات ثلاثية الأبعاد لامعة على أطرافه (قلب / شخص) — مثل الصورة المرفقة.
2. **بوسترات منتجات عمودية** مثل بطاقات الكاروسيل.
3. **أغلفة كتالوج مغلقة** تطفو بزاوية (تظهر على أطراف الشاشة في الفيديو).
4. **أيقونات ثلاثية الأبعاد** لبطاقات الأرقام.
5. **قطعة أثاث «تخرج» من الإطار** بدل الشخصية الكرتونية في الواجهة.

البرومبتات بالإنجليزية لأن أدوات التوليد تفهمها أدق، وفوق كل برومبت شرح بالعربي واسم صورة المنتج التي ترفقها معه (من `public/images/`).
ألوان الهوية: ذهبي مغرة `#7B5D08`، عسلي `#C9A24A`، أسود حبري `#17191B`، عاجي `#F4F0E8`. الشعار: `public/assets/logo.png`.

> الصور تُولَّد على خلفية بلون واحد ثم تُزال الخلفية (Remove background في Photoshop / Canva) لتصبح PNG شفافة تطفو في الموقع مثل الأصل.

---

## 0) البلوكات الثابتة

### STYLE LOCK — كتالوج مفتوح طائر (النمط الرئيسي)
```
STYLE LOCK — floating brochure mockup:
- OBJECT: one open saddle-stitched printed brochure, landscape A4, two-page spread lying open, seen from slightly above, rotated about -12 to -18 degrees and tilted back in 3D perspective so the left page is closer and larger and the right page recedes; the pages curve gently near the center fold, two small silver staples visible on the spine; thin white paper edges visible, a few pages thick.
- PRINT: premium matte paper, crisp offset print, realistic paper texture and very soft shading in the fold; the right page's outer edge has a full-bleed photo that runs off the page.
- BADGES: 3 or 4 glossy 3D speech-bubble badges (rounded-square chat bubbles with a small tail), candy-like plastic with soft inner glow and highlights, in gold #7B5D08 to honey #C9A24A gradient, each with a white icon (a heart, a person silhouette, a bookmark or a star), pinned on the brochure corners and edges, slightly overlapping the paper, casting tiny soft shadows.
- LIGHT: soft studio light from top-left, gentle drop shadow under the brochure as if it floats 10 cm above the surface.
- BACKGROUND: isolated on a plain solid pure white background (for background removal), nothing else in the frame, the whole brochure and all badges fully in frame with margin.
- QUALITY: ultra-realistic product mockup render, 4K, sharp, clean.
- NEGATIVE: no hands, no table, no props, no extra brochures, no purple, no blurry text blocks overlapping photos, no watermark, no distorted furniture.
```

### PRODUCT LOCK — للأثاث داخل الكتالوج أو البوستر
```
PRODUCT LOCK — the furniture photos printed in the design must reproduce the attached reference photos exactly: same pieces, same count, same shapes, same materials, same colors, same layout in the room. Do not add, remove, move or redesign any piece.
```

### LAYOUT LOCK — تصميم صفحات الكتالوج (هوية النظرة الساحرة)
```
LAYOUT LOCK — spread design in Magic Look identity:
- LEFT PAGE: ivory #F4F0E8 paper; a large rounded arch-shaped (or half-pill) color block in deep gold #7B5D08 filling the upper two-thirds; on it the small Magic Look logo mark in white and a two-line headline (Arabic bold on top, English light under it) in white; a clean cut-out of the furniture from the reference photo sits over the lower edge of the gold block, breaking out of it, with a soft contact shadow on the ivory paper.
- RIGHT PAGE: solid deep gold #7B5D08 background; two text columns in white (English on the left column with a bold title, Arabic on the right column with a bold title and a short white underline under each title); the outer third of the page is a full-bleed photo of the room from the reference, cut by a straight vertical edge.
- Typography: modern geometric Arabic sans (Almarai style) and clean Latin sans; short paragraphs; generous margins.
```

---

## A) كتالوجات مفتوحة طائرة (مثل الصورة المرفقة)
في كل واحد: الصق STYLE LOCK + PRODUCT LOCK + LAYOUT LOCK ثم سطر CONTENT. المقاس المقترح للصورة 16:9 (أو 2:1).

### A1) غرف النوم
مرجع: `collections/luxury-bedroom-set.webp` (للقطعة المقصوصة) + `collections/hotel-twin-bedroom.webp` (للصورة الكاملة يميناً).
```
[STYLE LOCK] [PRODUCT LOCK] [LAYOUT LOCK]
CONTENT: left page headline "غرف نوم بثلاث شخصيات" / "Bedrooms with three characters"; the cut-out is the luxury upholstered bed with its long bench and nightstand from reference 1. Right page titles "Designed for rest" and "صُمّمت للراحة", short paragraphs about a complete bedroom set (bed, nightstands, wardrobes, hidden light); full-bleed photo of the twin hotel-style bedroom with wood cladding and glow behind the headboard from reference 2.
```

### A2) السفرة
مرجع: `collections/luxury-dining-room.webp` + `collections/marble-dining-set.webp`.
```
[STYLE LOCK] [PRODUCT LOCK] [LAYOUT LOCK]
CONTENT: headline "سفرة تليق بضيوفك" / "A dining table worthy of your guests"; cut-out of the marble dining table with its floral-pattern chairs from reference 2. Right page titles "Wood & Marble" and "خشب ورخام"; full-bleed photo of the luxury dining room with the oval wood table and cove ceiling light from reference 1.
```

### A3) الكنب
مرجع: `collections/sofa-red-velvet-classic.webp` + `collections/sofa-classic-blue.webp`.
```
[STYLE LOCK] [PRODUCT LOCK] [LAYOUT LOCK]
CONTENT: headline "كنبة لكل ذوق" / "A sofa for every taste"; cut-out of the red tufted velvet sofa with wooden legs and beige cushions from reference 1. Right page titles "Made to your fabric" and "بالقماش الذي تختاره"; full-bleed photo of the blue velvet tasseled sofa in the bright white living room from reference 2.
```

### A4) كنب الزاوية
مرجع: `collections/sectional-modular-library.webp` + `collections/sectional-industrial-loft.webp`.
```
[STYLE LOCK] [PRODUCT LOCK] [LAYOUT LOCK]
CONTENT: headline "جلسة واحدة… أربعة عوالم" / "One seating, four worlds"; cut-out of the modular sectional sofa with wooden arm from reference 1. Right page titles "Shaped by your space" and "يتشكّل حسب المكان"; full-bleed photo of the grey U-shaped sectional between brick walls and steel windows from reference 2.
```

### A5) جدران التلفاز
مرجع: `collections/tv-walnut-lit-shelves.webp` + `collections/tv-marble-slat-wall.webp`.
```
[STYLE LOCK] [PRODUCT LOCK] [LAYOUT LOCK]
CONTENT: headline "اختر جدارك" / "Choose your wall"; instead of a cut-out, the left page shows the walnut TV wall with lit display shelves from reference 1 as a large rounded-corner photo overlapping the gold arch. Right page titles "Wood, stone & light" and "خشب وحجر وضوء"; full-bleed photo of the marble-look backlit panel on wood slats from reference 2.
```

### A6) المجالس
مرجع: `collections/majlis-moroccan-carved.webp` + `collections/majlis-modern-walnut.webp`.
```
[STYLE LOCK] [PRODUCT LOCK] [LAYOUT LOCK]
CONTENT: headline "مجالس بثلاث هويات" / "Majlis in three identities"; large rounded photo of the Moroccan carved-wood majlis with turquoise and mustard cushions from reference 1 overlapping the gold arch. Right page titles "The heart of the home" and "واجهة البيت وقلبه"; full-bleed photo of the modern U-shaped beige majlis with walnut bases from reference 2.
```

### A7) الخزائن والمطابخ
مرجع: `collections/closet-wall-unit.webp` + `collections/kitchen-wall-unit-stone.webp`.
```
[STYLE LOCK] [PRODUCT LOCK] [LAYOUT LOCK]
CONTENT: headline "خلف كل باب… تفصيلة" / "Behind every door, a detail"; rounded photo of the wall wardrobe with wood shelves and dark glass doors from reference 1. Right page titles "Built to the wall" and "بمقاس الجدار"; full-bleed photo of the stone-look kitchen wall unit with lit wood niche from reference 2.
```

### A8) فيلا الخشب
مرجع: `villa/living-wide-b.webp` + `villa/curtains-daylight.webp`.
```
[STYLE LOCK] [PRODUCT LOCK] [LAYOUT LOCK]
CONTENT: headline "فيلا الخشب" / "The Wood Villa"; rounded photo of the oak-wall living room with jute chandelier from reference 1. Right page titles "Warm oak, calm travertine" and "بلوط دافئ وترافرتين هادئ"; full-bleed photo of daylight through linen curtains from reference 2. Badges: heart, bookmark, person.
```

> لمنتج جديد: انسخ أي برومبت من A وغيّر سطر CONTENT فقط (العنوان + القطعة المقصوصة + الصورة الكاملة).

---

## B) بوسترات منتجات عمودية (مثل بطاقات الكاروسيل)
مقاس 4:5. بوستر سوشيال كامل لكل منتج: صورة المنتج + عنوان عربي عريض + شريط معلومات + الشعار.

### B-LOCK
```
POSTER LOCK — premium furniture social media poster, 4:5 vertical, flat graphic design (not a mockup):
- The furniture from the reference photo is the hero, large and centered in the lower 60%, either as a clean cut-out with a soft floor shadow on a styled background, or as the full room photo.
- TOP: a bold heavy Arabic headline (2 short lines) in ivory or gold, with a small Latin kicker in letter-spaced caps above it.
- Decorative depth: a few floating elements related to the product (fabric swatch, a wood chip, a small brass detail, soft leaves) around the furniture, slightly blurred for depth, like premium Saudi ad posters.
- BOTTOM: a thin dark info bar with three small gold icons (phone, location pin, Instagram) and the Magic Look logo on the right.
- Palette: ink black #17191B, gold #7B5D08 / honey #C9A24A, ivory #F4F0E8, plus the product's own colors.
- Ultra-clean, high-end, sharp, 4K.
- NEGATIVE: no people, no watermark, no other brand logos, no cluttered text.
```
[PRODUCT LOCK] يُضاف أيضاً.

| # | المنتج | المرجع | سطر CONTENT |
|---|---|---|---|
| B1 | كنبة مخمل أحمر عصرية | `collections/sofa-red-velvet-modern.webp` | `deep ink background with warm gold rim light; headline "المخمل الأحمر" / kicker "RED VELVET"; floating red velvet swatch and a gold thread spool` |
| B2 | كنبة زرقاء كلاسيكية | `collections/sofa-classic-blue.webp` | `ivory background with soft window light shadows; headline "كلاسيكي مشرق" / kicker "CLASSIC"; floating blue velvet tassels` |
| B3 | أريكة جاباندي | `collections/daybed-japandi-cream.webp` | `warm beige background with a wooden lattice shadow; headline "هدوء الجاباندي" / kicker "JAPANDI"; floating oak chip and dried pampas` |
| B4 | طقم غرفة نوم | `collections/luxury-bedroom-set.webp` | `soft taupe background; headline "فخامة هادئة" / kicker "BEDROOM"; floating linen fold and a brass knob` |
| B5 | سفرة الرخام | `collections/marble-dining-set.webp` | `ink background with a marble slab texture band; headline "رخام ونقوش" / kicker "DINING"; floating marble chip` |
| B6 | خزانة عرض زجاجية | `collections/glass-display-cabinet.webp` | `deep gold gradient background; headline "خزانة تحفظ وتعرض" / kicker "DISPLAY"; floating crystal glass` |
| B7 | جدار تلفاز الجوز | `collections/tv-walnut-lit-shelves.webp` | `full room photo with dark gradient top; headline "جدار يحكي" / kicker "TV WALL"; floating walnut slat` |
| B8 | مجلس مغربي | `collections/majlis-moroccan-carved.webp` | `ink background with faint Moroccan pattern; headline "مجلس مغربي فاخر" / kicker "MAJLIS"; floating carved wood fragment and turquoise cushion tassel` |
| B9 | تسريحة المرآة الدائرية | `collections/dressing-table-round-mirror.webp` | `ivory background with a soft round halo of light; headline "ركن التسريحة" / kicker "DRESSING"; floating perfume bottle silhouette blurred` |
| B10 | كنب زاوية بالخشب | `collections/sectional-wooden-sunroom.webp` | `light background with green leaf shadows; headline "حديقة داخلية" / kicker "SECTIONAL"; floating leaves` |

صيغة البرومبت: `[POSTER LOCK] [PRODUCT LOCK] CONTENT: <سطر الجدول>`

---

## C) أغلفة كتالوج مغلقة طائرة
تظهر على أطراف الشاشة في الفيديو (كتيبات مغلقة بزاوية). مقاس 1:1.
```
[STYLE LOCK but replace OBJECT with:] two closed A4 brochures, one standing slightly behind the other, both rotated about 20 degrees and floating in 3D perspective, front cover visible.
COVER DESIGN: deep gold #7B5D08 cover with a large ivory rounded arch window holding the photo from the reference; the white Magic Look logo at the top; title "الملف التعريفي" and "COMPANY PROFILE 2027" in white; a thin ivory line at the bottom with "magiclooksa.github.io/profile". The back brochure shows an ivory cover with a big gold logo mark.
[PRODUCT LOCK]
```
مرجع الصورة: `images/hero-poster.webp` أو `products/brown-majlis-interior-a7a46c3f15.webp`.

---

## D) أيقونات ثلاثية الأبعاد (لبطاقات الأرقام والشارات)
مقاس 1:1، كل أيقونة لوحدها، ثم إزالة الخلفية.
```
A single glossy 3D icon badge, rounded-square speech bubble with a small tail, soft candy-plastic material with inner glow, gold #7B5D08 to honey #C9A24A gradient, a clean white symbol in the center: <SYMBOL>. Soft studio light, tiny contact shadow, isolated on pure white background, centered, 4K, no text.
```
الرموز: `a heart` · `a person silhouette` · `a bookmark` · `a star` · `a sofa` · `a house` · `a ruler and pencil` · `a medal` · `a briefcase`.

---

## E) قطعة أثاث تخرج من الإطار (بديل الشخصية الكرتونية)
في الواجهة بالفيديو شخصية ثلاثية الأبعاد تطفو أمام العنوان. البديل لنا: قطعة أثاث بستايل 3D ناعم. مقاس 1:1.
```
A stylized premium 3D render of the furniture piece from the reference photo, soft clay-like realism with real fabric and wood textures (not cartoon, not toy-like), shown in a three-quarter front view, slightly larger at the front as if popping out toward the viewer, with a soft gold glow underneath and a tiny shadow. Isolated on pure white background, fully in frame, 4K.
[PRODUCT LOCK]
```
مرجع مقترح: `products/01-360-view-angles-bfa3cf86ae.webp` (المجلس البني) أو `products/01-wood-brown-chair-c8a99ea3be.webp` (الكرسي).
