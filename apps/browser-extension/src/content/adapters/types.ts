import type { AdapterId } from '../../shared/messages';

/**
 * Bitta AI saytining «tugmalari».
 *
 * ⚠️ BU YERDA FAQAT SELEKTORLAR VA ULARNI O'QISH BO'LADI, MANTIQ EMAS.
 * Kiyintirish qadamlari (biriktir → yoz → yubor → kut) ikkala saytda bir
 * xil va `content/index.ts` da bir marta yozilgan. Sayt UI'sini o'zgartirsa
 * faqat shu papkadagi qatorlar yangilanadi.
 */
export interface Adapter {
  readonly id: AdapterId;

  /** Shu sahifa aynan shu adapterniki ekanligi */
  matches(): boolean;

  /** Matn maydoni. `null` — sahifa hali tayyor emas. */
  composer(): HTMLElement | null;

  /** Yuborish tugmasi. `null` — hali bosib bo'lmaydi (matn yoki surat yetmayapti). */
  sendButton(): HTMLElement | null;

  /** Model hozir javob yozyaptimi */
  busy(): boolean;
  /**
   * Biriktirilgan surat hali serverga yuklanyaptimi (spinner/progress).
   * Ixtiyoriy: bo'lmasa faqat yuborish tugmasi faollashishiga qaraladi.
   */
  uploading?(): boolean;

  /**
   * Biriktirilgan fayllar soni.
   *
   * ⚠️ `-1` — «BILMAYMAN». Sayt biriktirmalarni tanib bo'lmaydigan qilib
   * chizsa, noto'g'ri `0` qaytarish xavfli: chaqiruvchi surat yuklanmadi
   * deb o'ylab, butun navbatni to'xtatardi. `-1` da u shunchaki biroz
   * kutadi va davom etadi.
   */
  attachmentCount(): number;

  /**
   * Suratni biriktirish uchun fayl maydoni.
   *
   * ⚠️ BARCHA `input[type=file]` NI QAYTARMANG. ChatGPT'da uchtasi bor
   * (rasm, fayl, kamera) va uchalasiga ham yozilsa surat UCH MARTA
   * biriktirilardi. Har adapter o'zining to'g'ri maydonini tanlaydi.
   */
  fileInputs(): HTMLInputElement[];

  /** Javoblardagi suratlar — eng oxirgisi ro'yxat oxirida */
  resultImages(): HTMLImageElement[];

  /**
   * Oxirgi javobning MATNI.
   *
   * ⚠️ RASM KELMAGANDA YAGONA MA'LUMOT MANBAI. «Rasm qaytarmadi» degan
   * xato ikki butunlay boshqa holatni bir xil ko'rsatadi: model rad
   * etdi (matn bilan) yoki rasm chizildi-yu selektor uni topmadi.
   * Birinchisini kod bilan tuzatib bo'lmaydi, ikkinchisini esa —
   * bo'ladi. Javob matnisiz ularni ajratib bo'lmaydi.
   */
  lastReplyText(): string;
}

/**
 * Natija surati bo'la oladigan rasm.
 *
 * ⚠️ O'LCHAM BO'YICHA FILTR SHART. Javob ichida avatar, ikonka va SVG
 * ham bor; ularsiz birinchi topilgan «rasm» ko'pincha modelning 24x24
 * belgisi bo'lib chiqardi va o'sha mijozning gallereyasiga ketardi.
 */
export function looksLikeResult(image: HTMLImageElement): boolean {
  if (!image.src || image.src.startsWith('data:image/svg')) return false;
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  return width >= 200 && height >= 200;
}
