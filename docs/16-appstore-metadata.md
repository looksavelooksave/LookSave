# 16 — App Store Connect metadata

LookSave iOS ilovasini App Store'ga joylash uchun **tayyor, copy-paste** matnlar.
Apple ko'rib chiqishi (App Review) va 4.3(b) ("spam / past sifat / dublikat") rad
etilishining oldini olish uchun yozilgan.

> ⚠️ **Yuridik ko'rib chiqishdan o'tmagan.** Bu yerda faqat texnik haqiqat.
> Ishga tushirishdan oldin maxfiylik matni va shartlar yurist tomonidan
> tasdiqlanishi shart (xuddi `apps/web/src/routes/privacy.tsx` dagidek).

> ⚠️ **Hal qilinishi kerak — aloqa domeni.** Kod bazasida ikki domen aralashgan:
> backend va sayt `looksave.uz` da (jonli), lekin `Footer.tsx` va `privacy.tsx`
> hali `looksave.app` pochtasini ko'rsatadi (`.app` o'lik). Quyida hamma joyda
> `looksave.uz` ishlatildi. App Store Connect'ga kiritishdan oldin
> **haqiqiy support/privacy pochtasini tasdiqlang** va saytdagi eski `.app`
> havolalarini yangilang.

---

## 1. Umumiy sozlamalar (tilga bog'liq emas)

| Maydon | Qiymat |
|---|---|
| **Bundle ID** | `com.looksave.looksave` |
| **SKU** | `looksave-ios-01` |
| **Primary language** | English (U.S.) |
| **Primary category** | Shopping |
| **Secondary category** | Lifestyle |
| **Price** | Free |
| **In-App Purchases** | Yo'q (ilovada to'lov yo'q — pastga qarang) |
| **Copyright** | © 2026 LookSave |
| **Support URL** | https://looksave.uz |
| **Marketing URL** | https://looksave.uz |
| **Privacy Policy URL** | https://looksave.uz/en/privacy |

### App Store tillari

Ilova 4 tilda (uz · ru · en · ar), lekin **App Store Connect o'zbek tilini
qo'llab-quvvatlamaydi**. Shuning uchun do'kon ko'rinishi: **English (default) +
Russian + Arabic**. Uchalasi ham quyida tayyor.

### Age Rating (yosh reytingi)

Taklif: **4+**. Ilovada zo'ravonlik, kattalar kontenti yo'q. Diqqat: sotuvchilar
mahsulot rasmlarini yuklaydi (cheklangan UGC) — Apple anketasidagi
"User-Generated Content" savoliga **Ha** deb javob bering va moderatsiya borligini
belgilang (admin-panel'da mahsulot tasdiqlash bor). Bu odatda reytingni 12+ ga
ko'tarmaydi, lekin anketani halol to'ldiring.

---

## 2. English (default / primary)

**App Name** (≤30)
```
LookSave
```

**Subtitle** (≤30)
```
AI try-on for real stores
```

**Promotional Text** (≤170)
```
See how clothes look on you before you buy. Scan once, try on items from stores near you with AI, then order the right size straight from the shop.
```

**Keywords** (≤100, vergul bilan, bo'sh joysiz)
```
virtual try-on,fitting room,fashion,outfit,wardrobe,avatar,boutique,local stores,style,clothing
```

**Description** (≤4000)
```
LookSave lets you try clothes on yourself with AI — before you spend a tenge.

Scan your face and body once to build your personal avatar. Then browse real
clothing from stores near you and see each item worn on you, in your size, in
seconds. No more guessing how something will fit or look.

HOW IT WORKS
• Build your avatar — one quick face and body scan, or upload a full-body photo.
• Find stores nearby — the map shows shops around you that support AI try-on.
• Try it on — tap any item and AI dresses your avatar. Swipe to compare, layer
  a full outfit, and check your recommended size.
• Order from the shop — add what fits to your cart and send the order straight
  to the store.

NO PAYMENT INSIDE THE APP
LookSave is not a payment app. Your order is a request sent to a physical store.
You settle up with the shop directly — on delivery or in person. There are no
in-app purchases and no card details to enter.

BUILT FOR YOUR CITY
LookSave connects you with real local boutiques and shops, not a faceless
warehouse. Everything you try on is something you can actually buy near you.

PRIVACY YOU CONTROL
Your face and body photos are used only to create your avatar and dress it. They
are stored privately and sent to our try-on provider (FASHN) solely for that
purpose. You can delete your photos or your whole account anytime in Settings.
Location is optional and used only to show nearby stores.

Available in English, Russian, Uzbek and Arabic.
```

**What's New** (release notes, ≤4000)
```
• Faster, higher-quality AI try-on.
• New guided onboarding so you can start trying things on in seconds.
• Full English, Russian and Arabic translations across the app.
• Clearer errors and lots of polish throughout.
```

---

## 3. Russian (Русский)

**App Name** (≤30)
```
LookSave
```

**Subtitle** (≤30)
```
AI-примерка и магазины рядом
```

**Promotional Text** (≤170)
```
Посмотрите, как одежда сидит на вас, ещё до покупки. Один раз отсканируйтесь, примеряйте вещи из магазинов рядом с помощью AI и заказывайте свой размер.
```

**Keywords** (≤100)
```
виртуальная примерка,мода,одежда,образ,гардероб,аватар,бутик,магазины рядом,стиль
```

**Description** (≤4000)
```
LookSave позволяет примерить одежду на себя с помощью AI — ещё до покупки.

Один раз отсканируйте лицо и фигуру, чтобы создать свой персональный аватар.
Затем смотрите реальную одежду из магазинов рядом с вами — на себе, в своём
размере, за секунды. Больше не нужно гадать, подойдёт ли вещь.

КАК ЭТО РАБОТАЕТ
• Создайте аватар — быстрое сканирование лица и фигуры или загрузка фото в полный
  рост.
• Найдите магазины рядом — на карте показаны магазины с поддержкой AI-примерки.
• Примеряйте — нажмите на вещь, и AI оденет ваш аватар. Листайте, собирайте
  образ целиком и проверяйте рекомендованный размер.
• Заказывайте в магазине — добавьте подходящее в корзину и отправьте заказ
  напрямую продавцу.

БЕЗ ОПЛАТЫ В ПРИЛОЖЕНИИ
LookSave — не платёжное приложение. Ваш заказ — это запрос в реальный магазин.
Оплата происходит напрямую с магазином: при доставке или на месте. Никаких
встроенных покупок и ввода данных карты.

ДЛЯ ВАШЕГО ГОРОДА
LookSave связывает вас с настоящими местными магазинами и бутиками. Всё, что вы
примеряете, можно купить рядом.

КОНФИДЕНЦИАЛЬНОСТЬ ПОД ВАШИМ КОНТРОЛЕМ
Фото лица и фигуры используются только для создания и одевания аватара. Они
хранятся приватно и передаются нашему провайдеру примерки (FASHN) исключительно
для этой цели. Вы в любой момент можете удалить фото или весь аккаунт в
настройках. Геолокация необязательна и нужна только для показа магазинов рядом.

Доступно на русском, английском, узбекском и арабском.
```

**What's New**
```
• Быстрая и более качественная AI-примерка.
• Новое пошаговое знакомство — начните примерять за секунды.
• Полный перевод приложения на русский, английский и арабский.
• Понятные сообщения об ошибках и множество улучшений.
```

---

## 4. Arabic (العربية)

**App Name** (≤30)
```
LookSave
```

**Subtitle** (≤30)
```
تجربة ذكية ومتاجر قريبة
```

**Promotional Text** (≤170)
```
شاهد كيف تبدو الملابس عليك قبل الشراء. امسح مرة واحدة، وجرّب قطعًا من متاجر قريبة منك بالذكاء الاصطناعي، ثم اطلب مقاسك مباشرة من المتجر.
```

**Keywords** (≤100)
```
تجربة افتراضية,غرفة قياس,أزياء,إطلالة,خزانة,أفاتار,بوتيك,متاجر قريبة,ستايل,ملابس
```

**Description** (≤4000)
```
يتيح لك LookSave تجربة الملابس على نفسك بالذكاء الاصطناعي — قبل أن تدفع.

امسح وجهك وجسمك مرة واحدة لإنشاء الأفاتار الخاص بك. ثم تصفّح ملابس حقيقية من متاجر
قريبة منك وشاهد كل قطعة عليك، بمقاسك، خلال ثوانٍ. لا مزيد من التخمين حول الشكل أو
المقاس.

كيف يعمل
• أنشئ الأفاتار — مسح سريع للوجه والجسم، أو ارفع صورة لكامل الجسم.
• اعثر على متاجر قريبة — تعرض الخريطة المتاجر التي تدعم التجربة بالذكاء الاصطناعي.
• جرّب — اضغط على أي قطعة ليُلبسها الذكاء الاصطناعي لأفاتارك. مرّر للمقارنة، وكوّن
  إطلالة كاملة، وتحقق من المقاس المقترح لك.
• اطلب من المتجر — أضف ما يناسبك إلى السلة وأرسل الطلب مباشرة إلى المتجر.

لا دفع داخل التطبيق
LookSave ليس تطبيق دفع. طلبك هو طلب يُرسَل إلى متجر حقيقي. تتم التسوية مع المتجر
مباشرة — عند التوصيل أو في المكان. لا مشتريات داخل التطبيق ولا إدخال لبيانات
البطاقة.

مصمَّم لمدينتك
يربطك LookSave بمتاجر وبوتيكات محلية حقيقية. كل ما تجرّبه يمكنك شراؤه بالقرب منك.

خصوصية تتحكم بها
تُستخدم صور وجهك وجسمك فقط لإنشاء الأفاتار وإلباسه. تُحفظ بشكل خاص وتُرسَل إلى مزوّد
التجربة (FASHN) لهذا الغرض حصرًا. يمكنك حذف صورك أو حسابك بالكامل في أي وقت من
الإعدادات. الموقع اختياري ويُستخدم فقط لعرض المتاجر القريبة.

متوفر بالعربية والإنجليزية والروسية والأوزبكية.
```

**What's New**
```
• تجربة بالذكاء الاصطناعي أسرع وبجودة أعلى.
• تعريف تمهيدي جديد لتبدأ التجربة خلال ثوانٍ.
• ترجمة كاملة للتطبيق إلى العربية والإنجليزية والروسية.
• رسائل أخطاء أوضح وتحسينات عديدة.
```

---

## 5. App Review Notes (Apple ko'rib chiquvchisiga — INGLIZCHA)

> App Store Connect → App Review Information → Notes maydoniga qo'ying.
> **4.3(b) rad etilishining oldini olish uchun eng muhim qism shu.**

```
ABOUT THE APP
LookSave is a real fashion marketplace for Uzbekistan. It connects shoppers with
physical local stores and lets them virtually try clothing on an AI avatar before
ordering. This is an original product, not a template or reskin: the core value
is AI try-on (via the FASHN provider) combined with a hyperlocal, store-by-store
catalog of items you can buy nearby.

NO IN-APP PAYMENTS
There are no in-app purchases and no payment processing in the app. An "order" is
a request sent to a physical store; the shopper pays the store directly on
delivery or in person. No card or banking details are collected in the app.

DEMO ACCOUNT
Phone: +998 90 000 77 77
Password: AppReview2026!
(The demo account is pre-loaded with body measurements and a selected store.)

HOW TO REVIEW THE CORE FEATURE (AI TRY-ON)
The try-on feature needs a face/body photo to build the avatar. On a device:
1. Open the app and sign in with the demo account above.
2. Go to the avatar setup. Use "Upload a full-body photo" to provide a photo
   instead of the live face scan (the live scan needs a real front camera).
3. Once the avatar is ready, open the "Try-on" tab, pick a store, tap any item,
   and the AI dresses the avatar. You can then add it to the cart.
Note: a live camera face scan cannot run in the iOS Simulator — please test on a
real device, or use the photo-upload option.

LANGUAGES
The app UI follows the device language (Uzbek, Russian, English, Arabic).

PERMISSIONS
• Camera / Photos — only to capture or pick the photo used to build the avatar.
• Location — optional, only to show nearby stores.

PRIVACY
Face/body photos leave the device: they go to our server and to the try-on
provider (FASHN) solely to generate the avatar and dress it. Users consent before
upload and can delete photos or their account anytime in Settings. Full policy:
https://looksave.uz/en/privacy
```

---

## 6. Pre-submission checklist (ekran rasmlari va texnik)

- [ ] **Screenshots** — 6.9" (iPhone 16 Pro Max) va 6.5" majburiy. supportsTablet
      `false`, shuning uchun iPad shart emas. Kamida: (1) try-on ekrani avatar
      kiyimda, (2) do'konlar xaritasi, (3) onboarding, (4) komplekt + narx,
      (5) bosh ekran. Har til uchun alohida shart emas — ingliz rasmlar yetadi,
      lekin til bo'yicha qilsa yaxshi.
- [ ] **App Preview** (video) — ixtiyoriy, lekin try-on uchun kuchli ta'sir.
- [ ] **App Privacy "Nutrition Label"** — App Store Connect anketasida belgilang:
      Contact Info (ism, telefon), Location (taxminiy), User Content (fotosuratlar
      — "linked to identity", "app functionality"). Face photo'ni to'g'ri
      kategoriyada ko'rsating.
- [ ] **Encryption** — `ITSAppUsesNonExemptEncryption: false` allaqachon
      `app.json` da. Export compliance savoli avtomatik hal bo'ladi.
- [ ] **`version`** — `app.json` da hozir `0.1.0`. Store uchun ma'noli versiyaga
      ko'taring (masalan `1.0.0`); `buildNumber` hozir `26`.
- [ ] **Usage strings** — `app.json` infoPlist'da kamera/foto/joylashuv matnlari
      bor va misolli (hard-crash xavfi yo'q). ✓
- [ ] **Support/privacy pochta** — `.app` → `.uz` domenini tasdiqlang (yuqoridagi
      ogohlantirish).
```
