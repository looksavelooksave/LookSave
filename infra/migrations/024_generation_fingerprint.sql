-- 024_generation_fingerprint.sql
-- Kesh kalitiga generatsiya retsepti qo'shildi.
--
-- NEGA: `source_hash` ichida faqat surat manzillari bor edi. Manzillar esa
-- AI modeli almashganda o'zgarmaydi — `gpt-image-1` dan
-- `gpt-image-2.5-sunburst` ga o'tilganda kalit o'sha bo'lib qoldi va kesh
-- eski, yuzi buzuq natijalarni qaytaraverdi. Yangi model umuman
-- chaqirilmasdi: tashqaridan bu «o'zgarish ishlamadi» bo'lib ko'rinardi.
--
-- Endi xeshga model nomi va so'rov tanasidagi chiqish sozlamalari ham
-- kiradi (`integrations/openai.ts` — `generationFingerprint`). Retsept
-- o'zgarishi bilan xesh o'zgaradi va natija qaytadan yasaladi.
--
-- ⚠️ SXEMA O'ZGARMAYDI — bu migratsiya faqat IZOHLARNI yangilaydi.
-- Ustunlardagi `COMMENT` xeshning tarkibini tasvirlaydi va u endi
-- noto'g'ri edi; kod o'qiyotgan odam uchun bu jim yanglishtirish.
--
-- ⚠️ ESKI QATORLAR TEGILMAYDI. Ular yangi xesh bilan MOS KELMAY qoladi,
-- ya'ni hech qachon qaytarilmaydi. `tryon_renders` da yangi qator
-- qo'shiladi va `listRenders` eng yangisini oladi (`created_at DESC`).
-- Bazadagi va R2 dagi eskilarini tozalash — alohida ish, bu yerda emas:
-- o'chirish qaytarib bo'lmaydi va u qaror sifatida ochiq qolishi kerak.
--
-- ⚠️ BIR MARTALIK QAYTA TO'LOV. Migratsiyadan keyin har foydalanuvchining
-- avatari va ochgan kiyimlari bir marta qaytadan yasaladi. Kunlik chegara
-- (`TRYON_DAILY_LIMIT`) buni cheklab turadi.
--
-- Migratsiya orqaga qaytmaydi. O'zgarish kerak bo'lsa — yangi raqamlangan fayl.

COMMENT ON COLUMN tryon_renders.source_hash IS
  'sha256(generatsiya retsepti + gavda surati + kiyim surati). '
  'Retsept — AI model nomi va chiqish sozlamalari; o''zgarsa natija qaytadan yasaladi.';

COMMENT ON COLUMN profiles.avatar_source_hash IS
  'sha256(generatsiya retsepti + yuz surati + gavda tavsifi). '
  'O''zgarsa avatar qaytadan yasaladi.';
