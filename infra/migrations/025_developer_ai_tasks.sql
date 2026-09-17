-- 025_developer_ai_tasks.sql
-- Operator navbati: AI ishini odam bajaradigan yo'l.
--
-- NEGA: hozirgacha AI chaqiruvi so'rov ichida bajarilardi va har bittasi
-- pul turardi. Endi so'rov NAVBATGA tushadi va uni kim bajarishi
-- almashtiriladigan bo'ladi — operator, arzon model yoki OpenAI. Mijoz
-- uchun hech narsa o'zgarmaydi: u baribir natijani kutadi.
--
-- ⚠️ NEGA ALOHIDA JADVAL, `tryon_renders` GA USTUN QO'SHISH EMAS.
-- Navbatda ikki xil ish turadi: avatar yasash (`profiles` da yashaydi) va
-- kiyintirish (`tryon_renders` da). Ularni bitta jadvalga yig'sak,
-- panel ikkalasining ichki tuzilishini bilishi shart bo'lardi. Bu yerda
-- esa panel faqat NAVBATNI biladi, natijani qayerga yozish kerakligini
-- `kind` bo'yicha API hal qiladi.
--
-- Migratsiya orqaga qaytmaydi. O'zgarish kerak bo'lsa — yangi raqamlangan fayl.

CREATE TABLE developer_ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * Ish turi. `avatar` — yuz va o'lchamlardan avatar yasash;
   * `render` — avatarga kiyim kiydirish.
   *
   * Natija qayerga yozilishi shunga qarab hal qilinadi, shuning uchun
   * ro'yxat CHEKLANGAN: noma'lum tur kelsa natijani joylashtirib
   * bo'lmaydi va ish jimgina yo'qolardi.
   */
  kind text NOT NULL CHECK (kind IN ('avatar', 'render')),

  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  /*
   * Natija qaysi yozuvga tegishli. `avatar` uchun — `profiles.user_id`,
   * `render` uchun — `tryon_renders.id`.
   *
   * ⚠️ FOREIGN KEY YO'Q, chunki u ikki xil jadvalga qaraydi. Buning
   * evaziga `kind` + `ref_id` juftligi noyob bo'lishi ta'minlanadi
   * (pastdagi indeks) — aks holda bitta avatarga ikkita ish tushardi.
   */
  ref_id uuid NOT NULL,

  /*
   * `pending`  — navbatda, hech kim olmagan
   * `claimed`  — operator band qilgan, ishlayapti
   * `done`     — natija qabul qilindi va joyiga yozildi
   * `failed`   — operator bajara olmadi (sabab `error` da)
   * `expired`  — hech kim vaqtida olmadi, avtomatga o'tkazildi
   */
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'done', 'failed', 'expired')),

  /*
   * Operator uchun kerakli hamma narsa: manba suratlar, o'lchamlar,
   * kiyim surati. Panel shu maydonni ko'rsatadi va boshqa hech qayerga
   * so'rov yubormaydi.
   *
   * ⚠️ IMZOLANGAN HAVOLALAR BU YERGA YOZILMAYDI — ular muddatli.
   * Kanonik manzil saqlanadi, imzo panel so'ragan paytda beriladi.
   */
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  claimed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  claimed_at timestamptz,

  result_url text,
  error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

/*
 * Bitta yozuvga bitta ish. Takroriy so'rov kelsa yangi ish
 * yaratilmaydi — mavjudi qaytariladi.
 *
 * ⚠️ FAQAT TUGALLANMAGANLAR uchun. Tugagan ish qayta so'ralishi
 * mumkin (masalan foydalanuvchi avatarini qaytadan yasatmoqchi), shuning
 * uchun `done`/`failed`/`expired` cheklovga kirmaydi.
 */
CREATE UNIQUE INDEX developer_ai_tasks_open_idx
  ON developer_ai_tasks (kind, ref_id)
  WHERE status IN ('pending', 'claimed');

/* Panel navbatni shu tartibda o'qiydi: eng eskisi birinchi. */
CREATE INDEX developer_ai_tasks_queue_idx
  ON developer_ai_tasks (status, created_at);

/*
 * Muddati o'tganlarni topish uchun. Fon vazifasi `claimed_at IS NULL`
 * va `created_at` eski bo'lganlarni avtomatga o'tkazadi.
 */
CREATE INDEX developer_ai_tasks_stale_idx
  ON developer_ai_tasks (created_at)
  WHERE status = 'pending';

COMMENT ON TABLE developer_ai_tasks IS
  'Operator navbati — AI ishini odam bajaradigan yo`l (developer_ai paneli).';
