-- 033_brand_owner.sql
-- Sotuvchi o'z brandini yaratadi: egasi (owner_id) va @username.
-- Admin yaratgan brendlarda owner_id = NULL (Nike, Adidas va h.k.).
-- Qoidalar username uchun: packages/validation/src/username.ts bilan bir xil.

ALTER TABLE brands
  ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN username TEXT
    CHECK (username ~ '^[a-z][a-z0-9_.]{2,29}$');

-- Har sotuvchida bitta brand (owner bo'yicha noyob; admin brendlar NULL, cheklovsiz)
CREATE UNIQUE INDEX brands_owner_key ON brands (owner_id) WHERE owner_id IS NOT NULL;

-- @username butun brendlar bo'yicha noyob (lower — katta/kichik farqsiz)
CREATE UNIQUE INDEX brands_username_key ON brands (lower(username))
  WHERE username IS NOT NULL;
