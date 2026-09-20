/**
 * import-catalog.ts — `export-catalog.ts` chiqargan JSON'ni PROD'ga yozadi.
 *
 * NIMA QILADI:
 *   1. Brendlarni slug bo'yicha yangilaydi — asosan LOGOTIP (logo_url).
 *   2. JSON'dagi do'konni prod'da slug/nom bo'yicha topadi.
 *   3. Har mahsulotni `createProduct` orqali qo'shadi (slot, valyuta,
 *      variant_stock — hammasi panel yaratganidek to'g'ri chiqadi).
 *
 * ⚠️ `createProduct` ISHLATILADI, SQL EMAS. To'g'ridan-to'g'ri INSERT
 * `slot`ni kategoriyadan ko'chirishni, `variant_stock`ni va tekshiruvlarni
 * chetlab o'tardi — seed prod paneli yaratganidan boshqacha bo'lib qolardi.
 *
 * ⚠️ TAKROR YOZMAYDI. Do'konda xuddi shu SARLAVHALI mahsulot bo'lsa,
 * u tashlab ketiladi — skriptni qayta ishga tushirish xavfsiz.
 *
 * Ishga tushirish (VPS'da, prod .env bilan, apps/api ichidan):
 *
 *   npm run import:catalog --workspace=apps/api -- --file=catalog.json          # quruq yurish
 *   npm run import:catalog --workspace=apps/api -- --file=catalog.json --apply  # yozadi
 *
 * Bayroqlar:
 *   --file=<fayl>   kirish JSON (majburiy)
 *   --apply         haqiqatan yozadi (aks holda faqat rejani ko'rsatadi)
 *   --store=<slug>  JSON'dagi do'kon o'rniga prod'da boshqa do'konga yozish
 */

import { readFileSync } from 'node:fs';

import type { CreateProductInput } from '@looksave/validation';

import { pool } from '../src/db/pool';
import { createProduct } from '../src/store/products';

interface CatalogFile {
  store: { slug: string; name: string; currency: string };
  brands: Array<{
    slug: string;
    name: string;
    logoUrl: string | null;
    isPartner: boolean;
    sortOrder: number;
    description: string | null;
  }>;
  products: Array<{
    title: string;
    description: string | null;
    categorySlug: string;
    brandSlug: string | null;
    gender: string;
    basePrice: string;
    oldPrice: string | null;
    images: string[];
    tags: string[];
    isLimited: boolean;
    variants: Array<{
      colorHex: string | null;
      colorName: unknown;
      images: string[];
      priceDelta: string;
      sizes: Array<{ size: string; stock: number }>;
    }>;
  }>;
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  const file = arg('file');
  if (!file) throw new Error('--file=<fayl> kerak');

  const data = JSON.parse(readFileSync(file, 'utf8')) as CatalogFile;

  // ── Do'kon ──
  const storeSlug = arg('store') ?? data.store.slug;
  const storeRes = await pool.query<{ id: string; name: string; status: string }>(
    `SELECT id, name, status FROM stores
      WHERE slug = $1 OR name ILIKE '%' || $2 || '%'
      ORDER BY (slug = $1) DESC LIMIT 1`,
    [storeSlug, data.store.name],
  );
  const store = storeRes.rows[0];
  if (!store) throw new Error(`Prod'da "${storeSlug}" do'koni topilmadi — avval do'konni yarating`);
  if (store.status !== 'active') {
    throw new Error(`"${store.name}" do'koni faol emas (${store.status}) — createProduct faol do'kon talab qiladi`);
  }
  console.log(`🏬 Do'kon: ${store.name} (${store.id})`);

  // ── Brendlar (logotip) ──
  console.log(`\n🏷  Brendlar: ${data.brands.length}`);
  for (const b of data.brands) {
    console.log(`   ${b.slug.padEnd(14)} logo:${b.logoUrl ? 'bor' : 'yo`q'}`);
    if (APPLY) {
      await pool.query(
        `INSERT INTO brands (name, slug, logo_url, is_partner, sort_order, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE
           SET logo_url = EXCLUDED.logo_url,
               is_partner = EXCLUDED.is_partner,
               sort_order = EXCLUDED.sort_order,
               description = COALESCE(EXCLUDED.description, brands.description)`,
        [b.name, b.slug, b.logoUrl, b.isPartner, b.sortOrder, b.description],
      );
    }
  }

  // ── Prod xaritalari: kategoriya slug→id, brend slug→id, mavjud sarlavhalar ──
  const cats = await pool.query<{ id: string; slug: string }>(
    `SELECT id, slug FROM categories WHERE is_active`,
  );
  const catBySlug = new Map(cats.rows.map((r) => [r.slug, r.id]));

  const brandRows = await pool.query<{ id: string; slug: string }>(`SELECT id, slug FROM brands`);
  const brandBySlug = new Map(brandRows.rows.map((r) => [r.slug, r.id]));

  const existing = await pool.query<{ title: string }>(
    `SELECT title FROM products WHERE store_id = $1`,
    [store.id],
  );
  const haveTitles = new Set(existing.rows.map((r) => r.title.toLowerCase()));

  // ── Mahsulotlar ──
  console.log(`\n📦 Mahsulotlar: ${data.products.length}`);
  let added = 0;
  let skipped = 0;
  const missingCats = new Set<string>();

  for (const p of data.products) {
    if (haveTitles.has(p.title.toLowerCase())) {
      console.log(`   ⏭  "${p.title}" — allaqachon bor`);
      skipped += 1;
      continue;
    }
    const categoryId = catBySlug.get(p.categorySlug);
    if (!categoryId) {
      missingCats.add(p.categorySlug);
      console.log(`   ⚠  "${p.title}" — "${p.categorySlug}" kategoriyasi prod'da yo'q, tashlab ketildi`);
      skipped += 1;
      continue;
    }
    const brandId = p.brandSlug ? brandBySlug.get(p.brandSlug) : undefined;

    const input: CreateProductInput = {
      title: p.title,
      description: p.description ?? undefined,
      categoryId,
      brandId: brandId ?? undefined,
      gender: p.gender as CreateProductInput['gender'],
      basePrice: p.basePrice,
      oldPrice: p.oldPrice ?? undefined,
      images: p.images,
      tags: p.tags,
      isLimited: p.isLimited,
      status: 'pending', // createProduct uni darhol 'active' qiladi
      variants: p.variants.map((v) => ({
        colorHex: v.colorHex ?? undefined,
        colorName: (v.colorName as CreateProductInput['variants'][number]['colorName']) ?? undefined,
        images: v.images,
        priceDelta: v.priceDelta,
        sizes: v.sizes,
      })),
    };

    console.log(`   ${APPLY ? '＋' : '·'} "${p.title}" [${p.categorySlug}] ${p.variants.length} variant`);
    if (APPLY) {
      await createProduct(store.id, input);
      added += 1;
    }
  }

  console.log(`\n${APPLY ? '✅ Yozildi' : '🔎 Quruq yurish'}: +${added} qo'shildi, ${skipped} tashlab ketildi`);
  if (missingCats.size > 0) {
    console.log(`⚠  Prod'da yo'q kategoriyalar: ${[...missingCats].join(', ')}`);
  }
  if (!APPLY) console.log('\nYozish uchun --apply qo`shing.');
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('❌', err instanceof Error ? err.message : err);
    void pool.end();
    process.exitCode = 1;
  });
