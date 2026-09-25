import { z } from 'zod';

import { usernameSchema } from './username';

import { cursorSchema, moneyAmountSchema, uuidSchema } from './common';

/** Rang nomi — kamida bitta tilda (07-web-panels: mahsulot formasi). */
export const localizedNameSchema = z
  .object({
    uz: z.string().trim().min(1).max(60).optional(),
    ru: z.string().trim().min(1).max(60).optional(),
    en: z.string().trim().min(1).max(60).optional(),
    ar: z.string().trim().min(1).max(60).optional(),
  })
  .refine((value) => Object.values(value).some((name) => name !== undefined), {
    message: 'Kamida bitta tilda nom kerak',
  });

export const imageUrlSchema = z.string().url().max(500);

export const sizeStockSchema = z.object({
  size: z.string().trim().min(1).max(10),
  stock: z.number().int().min(0).max(100_000),
});

export const variantInputSchema = z.object({
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Rang formati: #1a1a1a')
    .optional(),
  colorName: localizedNameSchema.optional(),
  images: z.array(imageUrlSchema).max(10).default([]),
  priceDelta: moneyAmountSchema.default('0.00'),
  sizes: z.array(sizeStockSchema).min(1).max(30),
});

/**
 * `status` faqat `draft` yoki `pending` bo'lishi mumkin.
 * `active` ga o'tkazish — admin moderatsiyasi orqali (07-web-panels §5.1),
 * do'kon o'zi mahsulotni nashr qila olmaydi.
 */
export const productStatusSchema = z.enum(['draft', 'pending']);

export const createProductSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(2000).optional(),
    categoryId: uuidSchema,
    brandId: uuidSchema.optional(),
    gender: z.enum(['male', 'female', 'unisex']),
    basePrice: moneyAmountSchema,
    oldPrice: moneyAmountSchema.optional(),
    images: z.array(imageUrlSchema).max(10).default([]),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
    isLimited: z.boolean().default(false),
    status: productStatusSchema.default('draft'),
    variants: z.array(variantInputSchema).min(1).max(20),
  })
  .refine(
    (value) => value.oldPrice === undefined || Number(value.oldPrice) > Number(value.basePrice),
    {
      path: ['oldPrice'],
      message: 'Eski narx joriy narxdan katta bo`lishi kerak',
    },
  )
  // Moderatsiyaga yuborishda kamida 3 rasm (07-web-panels: mahsulot formasi)
  .refine((value) => value.status === 'draft' || value.images.length >= 3, {
    path: ['images'],
    message: 'Nashr qilish uchun kamida 3 ta rasm kerak',
  });

export const updateProductSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    categoryId: uuidSchema.optional(),
    brandId: uuidSchema.nullable().optional(),
    gender: z.enum(['male', 'female', 'unisex']).optional(),
    basePrice: moneyAmountSchema.optional(),
    oldPrice: moneyAmountSchema.nullable().optional(),
    images: z.array(imageUrlSchema).max(10).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
    isLimited: z.boolean().optional(),
    status: productStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'O`zgartirish uchun maydon yo`q' });

export const stockUpdateSchema = z.object({
  sizes: z.array(sizeStockSchema).min(1).max(30),
});

export const storeProductsQuerySchema = z.object({
  status: z.enum(['draft', 'pending', 'active', 'archived', 'rejected', 'all']).default('all'),
  category: z.string().min(1).max(64).optional(),
  q: z.string().trim().min(2).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: cursorSchema.optional(),
});

/**
 * ── KIYIM USLUBLARI ───────────────────────────────────────────────────
 *
 * Uslub `products.tags` massivida SLUG bo'lib saqlanadi. Ko'rinadigan
 * nom ilovada tarjima qilinadi — bazada tarjima saqlanmaydi, aks holda
 * til qo'shilganda eski yozuvlar eskirib qolardi.
 *
 * ⚠️ RO'YXAT SHU YERDA, uchta joy undan o'qiydi: sotuvchi formasi
 * (tanlash), server (filtr) va kiyintirish ekrani (chiplar). Ilgari
 * kiyintirishda beshta chip bor edi, lekin ular hech narsani
 * filtrlamasdi — mahsulotda uslub belgisi umuman yo'q edi va chiplar
 * faqat xotiraga yozardi. Shuning uchun ular olib tashlangan edi.
 *
 * ⚠️ `tags` DA BOSHQA NARSA HAM BO'LISHI MUMKIN. Massiv erkin: do'kon
 * o'z belgilarini qo'shishi mumkin. Filtr shuning uchun kesishma bilan
 * ishlaydi, tenglik bilan emas.
 */
export const GARMENT_STYLES = ['casual', 'sport', 'streetwear', 'classic', 'minimal'] as const;

export type GarmentStyle = (typeof GARMENT_STYLES)[number];

export function isGarmentStyle(value: string): value is GarmentStyle {
  return (GARMENT_STYLES as readonly string[]).includes(value);
}

/**
 * ── KIYIM RASMLARINING TARTIBI ─────────────────────────────────────────
 *
 * `images` massivining dastlabki UCH o'rni MA'NOGA EGA:
 *
 *     images[0] — old tomon    images[1] — orqa tomon    images[2] — yon tomon
 *
 * ⚠️ NEGA TARTIB, ALOHIDA USTUN EMAS. Massiv allaqachon bor va uning
 * nol-elementi hamma joyda "asosiy surat" sifatida o'qiladi (katalog,
 * karta, tasma — API'da 7, mobil'da 3 joy). Yangi ustun qo'shilsa o'sha
 * o'nta joyni ham qayta yozish kerak bo'lardi; tartib esa mavjud
 * ma'noni buzmaydi — nol-element old tomon bo'lib qolaveradi.
 *
 * ⚠️ NEGA MUHIM. AI kiyintirish burchak bo'yicha ishlaydi: odam yon
 * tomonga burilsa, modelga ham kiyimning YON surati berilishi kerak.
 * Old suratdan yon ko'rinish yasalganda mato va kesim o'ylab topiladi.
 *
 * Tartibni forma ta'minlaydi (`seller/product-new.tsx` — uchta alohida
 * uyacha). Bu yerdagi yordamchi esa indekslar kod bo'ylab sochilib
 * ketmasligi uchun: o'qish faqat shu funksiya orqali.
 */
export const GARMENT_ANGLE_ORDER = ['front', 'back', 'side'] as const;

export type GarmentAngle = (typeof GARMENT_ANGLE_ORDER)[number];

/**
 * Berilgan burchak uchun kiyim suratini qaytaradi.
 *
 * Sotuvchi faqat old tomonni qo'ygan bo'lsa — hamma burchak uchun o'sha
 * qaytadi: kiyintirish umuman ishlamagandan ko'ra, aniqligi past bo'lsa
 * ham natija bo'lgani yaxshi.
 */
export function garmentImageForAngle(
  images: readonly string[],
  angle: GarmentAngle,
): string | null {
  const index = GARMENT_ANGLE_ORDER.indexOf(angle);
  return images[index] ?? images[0] ?? null;
}

/** Rasm yuklash uchun imzolangan havola (09-integrations §4.2). */
export const presignSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
  /*
   * `body` — AI kiyintirish uchun to'liq bo'yli surat.
   *
   * ⚠️ Bu SHAXSIY ma'lumot: odamning butun gavdasi. Shuning uchun u
   * `face` bilan bir xil qoidada saqlanadi — keshi `private` va qisqa.
   * `avatar` (oddiy profil rasmi) esa ochiq, chunki uni foydalanuvchi
   * o'zi ko'rsatish uchun qo'yadi.
   */
  purpose: z.enum(['product', 'store', 'brand', 'face', 'avatar', 'body']),
});

export type CreateProductInput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.output<typeof updateProductSchema>;
export type VariantInput = z.output<typeof variantInputSchema>;
export type StoreProductsQuery = z.output<typeof storeProductsQuerySchema>;
/**
 * Profil marshruti uchun — FAQAT shaxsiy maqsadlar.
 *
 * ⚠️ NEGA ALOHIDA SXEMA. Ilgari marshrut `presignSchema` ni qabul qilib,
 * keyin `purpose` ni `'avatar'` ga MAJBURAN almashtirardi. Maqsad to'g'ri
 * edi (oddiy foydalanuvchi `product` yuklamasin), lekin oqibati yomon:
 * mobil ilova `body` yuborardi va u ham `avatar` bo'lib ketardi. Natijada
 * `face` va `body` uchun yozilgan `private` kesh qoidasi HECH QACHON
 * ishlamagan — yuz va gavda surati `public, immutable` bilan saqlanardi
 * (12-tz.md D-43).
 *
 * Yechim: almashtirish emas, CHEGARALASH. Ro'yxatda `product` va `store`
 * yo'q, ya'ni himoya saqlanadi va mijozning tanlovi hisobga olinadi.
 */
export const profilePresignSchema = presignSchema.extend({
  purpose: z.enum(['avatar', 'face', 'body']),
});

/**
 * Admin panel uchun — FAQAT brend logotipi.
 *
 * ⚠️ `profilePresignSchema` bilan bir xil sabab: ro'yxatni CHEGARALASH,
 * `purpose` ni majburan almashtirish EMAS. Admin `face` yoki `body`
 * yuklay olmasligi kerak — ular shaxsiy va `private` bucketga tushadi.
 */
export const adminPresignSchema = presignSchema.extend({
  purpose: z.literal('brand'),
});

export type PresignInput = z.output<typeof presignSchema>;
export type AdminPresignInput = z.output<typeof adminPresignSchema>;
export type ProfilePresignInput = z.output<typeof profilePresignSchema>;


/**
 * Sotuvchi o'z brandi (03-api-spec: store brand). Har sotuvchida bitta
 * brand: nomi, @username (majburiy), logotip va tavsif. Brandlar bo'limida
 * shu username bilan ko'rinadi.
 */
export const storeBrandSchema = z.object({
  name: z.string().trim().min(2, 'Nomi kamida 2 belgi').max(64),
  username: usernameSchema,
  logoUrl: z.string().url('Havola noto`g`ri').max(500).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export type StoreBrandInput = z.output<typeof storeBrandSchema>;
