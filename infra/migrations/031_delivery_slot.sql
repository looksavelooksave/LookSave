-- 031_delivery_slot.sql
-- Yetkazib berish VAQTI: mijoz checkout'da qachon kerakligini tanlaydi.
--   today     — bugun
--   tomorrow  — ertaga kun davomida
--   scheduled — o'zi tanlagan kun (delivery_date majburiy)
--
-- ⚠️ FAQAT DELIVERY UCHUN. Olib ketish (pickup) da vaqt slotining ma'nosi
-- yo'q — u yerda ustun NULL bo'lib qoladi.

ALTER TABLE orders
  ADD COLUMN delivery_slot TEXT
    CHECK (delivery_slot IN ('today', 'tomorrow', 'scheduled')),
  ADD COLUMN delivery_date DATE;

-- «O'zim tanlagan kun» bo'lsa — sana majburiy; boshqa hollarda sana bo'lmaydi
ALTER TABLE orders ADD CONSTRAINT delivery_slot_date_check CHECK (
  (delivery_slot = 'scheduled' AND delivery_date IS NOT NULL)
  OR (delivery_slot IS DISTINCT FROM 'scheduled' AND delivery_date IS NULL)
);
