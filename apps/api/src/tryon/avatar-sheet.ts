import { randomUUID } from 'node:crypto';

import sharp from 'sharp';

import { uploadObject } from '../integrations/r2';
import type { AvatarAngle } from './avatar-prompt';

/**
 * Uch burchakli «turnaround» rasmni bo'laklarga ajratish
 * (`buildAvatarSheetPrompt` → operator → shu yer).
 *
 * Rasm chapdan o'ngga OLD · YON · ORQA, har biri kenglikning aynan
 * uchdan biri. Kesish teng bo'laklarga — odamni qidirib topish yo'q:
 * prompt har figurani o'z panelining markaziga qo'yishni talab qiladi.
 *
 * ⚠️ BO'LAKLAR QIRQILMAYDI (trim yo'q). Uchala bo'lak bir xil o'lchamda
 * qolishi shart — ilovada burchaklar almashtirilganda odam bir joyda,
 * bir xil kattalikda turishi kerak. Har biri alohida qirqilsa, «orqa»
 * ko'rinish «old» dan kattaroq yoki pastroq chiqib, sakrab ko'rinardi.
 */

export const SHEET_ORDER: readonly AvatarAngle[] = ['front', 'side', 'back'];

/**
 * Rasm uch panelli varaqmi.
 *
 * ⚠️ NISBAT BILAN ANIQLANADI. Bitta pozali avatar TIK (1024x1536), varaq
 * esa LANDSHAFT (3:2). 1.2 chegarasi — kvadrat yoki biroz keng bitta
 * suratni varaq deb uchga bo'lib yubormaslik uchun: uchdan biri juda tor
 * bo'lib, figura kesilib qolardi.
 */
export function isAvatarSheet(width: number, height: number): boolean {
  return width >= height * 1.2;
}

/** Varaqni uchta PNG buferga ajratadi. Varaq bo'lmasa — `null`. */
export async function splitAvatarSheet(input: Buffer): Promise<Record<AvatarAngle, Buffer> | null> {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height || !isAvatarSheet(width, height)) return null;

  // Qoldiq piksel (kenglik 3 ga bo'linmasa) oxirgi bo'lakka qo'shilmaydi —
  // uchala bo'lak bir xil kenglikda bo'lishi muhimroq
  const panel = Math.floor(width / 3);

  const parts = await Promise.all(
    SHEET_ORDER.map((_, index) =>
      sharp(input)
        .extract({ left: index * panel, top: 0, width: panel, height })
        // Operator JPEG yuklasa ham natija PNG — kanal tuzilishi bir xil bo'lsin
        .ensureAlpha()
        .png()
        .toBuffer(),
    ),
  );

  return { front: parts[0]!, side: parts[1]!, back: parts[2]! };
}

/**
 * Varaqni yuklab oladi, ajratadi va bo'laklarni R2 ga qo'yadi.
 *
 * Varaq bo'lmasa `null` qaytaradi — chaqiruvchi rasmni avvalgidek bitta
 * (old) avatar sifatida ishlatadi. Ya'ni eski oqim buzilmaydi.
 */
export async function storeAvatarSheet(url: string): Promise<Record<AvatarAngle, string> | null> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Natija yuklab olinmadi (${response.status})`);

  const parts = await splitAvatarSheet(Buffer.from(await response.arrayBuffer()));
  if (!parts) return null;

  const urls = await Promise.all(
    SHEET_ORDER.map((angle) =>
      uploadObject({
        key: `avatar/${randomUUID()}.png`,
        body: parts[angle],
        contentType: 'image/png',
      }),
    ),
  );

  return { front: urls[0]!, side: urls[1]!, back: urls[2]! };
}
