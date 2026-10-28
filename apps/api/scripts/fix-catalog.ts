/**
 * fix-catalog.ts — import qilingan mahsulotlarning matni va rangini tuzatadi.
 *
 * NEGA: `catalog-demo.json` ning birinchi versiyasida sarlavha va rang
 * manba (DummyJSON) nomidan olingan edi — rasmga qaralmagan. Natijada
 * «shippak» deb poshnali tufli, «qora sumka» deb havorang sumka sotilardi.
 * `import-catalog` mavjud sarlavhani tashlab ketadi, ya'ni qayta import
 * bu xatoni tuzatmaydi — shuning uchun alohida skript.
 *
 * Mahsulot do'kon ichida ESKI sarlavha bo'yicha topiladi. Topilmasa
 * (allaqachon tuzatilgan) — tashlab ketiladi, ya'ni qayta ishga tushirish
 * xavfsiz.
 *
 * ⚠️ `updateProduct` ISHLATILADI: kategoriya o'zgarsa `slot` ham
 * ko'chiriladi va status o'zgarmaydi — panel tahrirlaganidek.
 *
 * Ishga tushirish (VPS'da, prod .env bilan, apps/api ichidan):
 *
 *   npm run fix:catalog -- --file=scripts/data/catalog-demo-fixes.json --owner-phone=+998...           # quruq yurish
 *   npm run fix:catalog -- --file=scripts/data/catalog-demo-fixes.json --owner-phone=+998... --apply   # yozadi
 */

import { readFileSync } from 'node:fs';

import type { UpdateProductInput } from '@looksave/validation';

import { pool } from '../src/db/pool';
import { updateProduct } from '../src/store/products';

interface Fix {
  oldTitle: string;
  title?: string;
  description?: string;
  categorySlug?: string;
  tags?: string[];
  colorHex?: string;
  colorName?: Record<string, string>;
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  const file = arg('file');
  const ownerPhone = arg('owner-phone');
  if (!file) throw new Error('--file=<fayl> kerak');
  if (!ownerPhone) throw new Error('--owner-phone=<+998...> kerak');

  const { fixes } = JSON.parse(readFileSync(file, 'utf8')) as { fixes: Fix[] };

  const storeRes = await pool.query<{ id: string; name: string }>(
    `SELECT s.id, s.name FROM stores s
       JOIN users u ON u.id = s.owner_id
      WHERE u.phone = $1
      ORDER BY s.created_at LIMIT 1`,
    [ownerPhone],
  );
  const store = storeRes.rows[0];
  if (!store) throw new Error(`${ownerPhone} egasiga tegishli do'kon topilmadi`);
  console.log(`🏬 Do'kon: ${store.name} (${store.id})\n`);

  const cats = await pool.query<{ id: string; slug: string }>(
    `SELECT id, slug FROM categories WHERE is_active`,
  );
  const catBySlug = new Map(cats.rows.map((r) => [r.slug, r.id]));

  let fixed = 0;
  let skipped = 0;

  for (const fix of fixes) {
    const found = await pool.query<{ id: string }>(
      `SELECT id FROM products WHERE store_id = $1 AND lower(title) = lower($2)`,
      [store.id, fix.oldTitle],
    );
    if (found.rows.length !== 1) {
      console.log(
        `   ⏭  "${fix.oldTitle}" — ${found.rows.length === 0 ? 'topilmadi (tuzatilganmi?)' : `${found.rows.length} ta, noaniq`}`,
      );
      skipped += 1;
      continue;
    }
    const productId = found.rows[0]!.id;

    const input: UpdateProductInput = {};
    if (fix.title) input.title = fix.title;
    if (fix.description) input.description = fix.description;
    if (fix.tags) input.tags = fix.tags;
    if (fix.categorySlug) {
      const categoryId = catBySlug.get(fix.categorySlug);
      if (!categoryId) throw new Error(`"${fix.categorySlug}" kategoriyasi yo'q`);
      input.categoryId = categoryId;
    }

    const changes = [
      fix.title ? `→ "${fix.title}"` : null,
      fix.categorySlug ? `[${fix.categorySlug}]` : null,
      fix.colorName ? `rang: ${fix.colorName['uz']}` : null,
      fix.description ? 'tavsif' : null,
    ].filter(Boolean);
    console.log(`   ${APPLY ? '✎' : '·'} "${fix.oldTitle}" ${changes.join(', ')}`);

    if (APPLY) {
      if (Object.keys(input).length > 0) await updateProduct(store.id, productId, input);
      if (fix.colorHex || fix.colorName) {
        // Demo mahsulotlarda bitta variant — hammasiga qo'llanadi
        await pool.query(
          `UPDATE product_variants
              SET color_hex = COALESCE($2, color_hex),
                  color_name = COALESCE($3::jsonb, color_name)
            WHERE product_id = $1`,
          [productId, fix.colorHex ?? null, fix.colorName ? JSON.stringify(fix.colorName) : null],
        );
      }
      fixed += 1;
    }
  }

  console.log(
    `\n${APPLY ? '✅ Tuzatildi' : '🔎 Quruq yurish'}: ${fixed} tuzatildi, ${skipped} tashlab ketildi`,
  );
  if (!APPLY) console.log('\nYozish uchun --apply qo`shing.');
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('❌', err instanceof Error ? err.message : err);
    void pool.end();
    process.exitCode = 1;
  });
