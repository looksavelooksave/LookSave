-- 029_deliveries.sql
-- Yetkazib berish paneli: do'kon TAYYOR qilgan delivery buyurtmalarni bitta
-- dostavka firmasi olib ketadi. Firma operatori qabul qiladi, kuryer ism/
-- telefonini qo'lda yozadi, holatni yangilaydi. "Yetkazildi" => buyurtma yopiladi.
--
-- ⚠️ NEGA ALOHIDA JADVAL, ORDERS'GA USTUN EMAS. Yetkazish holati do'kon
-- holatidan boshqa hayot: buyurtma allaqachon 'ready' bo'lgan, lekin kuryer
-- hali yo'lda. Bu bosqichlarni orders.status ga tiqishtirish do'kon oqimini
-- buzardi. Shuning uchun yetkazish alohida yozuvda kuzatiladi.

-- ============================================================
-- 1) YANGI ROL — dostavka firmasi logini
-- ============================================================
-- ⚠️ CHECK qayta yoziladi: inline constraint 'users_role_check' deb nomlanadi.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'store_owner', 'admin', 'courier'));

-- ============================================================
-- 2) YETKAZISH TOPSHIRIQLARI
-- ============================================================
CREATE TABLE deliveries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Bitta buyurtmaga bitta yetkazish
  order_id      UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,

  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'assigned',
                                  'picked_up', 'delivered', 'failed')),

  -- Kuryer/taksi — operator qo'lda yozadi
  courier_name  TEXT,
  courier_phone TEXT,

  accepted_by   UUID REFERENCES users(id),   -- qaysi operator oldi
  accepted_at   TIMESTAMPTZ,
  assigned_at   TIMESTAMPTZ,
  picked_up_at  TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  fail_reason   TEXT,
  note          TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Navbat: ochiqlar eng eskisi birinchi
CREATE INDEX deliveries_status_idx ON deliveries (status, created_at);

-- updated_at ni avtomatik yangilash
CREATE OR REPLACE FUNCTION touch_delivery_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deliveries_touch_updated
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION touch_delivery_updated_at();

-- ============================================================
-- 3) BUYURTMA "READY" + DELIVERY BO'LSA — TOPSHIRIQ AVTO-YARATILADI
-- ============================================================
-- ⚠️ TRIGGER, PANEL EMAS. Do'kon buyurtmani 'ready' qilishi bilan yetkazish
-- navbatiga tushishi kerak — buni do'kon kodiga bog'lab qo'ymaymiz, aks holda
-- har yangi holat o'zgarishida esdan chiqishi mumkin edi. ON CONFLICT DO
-- NOTHING: takroriy 'ready' ikkinchi topshiriq yaratmaydi.
CREATE OR REPLACE FUNCTION enqueue_delivery() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivery_type = 'delivery'
     AND NEW.status = 'ready'
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO deliveries (order_id) VALUES (NEW.id)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_enqueue_delivery
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION enqueue_delivery();

-- ============================================================
-- 4) BACKFILL — allaqachon 'ready' bo'lgan delivery buyurtmalar
-- ============================================================
INSERT INTO deliveries (order_id)
SELECT id FROM orders
 WHERE delivery_type = 'delivery' AND status = 'ready'
ON CONFLICT (order_id) DO NOTHING;
