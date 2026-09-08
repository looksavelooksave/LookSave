-- 023_render_layers.sql
-- Qatlamli kiyintirish: kiyim ustiga kiyim.
--
-- NEGA: hozirgacha har kiyintirish foydalanuvchining ASL suratidan
-- boshlanardi va natijada ekranda doim BITTA kiyim ko'rinardi. Kurtka
-- tanlansa futbolka yo'qolardi. Maketdagi ketma-ketlik esa boshqa narsani
-- va'da qiladi: shim → futbolka → ko'ylak → xudi → kurtka, ya'ni to'liq
-- komplekt bir gavdada.
--
-- Yechim: kiyintirish uchun model surati sifatida ASL surat emas, OLDINGI
-- NATIJA ishlatiladi. Bu ustun aynan o'sha «oldingi natija» ni ko'rsatadi.
--
-- Migratsiya orqaga qaytmaydi. O'zgarish kerak bo'lsa — yangi raqamlangan fayl.

/*
 * Qaysi natija ustiga kiydirilgan. NULL — asl suratga, ya'ni birinchi qatlam.
 *
 * ⚠️ KESH KALITIGA ALOHIDA QO'SHILMAYDI. `source_hash` ichida model
 * surati manzili bor, qatlamda esa u aynan asos natijaning manzili —
 * demak har kombinatsiya allaqachon o'z xeshiga ega va mavjud
 * `tryon_renders_key_idx` buzilmaydi.
 *
 * Ustun SO'ROV uchun kerak: ilova «shu asos ustidagi natijalar» ni
 * so'raydi. Xesh bo'yicha izlab bo'lmasdi — ilova asos suratining
 * manzilini bilmaydi, faqat uning `id` sini biladi.
 *
 * ⚠️ CASCADE ATAYIN. Asos o'chirilsa (masalan foydalanuvchi suratini
 * almashtirgani uchun tozalash) uning ustidagi qatlamlar ma'nosini
 * yo'qotadi: ular endi mavjud bo'lmagan surat ustiga chizilgan. Yetim
 * qatlam ko'rsatilsa foydalanuvchi «yechilgan» kiyimni ko'rib turardi.
 */
ALTER TABLE tryon_renders
  ADD COLUMN base_render_id UUID REFERENCES tryon_renders(id) ON DELETE CASCADE;

/*
 * Gallereya so'rovi: bitta foydalanuvchi + burchak + asos bo'yicha.
 *
 * ⚠️ `base_render_id IS NULL` HAM SHU INDEKSGA TUSHADI — birinchi qatlam
 * eng ko'p so'raladigan hol va u alohida qisman indeksni talab qilmaydi.
 */
CREATE INDEX tryon_renders_base_idx
  ON tryon_renders (user_id, angle, base_render_id);

COMMENT ON COLUMN tryon_renders.base_render_id IS
  'Qaysi natija ustiga kiydirilgan. NULL — asl suratga (birinchi qatlam).';
