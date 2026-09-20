/**
 * export-catalog.ts — bitta do'kon katalogini KO'CHIRILADIGAN JSON'ga chiqaradi.
 *
 * MAQSAD. LAN dev bazangizda tayyor katalog bor (logotipli brendlar,
 * Chilonzor do'koni, mahsulotlar) — lekin production bazasi bo'sh. Bu
 * skript o'sha katalogni bir faylga yig'adi, `import-catalog.ts` esa uni
 * prod'ga yozadi.
 *
 * ⚠️ RASM KO'CHIRILMAYDI, HAVOLA KO'CHIRILADI. Mahsulot va logo rasmlari
 * R2'da turadi va URL bilan yoziladi. LAN dev bilan prod BIR XIL R2
 * bucketdan foydalangani uchun havolalar ikkala tomonda ham ishlaydi —
 * fayllarni qayta yuklash shart emas.
 *
 * ⚠️ ID EMAS, SLUG KO'CHIRILADI. Brend va kategoriya id'lari ikki bazada
 * har xil. Shuning uchun ular SLUG bilan chiqariladi — import ularni
 * prod'dagi id'ga bog'laydi.
 *
 * Ishga tushirish (LAN dev mashinasida, apps/api ichidan):
 *
 *   npm run export:catalog --workspace=apps/api
 *   npm run export:catalog --workspace=apps/api -- --store=chilonzor --out=catalog.json
 *
 * Bayroqlar:
 *   --store=<slug|nom>   qaysi do'kon (standart: nomi 'chilonzor' ni o'z ichiga olgani)
 *   --out=<fayl>         chiqish fayli (standart: catalog-export.json)
 */

import { writeFileSync } from 'node:fs';

import { pool } from '../src/db/pool';

interface SizeStock {
  size: string;
  stock: number;
}
interface VariantOut {
  colorHex: string | null;
  colorName: unknown;
  images: string[];
  priceDelta: string;
  sizes: SizeStock[];
}
interface ProductOut {
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
  variants: VariantOut[];
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function main(): Promise<void> {
  const storeQuery = arg('store') ?? 'chilonzor';
  const outFile = arg('out') ?? 'catalog-export.json';

  // Do'kon — slug bo'yicha aniq, bo'lmasa nomi bo'yicha taxminan
  const storeRes = await pool.query<{
    id: string;
    slug: string;
    name: string;
    currency: string;
  }>(
    `SELECT id, slug, name, currency FROM stores
      WHERE slug = $1 OR name ILIKE '%' || $1 || '%'
      ORDER BY (slug = $1) DESC
      LIMIT 1`,
    [storeQuery],
  );
  const store = storeRes.rows[0];
  if (!store) {
    throw new Error(`"${storeQuery}" bo'yicha do'kon topilmadi`);
  }

  // Barcha brendlar — logotiplari bilan (prod'da faqat logo yangilanadi)
  const brands = await pool.query<{
    slug: string;
    name: string;
    logo_url: string | null;
    is_partner: boolean;
    sort_order: number;
    description: string | null;
  }>(
    `SELECT slug, name, logo_url, is_partner, sort_order, description
       FROM brands ORDER BY sort_order, name`,
  );

  // Do'konning faol mahsulotlari
  const products = await pool.query<{
    id: string;
    title: string;
    description: string | null;
    category_slug: string;
    brand_slug: string | null;
    gender: string;
    base_price: string;
    old_price: string | null;
    images: string[];
    tags: string[];
    is_limited: boolean;
  }>(
    `SELECT p.id, p.title, p.description,
            c.slug AS category_slug, b.slug AS brand_slug,
            p.gender, p.base_price::text, p.old_price::text,
            p.images, p.tags, p.is_limited
       FROM products p
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.store_id = $1 AND p.status = 'active'
      ORDER BY p.created_at`,
    [store.id],
  );

  const productsOut: ProductOut[] = [];
  let skipped = 0;

  for (const p of products.rows) {
    const variantsRes = await pool.query<{
      id: string;
      color_hex: string | null;
      color_name: unknown;
      images: string[];
      price_delta: string;
    }>(
      `SELECT id, color_hex, color_name, images, price_delta::text
         FROM product_variants
        WHERE product_id = $1 AND is_active
        ORDER BY sort_order, id`,
      [p.id],
    );

    const variants: VariantOut[] = [];
    for (const v of variantsRes.rows) {
      const stockRes = await pool.query<{ size: string; stock: number }>(
        `SELECT size, stock FROM variant_stock WHERE variant_id = $1 ORDER BY size`,
        [v.id],
      );
      const sizes = stockRes.rows.filter((row) => row.stock > 0);
      if (sizes.length === 0) continue; // sotib bo'lmaydigan variant kerak emas
      variants.push({
        colorHex: v.color_hex,
        colorName: v.color_name,
        images: v.images ?? [],
        priceDelta: v.price_delta ?? '0.00',
        sizes,
      });
    }

    if (variants.length === 0) {
      skipped += 1;
      continue;
    }

    /*
     * ⚠️ RASM KAMIDA UCHTA BO'LISHI SHART (createProduct qoidasi: nashr
     * uchun ≥3 rasm). Kam bo'lsa oxirgisini takrorlaymiz — demo katalog
     * ko'rinsin; sifatli rasm keyin panelda almashtiriladi.
     */
    const images = [...(p.images ?? [])];
    while (images.length > 0 && images.length < 3) images.push(images[images.length - 1]!);
    if (images.length === 0) {
      skipped += 1;
      continue; // rasmsiz mahsulotni AI kiyintira olmaydi
    }

    productsOut.push({
      title: p.title,
      description: p.description,
      categorySlug: p.category_slug,
      brandSlug: p.brand_slug,
      gender: p.gender,
      basePrice: p.base_price,
      oldPrice: p.old_price,
      images,
      tags: p.tags ?? [],
      isLimited: p.is_limited,
      variants,
    });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    store: { slug: store.slug, name: store.name, currency: store.currency },
    brands: brands.rows.map((b) => ({
      slug: b.slug,
      name: b.name,
      logoUrl: b.logo_url,
      isPartner: b.is_partner,
      sortOrder: b.sort_order,
      description: b.description,
    })),
    products: productsOut,
  };

  writeFileSync(outFile, JSON.stringify(payload, null, 2));
  console.log(`✅ ${store.name} (${store.slug}) — chiqarildi: ${outFile}`);
  console.log(`   brendlar: ${payload.brands.length}`);
  console.log(`   mahsulotlar: ${productsOut.length}${skipped ? ` (${skipped} tashlab ketildi — rasm/zaxira yo'q)` : ''}`);
  console.log('\nFaylni VPS ga ko`chiring va o`sha yerda import qiling.');
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('❌', err instanceof Error ? err.message : err);
    void pool.end();
    process.exitCode = 1;
  });
