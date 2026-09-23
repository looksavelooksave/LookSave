/**
 * Yetkazib berish vaqtini o'qiladigan matnga aylantiradi.
 *
 * Panellar (do'kon, dostavka) va ilova bir xil yozuvni ko'rsatishi uchun
 * matn bir joyda tuziladi. `slot` NULL bo'lsa (olib ketish yoki eski
 * buyurtma) — `null` qaytadi.
 */
export type DeliverySlot = 'today' | 'tomorrow' | 'scheduled';

export function deliveryWhenLabel(
  slot: string | null,
  date: string | Date | null,
): string | null {
  if (!slot) return null;
  if (slot === 'today') return 'Bugun';
  if (slot === 'tomorrow') return 'Ertaga kun davomida';
  if (slot === 'scheduled') {
    if (!date) return 'Tanlangan kun';
    const iso = typeof date === 'string' ? date : date.toISOString().slice(0, 10);
    return iso; // YYYY-MM-DD — ilova o'zi formatlaydi
  }
  return null;
}
