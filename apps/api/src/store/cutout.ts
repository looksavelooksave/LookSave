import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';

import { uploadObject } from '../integrations/r2';
import { logger } from '../logger';

/**
 * Suratdan odamni (yoki kiyimni) fondan ajratib olish.
 *
 * ⚠️ NEGA KERAK: maketda odam QORONG'I SAHNADA, neon halqalar orasida
 * turadi. AI esa har doim och kulrang studiya foni bilan qaytaradi. Uni
 * to'g'ridan-to'g'ri qo'ysak, qora ekranda och kulrang to'rtburchak paydo
 * bo'ladi va butun taassurot buziladi.
 *
 * Shaffof kesim esa istalgan fonga qo'yiladi — sahna, halqalar, o'lchov
 * chiziqlari ilovada chiziladi va ular hech qanday qo'shimcha xarajat
 * talab qilmaydi.
 *
 * ⚠️ ISHLOV O'Z SERVERIMIZDA — tashqi xizmatga to'lanmaydi. Har surat
 * uchun bir necha soniya protsessor vaqti ketadi, shuning uchun natija
 * SAQLANADI va qayta hisoblanmaydi.
 */

/*
 * Kutubxona resurs yo'lini joriy ish papkasidan hisoblaydi, paket esa
 * ildizdagi `node_modules` da — shuning uchun yo'l qo'lda beriladi.
 * Batafsil izoh `garment-image.ts` da.
 */
const require_ = createRequire(import.meta.url);
const RESOURCE_PATH = `file://${dirname(require_.resolve('@imgly/background-removal-node'))}/`;

/**
 * Suratni yuklab, fonini olib tashlab, shaffof PNG sifatida saqlaydi.
 *
 * Xato bo'lsa `null` qaytadi — kesim BEZAK, uning yo'qligi asosiy oqimni
 * to'xtatmasligi kerak. Ilova bunday holatda oddiy suratni ko'rsatadi.
 */
/**
 * Suratda haqiqiy shaffof fon bormi: alfa kanali bor VA to'rt burchagi
 * shaffof. Faqat `hasAlpha` yetmaydi — ba'zi PNG'larda alfa kanal bor,
 * lekin hamma piksel to'liq ko'rinadigan (oq fon).
 */
async function isAlreadyTransparent(input: Buffer): Promise<boolean> {
  try {
    const image = sharp(input);
    const meta = await image.metadata();
    if (!meta.hasAlpha || !meta.width || !meta.height) return false;

    const { data, info } = await image
      .ensureAlpha()
      .resize(32, 32, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number): number =>
      data[(y * info.width + x) * info.channels + 3] ?? 255;
    const last = info.width - 1;
    return [alphaAt(0, 0), alphaAt(last, 0), alphaAt(0, last), alphaAt(last, last)].every(
      (alpha) => alpha < 16,
    );
  } catch {
    return false;
  }
}

export async function makeCutout(url: string, prefix: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const input = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';

    /*
     * ⚠️ FONI ALLAQACHON SHAFFOF BO'LSA — MODEL ISHLATILMAYDI (2026-09-25).
     * Avatar va kiyintirish natijalari endi shaffof PNG bo'lib keladi.
     * Fon olib tashlash modeli (ONNX) 1 GB li VPS'da CPU va xotirani
     * butunlay egallab, shu paytdagi so'rovlarni 504 ga tushirardi —
     * kengaytmaning kiyim navbati aynan shundan yiqilgan. Tayyor
     * shaffof surat kesimning o'zi, uni qayta ishlashning ma'nosi yo'q.
     */
    if (await isAlreadyTransparent(input)) return url;

    const out = await removeBackground(new Blob([input], { type: contentType }), {
      publicPath: RESOURCE_PATH,
      output: { format: 'image/png' },
    });

    return await uploadObject({
      key: `${prefix}/${randomUUID()}.png`,
      body: Buffer.from(await out.arrayBuffer()),
      contentType: 'image/png',
    });
  } catch (err) {
    logger.warn({ err, url }, 'kesim yasalmadi');
    return null;
  }
}
