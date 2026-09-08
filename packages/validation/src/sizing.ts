/**
 * O'lchov to'plami — `measurementsSchema` (`auth.ts`) qaytaradigan shakl.
 *
 * ⚠️ ILOVANING TIPIDAN IMPORT QILINMAYDI. Modul ikkala ilovaga ham
 * kerak, paket esa ularga bog'lanmasligi kerak — aks holda bog'liqlik
 * teskari yo'nalishga ketardi.
 */
export interface BodyMeasurements {
  height?: number | null;
  weight?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  shoeSize?: number | null;
}

/**
 * O'lchamdan kiyim razmerini taxmin qilish.
 *
 * ⚠️ NEGA UMUMIY PAKETDA. Uni uch tomon ishlatadi: mobil ilova
 * (tavsiya), saytning BFF `loader` i (ro'yxatni FILTRLAYDI) va shu
 * filtr natijasini ko'rsatadigan sahifa. Jadval ular orasida ajralib
 * ketsa, foydalanuvchiga «sizga M» deb yozilib, ro'yxatga L lar
 * kelardi.
 *
 * NEGA KERAK: foydalanuvchi o'z bo'yi/ko'kragini kiritgan, lekin kiyim
 * ro'yxatida "S, M, L" turadi — ikkisini bog'lamasak o'lcham kiritishning
 * ma'nosi qolmaydi. Bu funksiya ularni bog'laydi.
 *
 * ⚠️ BU TAXMIN, O'LCHOV EMAS. Jadval xalqaro unisex o'rtachasiga tayanadi
 * (ko'krak/bel aylanasi, sm). Har brendning o'z jadvali bor va u ustun
 * turadi — shuning uchun ekranda "taxminiy" deb ko'rsatiladi va yakuniy
 * o'lcham mahsulot sahifasida tanlanadi.
 *
 * ⚠️ Chegaralar `packages/validation/src/auth.ts` dagi ruxsat etilgan
 * oraliqlar ichida: ko'krak 50–180, bel 40–180.
 */

export type SizeLabel = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

/** Ko'krak aylanasi (sm) → ustki kiyim razmeri. Chegara — "shu qiymatgacha". */
const TOP_BY_CHEST: Array<{ upTo: number; size: SizeLabel }> = [
  { upTo: 87, size: 'XS' },
  { upTo: 95, size: 'S' },
  { upTo: 103, size: 'M' },
  { upTo: 111, size: 'L' },
  { upTo: 119, size: 'XL' },
  { upTo: Infinity, size: 'XXL' },
];

/** Bel aylanasi (sm) → pastki kiyim razmeri */
const BOTTOM_BY_WAIST: Array<{ upTo: number; size: SizeLabel }> = [
  { upTo: 71, size: 'XS' },
  { upTo: 79, size: 'S' },
  { upTo: 87, size: 'M' },
  { upTo: 95, size: 'L' },
  { upTo: 103, size: 'XL' },
  { upTo: Infinity, size: 'XXL' },
];

function pick(table: Array<{ upTo: number; size: SizeLabel }>, value: number): SizeLabel {
  for (const row of table) {
    if (value <= row.upTo) return row.size;
  }
  // Jadval `Infinity` bilan tugagani uchun bu yerga yetib bo'lmaydi
  return 'XXL';
}

/**
 * Slot uchun tavsiya. Qaytgan qiymat ko'rsatish uchun tayyor matn:
 * kiyimlarda razmer harfi, oyoq kiyimida EU raqami.
 *
 * `null` — kerakli o'lcham kiritilmagan, ekran buni "o'lchamni kiriting"
 * deb ko'rsatishi kerak.
 */
export function recommendSize(slot: string, measurements: BodyMeasurements): string | null {
  switch (slot) {
    case 'top':
    case 'outer':
      return typeof measurements.chest === 'number' ? pick(TOP_BY_CHEST, measurements.chest) : null;

    case 'bottom':
      return typeof measurements.waist === 'number'
        ? pick(BOTTOM_BY_WAIST, measurements.waist)
        : null;

    case 'feet':
      return typeof measurements.shoeSize === 'number' ? `EU ${measurements.shoeSize}` : null;

    // Bosh kiyimi, soat, sumka — razmeri odatda yagona
    default:
      return null;
  }
}

/** Tavsiya berish uchun qaysi o'lcham yetishmayotganini aytadi */
export function missingMeasurementFor(slot: string): string | null {
  switch (slot) {
    case 'top':
    case 'outer':
      return "Ko'krak";
    case 'bottom':
      return 'Bel';
    case 'feet':
      return "Oyoq o'lchami";
    default:
      return null;
  }
}
