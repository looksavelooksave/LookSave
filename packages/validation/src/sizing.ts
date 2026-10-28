/**
 * O'lchov to'plami — `measurementsSchema` (`auth.ts`) qaytaradigan shakl.
 *
 * ⚠️ ILOVANING TIPIDAN IMPORT QILINMAYDI. Modul ikkala ilovaga ham
 * kerak, paket esa ularga bog'lanmasligi kerak — aks holda bog'liqlik
 * teskari yo'nalishga ketardi.
 */
export interface BodyMeasurements {
  height?: number | null;
  /** Mijoz O'ZI tanlagan ustki kiyim razmeri — bor bo'lsa ko'krakdan ustun */
  topSize?: string | null;
  /** Mijoz o'zi tanlagan shim razmeri — bor bo'lsa beldan ustun */
  bottomSize?: string | null;
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

/**
 * Mijoz tanlaydigan kiyim razmerlari — o'lchamlar ekranidagi chiplar.
 *
 * ⚠️ TARTIB MA'NOLI (kichikdan kattaga) — ekranda ham, do'kon
 * ro'yxatida ham shu tartibda ko'rsatiladi.
 */
export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

export type SizeLabel = (typeof CLOTHING_SIZES)[number];

/** Oyoq kiyimi (EU) — chiplar. Diapazon `measurementsSchema` ichida (30–50). */
export const SHOE_SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46] as const;

/**
 * Omborda yozilgan razmerni solishtirish uchun bir xil shaklga keltiradi.
 * `variant_stock.size` erkin matn: «m», « M », «XXXL», «EU 42» — hammasi
 * uchraydi va to'g'ridan-to'g'ri tenglik ularni o'tkazib yuborardi.
 */
export function normalizeSize(size: string): string {
  const upper = size
    .trim()
    .toUpperCase()
    .replace(/^EU\s*/, '');
  if (upper === 'XXXL') return '3XL';
  if (upper === '2XL') return 'XXL';
  return upper;
}

/**
 * Ombordagi razmerlar ichidan tanlangan razmerga mosini topadi.
 *
 * ⚠️ OMBORDAGI YOZUVNI QAYTARADI («m»), normallashtirilganini («M») emas:
 * savat va buyurtma `variant_stock.size` bilan aniq tenglikda ishlaydi.
 */
export function matchSize(available: readonly string[], wanted: string | null): string | null {
  if (!wanted) return null;
  const target = normalizeSize(wanted);
  return available.find((size) => normalizeSize(size) === target) ?? null;
}

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
    /*
     * ⚠️ TANLANGAN RAZMER USTUN. Mijoz o'zi «L» ni tanlagan bo'lsa, u
     * ko'krak aylanasidan hisoblangan taxmindan aniqroq — o'z razmerini
     * u bizdan yaxshi biladi. Sm qiymatlari eski profillar uchun zaxira.
     */
    case 'top':
    case 'outer':
      if (measurements.topSize) return normalizeSize(measurements.topSize);
      return typeof measurements.chest === 'number' ? pick(TOP_BY_CHEST, measurements.chest) : null;

    case 'bottom':
      if (measurements.bottomSize) return normalizeSize(measurements.bottomSize);
      return typeof measurements.waist === 'number'
        ? pick(BOTTOM_BY_WAIST, measurements.waist)
        : null;

    /*
     * ⚠️ «EU 42» EMAS, «42». Omborda razmer «42» bo'lib yoziladi va
     * `/tryon/garments?size=` aniq tenglik bilan solishtiradi — «EU»
     * prefiksi bilan oyoq kiyimi HECH QACHON topilmasdi.
     */
    case 'feet':
      return typeof measurements.shoeSize === 'number' ? String(measurements.shoeSize) : null;

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
      return 'Ustki kiyim razmeri';
    case 'bottom':
      return 'Shim razmeri';
    case 'feet':
      return "Oyoq o'lchami";
    default:
      return null;
  }
}
