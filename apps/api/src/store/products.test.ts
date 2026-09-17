import {
  GARMENT_STYLES,
  createProductSchema,
  garmentImageForAngle,
  isGarmentStyle,
  presignSchema,
  stockUpdateSchema,
  updateProductSchema,
  variantInputSchema,
} from '@looksave/validation';
import { describe, expect, it } from 'vitest';

const CAT = '11111111-1111-1111-1111-111111111111';

function product(over: Record<string, unknown> = {}) {
  return {
    title: 'Puma Suede Classic',
    categoryId: CAT,
    gender: 'unisex',
    basePrice: '890000.00',
    variants: [{ sizes: [{ size: '41', stock: 3 }] }],
    ...over,
  };
}

describe('mahsulot sxemasi', () => {
  it('qoralama rasm talab qilmaydi', () => {
    expect(createProductSchema.safeParse(product()).success).toBe(true);
  });

  it('nashr qilishda kamida 3 rasm kerak', () => {
    const two = product({
      status: 'pending',
      images: ['https://cdn.looksave.app/a.webp', 'https://cdn.looksave.app/b.webp'],
    });
    expect(createProductSchema.safeParse(two).success).toBe(false);

    const three = product({
      status: 'pending',
      images: [
        'https://cdn.looksave.app/a.webp',
        'https://cdn.looksave.app/b.webp',
        'https://cdn.looksave.app/c.webp',
      ],
    });
    expect(createProductSchema.safeParse(three).success).toBe(true);
  });

  it('do`kon `active` statusini bera olmaydi — moderatsiya orqali', () => {
    expect(createProductSchema.safeParse(product({ status: 'active' })).success).toBe(false);
    expect(updateProductSchema.safeParse({ status: 'active' }).success).toBe(false);
    expect(updateProductSchema.safeParse({ status: 'pending' }).success).toBe(true);
  });

  it('eski narx joriysidan katta bo`lishi kerak', () => {
    expect(createProductSchema.safeParse(product({ oldPrice: '500000.00' })).success).toBe(false);
    expect(createProductSchema.safeParse(product({ oldPrice: '1100000.00' })).success).toBe(true);
  });

  it('narx float bo`lmaydi', () => {
    expect(createProductSchema.safeParse(product({ basePrice: '890000.5' })).success).toBe(false);
    expect(createProductSchema.safeParse(product({ basePrice: 890000 })).success).toBe(false);
  });

  it('kamida bitta variant kerak', () => {
    expect(createProductSchema.safeParse(product({ variants: [] })).success).toBe(false);
  });

  it('variantda kamida bitta o`lcham kerak', () => {
    expect(variantInputSchema.safeParse({ sizes: [] }).success).toBe(false);
  });

  it('rang formati tekshiriladi', () => {
    expect(
      variantInputSchema.safeParse({ colorHex: 'qora', sizes: [{ size: 'M', stock: 1 }] }).success,
    ).toBe(false);
    expect(
      variantInputSchema.safeParse({ colorHex: '#1a1a1a', sizes: [{ size: 'M', stock: 1 }] })
        .success,
    ).toBe(true);
  });

  it('bo`sh PATCH rad etiladi', () => {
    expect(updateProductSchema.safeParse({}).success).toBe(false);
  });

  it('manfiy ombor rad etiladi', () => {
    expect(stockUpdateSchema.safeParse({ sizes: [{ size: 'M', stock: -1 }] }).success).toBe(false);
  });
});

describe('presign sxemasi', () => {
  it('faqat rasm turlari', () => {
    expect(
      presignSchema.safeParse({ fileName: 'a.webp', contentType: 'image/webp', purpose: 'product' })
        .success,
    ).toBe(true);
    expect(
      presignSchema.safeParse({
        fileName: 'a.php',
        contentType: 'application/php',
        purpose: 'product',
      }).success,
    ).toBe(false);
  });
});

/*
 * ── Rasm burchaklari ──
 *
 * Sotuvchi uchta rasm yuklaydi: old, orqa, yon. Ular ALOHIDA USTUNDA
 * EMAS, `images` massivining tartibida saqlanadi. Sabab: `images[0]`
 * ettita API va uchta mobil joyda «asosiy rasm» sifatida o'qiladi —
 * yangi ustun qo'shsak, o'shalarning hammasi o'zgarishi kerak edi.
 *
 * Shuning uchun tartib KELISHUV bo'lib qoldi va uni test ushlab turadi:
 * buzilsa, AI ga noto'g'ri burchakdagi rasm ketadi va kiyim orqa-oldini
 * almashtirib chiziladi.
 */
describe('garmentImageForAngle', () => {
  const three = ['old.jpg', 'orqa.jpg', 'yon.jpg'];

  it('har bir burchak o`z rasmini oladi', () => {
    expect(garmentImageForAngle(three, 'front')).toBe('old.jpg');
    expect(garmentImageForAngle(three, 'back')).toBe('orqa.jpg');
    expect(garmentImageForAngle(three, 'side')).toBe('yon.jpg');
  });

  /*
   * Eski mahsulotlarda bitta rasm bor. Ular AI dan TUSHIB QOLMASLIGI
   * kerak — yo'q burchak oldingi rasmga qaytadi.
   */
  it('rasm yetmasa oldingisiga qaytadi', () => {
    expect(garmentImageForAngle(['bitta.jpg'], 'back')).toBe('bitta.jpg');
    expect(garmentImageForAngle(['bitta.jpg'], 'side')).toBe('bitta.jpg');
    expect(garmentImageForAngle(['old.jpg', 'orqa.jpg'], 'side')).toBe('old.jpg');
  });

  it('rasm umuman bo`lmasa null', () => {
    expect(garmentImageForAngle([], 'front')).toBeNull();
  });
});

/*
 * ── Uslub ──
 *
 * Slug `products.tags` da saqlanadi va kiyintirish so'rovida filtr
 * bo'lib ishlaydi. Ro'yxat uch joyda takrorlanadi (sotuvchi formasi,
 * kiyintirish chiplari, so'rov sxemasi) — shuning uchun manba bitta.
 */
describe('GARMENT_STYLES', () => {
  it('faqat ro`yxatdagi slugni tanidi', () => {
    expect(isGarmentStyle('casual')).toBe(true);
    expect(isGarmentStyle('streetwear')).toBe(true);
    expect(isGarmentStyle('Casual')).toBe(false);
    expect(isGarmentStyle('')).toBe(false);
    expect(isGarmentStyle('smart-casual')).toBe(false);
  });

  it('takrorlanmaydi', () => {
    expect(new Set(GARMENT_STYLES).size).toBe(GARMENT_STYLES.length);
  });
});
