# Premium UI — birinchi ekranlar guruhi

Manba: [LookSave dizayn brifi](https://claude.ai/code/artifact/b69be35f-251d-4a42-9ee6-a31a26124826).

Brifdagi ustuvorlik bo‘yicha ushbu guruh kiyib ko‘rish, bosh sahifa va mahsulot tafsilotlarini qamrab oladi. Ilova React Native/Expo bo‘lib qoladi. Mavjud rang va shrift tokenlari o‘zgarmagan.

## Kiyib ko‘rish

- Sarlavha: `h2` (22/28). Do‘kon va yordamchi matn: `small` (13/18).
- Sahna: `bgElevated`, `radius.lg` (16), tashqi oraliq `spacing.md` (16). Balandlik ekran balandligining 40 foizi, 260–400 pt oralig‘ida.
- Old, yon va orqa rakurs: kamida 44 pt nishon. Boshqaruv va rang tanlash: 44×44 pt.
- Kiyim tasmasi: 72×96 pt kartalar, 8 pt oraliq; oq chegara tanlovni ko‘rsatadi.
- Bo‘limlar orasida 24 pt. Mahsulot nomi `h3` (17/24), narx `bodyMed` (15/22).
- Avatarni neon halqa, to‘r yoki doimiy puls to‘smaydi. Yaqinlashtirish 1.5×.
- Kutish xabari sahna pastida, 16 pt ichki oraliq bilan. Vaqt matni taxminiy; sun’iy foiz hisoblagichi yo‘q.
- Bo‘sh katalog, yuklanish, tarmoq xatosi, tugagan limit va omborda yo‘q mahsulot holatlari ajratilgan.
- Matnlar o‘zbek, rus, ingliz va arab tillarida. Arabchada boshqaruvlar, rakurs/kategoriya qatorlari, kiyim tasmasi, svayp va komplekt tartibi akslanadi; mahsulot suratlari akslantirilmaydi.

## Bosh sahifa

- Sarlavha `hero` (40/46), yordamchi matn `body` (15/22).
- Hero katalogdagi mavjud mahsulot surati, nomi va haqiqiy narxidan tuziladi. Neon kapyushonli fon bu ekranda ishlatilmaydi.
- Hero rasmi 240 pt, chetlari `radius.md` (12). Asosiy tugma kamida 52 pt.
- Yetakchi brendlar va ommabop mahsulotlar saqlangan. Bo‘limlar orasida 32 pt.
- Mahsulotlar ikki ustunda; nom uchun ikki qator. Arabchada ustunlar tartibi akslanadi.
- Scrollga bog‘langan stretch/fade o‘rniga oddiy ro‘yxat va yangilash ishlatiladi.

## Mahsulot tafsilotlari

- Galereya ekran kengligiga mos, balandligi kenglikning 1.15 qismi. Surat `contain` bilan butun ko‘rsatiladi.
- Mahsulot nomi va narxi `h2` (22/28). Do‘kon alohida keng qatorda.
- O‘lcham va rang guruhlaridagi tashqi kartalar olib tashlangan. Tanlov oq chegara bilan ajratiladi; binafsha asosiy xarid amalida qoladi.
- Rang tanlash 44×44 pt. Uzun tugma matni balandlik bo‘yicha o‘sishi mumkin.
- Yuklanish skeleti va mavjud o‘lcham yo‘qligi matni bor. Pastki safe area hisobga olinadi.

## Umumiy navigatsiya

Tab ekranlarida beshta doimiy yo‘nalish, markazda ko‘tarilgan 56 pt AI tugmasi. Arabcha tanlanganda yo‘nalishlar tartibi darhol akslanadi. Mahsulot va AI oqimining alohida stack ekranlari avvalgi navigatsiya tuzilishini saqlaydi.

## Tekshiruv va qolgan ishlar

- TypeScript va 68 ta unit test o‘tdi; arabcha svayp va tarjima placeholderlari uchun qo‘shimcha tekshiruvlar bor.
- Expo iOS/Android ishlab chiqarish JS va Hermes paketlari eksporti o‘tdi. Bu App Store/Play Store uchun native build yoki nashr emas.
- Simulatorni vizual boshqarish tizim ruxsati yo‘qligi sabab bajarilmadi. 390×844 qurilma ko‘rinishi, katta shrift, ekran o‘quvchisi va haqiqiy AI oqimi qurilmada tekshirilishi kerak.
- 390×844 yuqori aniqlikdagi maketlar va arabcha maket tasviri hali ishlab chiqilmagan.
- Yuz skaneri, marketplace, katalog, savdo va akkaunt ekranlari keyingi guruhlarga qoladi. Brifning barcha ekranlari tayyor deb hisoblanmaydi.
