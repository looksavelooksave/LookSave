-- CatVTON sifat testi uchun juftlar.
--
-- Maqsad: CatVTON'ga va `gpt-image-2.5` ga AYNAN bir xil kirish berish.
-- Shuning uchun juftlar o'ylab topilmaydi — allaqachon yasalgan
-- natijalardan olinadi. Har qatorda: o'sha odam surati, o'sha kiyim
-- surati va GPT chiqargan natija (`reference`).
--
-- ⚠️ CHIQISHDAGI `person` HAVOLASI TO'G'RIDAN-TO'G'RI OCHILMAYDI.
-- `body/` prefiksi shaxsiy bucketda (`r2.ts` — PRIVATE_PURPOSES).
-- Uni `presignRead` bilan imzolash kerak; `apps/api/scripts/
-- make-bench-pairs.ts` shuni qiladi. Bu fayl faqat ko'rib chiqish va
-- sanash uchun.
--
-- Ishlatish:
--   psql "$DATABASE_URL" -v per_slot=10 -f infra/scripts/bench-pairs.sql
--
-- :per_slot          — har slotdan nechta (sukut 10)
-- :include_layered   — qatlamli natijalarni ham olish (sukut false)
--
-- ⚠️ `outer` ODATDA QATLAMLI BO'LADI. Kurtka biror narsaning USTIGA
-- kiyiladi, ya'ni deyarli har `outer` renderda `base_render_id` bor.
-- Sukut qiymatda ular chiqarib tashlanadi va `outer` umuman sinalmaydi.
-- Shu slotni sinash uchun :include_layered = true qiling — evaziga
-- model surati oldingi GPT natijasi bo'ladi, ya'ni kirish toza emas.

\if :{?per_slot}
\else
  \set per_slot 10
\endif

\if :{?include_layered}
\else
  \set include_layered false
\endif

WITH candidates AS (
  SELECT DISTINCT ON (person, garment)
         p.slot,
         r.result_url                                       AS reference,
         COALESCE(pr.body_photo_url, pr.avatar_image_url)   AS person,
         COALESCE(v.images ->> 0, p.images ->> 0)           AS garment,
         r.created_at
    FROM tryon_renders r
    JOIN product_variants v ON v.id = r.variant_id
    JOIN products         p ON p.id = v.product_id
    JOIN profiles        pr ON pr.user_id = r.user_id
   WHERE r.status = 'ready'
     AND r.result_url IS NOT NULL

     -- ⚠️ FAQAT OLD KO'RINISH. CatVTON yon/orqada ishonchsiz, va ilova
     -- ham u burchaklarni kiyintirmaydi (`avatar-prompt.ts`).
     AND r.angle = 'front'

     -- ⚠️ QATLAMSIZ (sukut bo'yicha). `base_render_id` bo'lsa model
     -- surati oldingi natijaning o'zi bo'ladi — ya'ni testga GPT
     -- artefaktlari kirib keladi va farq modeldan emas, kirishdan
     -- chiqadi. `outer` uchun buni yoqishga to'g'ri keladi.
     AND (:include_layered OR r.base_render_id IS NULL)

     -- `feet` CatVTON'da qo'llab-quvvatlanmaydi (poyabzal himoyalangan)
     AND p.slot IN ('top', 'outer', 'bottom')

     AND COALESCE(pr.body_photo_url, pr.avatar_image_url) IS NOT NULL
     AND COALESCE(v.images ->> 0, p.images ->> 0) IS NOT NULL
   ORDER BY person, garment, r.created_at DESC
),
balanced AS (
  -- ⚠️ SLOT BO'YICHA TENG TAQSIMLASH. Oddiy LIMIT olinsa natija
  -- katalogdagi nisbatni takrorlaydi va 30 juftning 27 tasi `top`
  -- bo'lib qolishi mumkin — `outer` va `bottom` esa sinalmay qoladi.
  SELECT *,
         ROW_NUMBER() OVER (PARTITION BY slot ORDER BY random()) AS rn
    FROM candidates
)
SELECT slot || '-' || LPAD(rn::text, 2, '0') AS id,
       slot,
       person,
       garment,
       reference
  FROM balanced
 WHERE rn <= :per_slot
 ORDER BY slot, rn;
