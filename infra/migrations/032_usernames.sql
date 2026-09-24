-- 032_usernames.sql
-- Sotuvchi username'i: store panelga kirish (telefon o'rniga) va do'konning
-- ochiq @handle'i. Qoidalar: packages/validation/src/username.ts.
--
-- ⚠️ citext EMAS, `lower()` indeksi. citext kengaytmasi superuser talab
-- qiladi (001_extensions.sql ga qarang), bu esa migratsiyani VPS'da
-- qo'lda aralashuvsiz o'tkazib bo'lmaydigan qilardi. Ilova username'ni
-- baribir kichik harfda saqlaydi — CHECK buni kafolatlaydi, indeks esa
-- ehtiyot uchun `lower()` bo'yicha.
--
-- Ixtiyoriy (NULL): xaridorlarga username kerak emas, mavjud sotuvchilar
-- esa uni admin yoki o'zlari keyinroq qo'yadi.

ALTER TABLE users
  ADD COLUMN username TEXT
    CHECK (username ~ '^[a-z][a-z0-9_.]{2,29}$');

CREATE UNIQUE INDEX users_username_key ON users (lower(username))
  WHERE username IS NOT NULL;
