import { AI_TRYON_SLOTS } from '@looksave/validation';

import { pool } from '../db/pool';
import { ApiError } from '../http/api-error';
import { isOwnCdnUrl, presignRead } from '../integrations/r2';
import { logger } from '../logger';
import { makeCutout } from '../store/cutout';

/**
 * Operator kiyintirishi — `developer_ai` paneli.
 *
 * Avatar tayyor bo'lgach, operator do'kon kiyimlarini BITTALAB avatarga
 * kiydiradi (brauzerdagi AI'da) va natijani yuklaydi. Har natija mijozning
 * `tryon_renders` yozuviga tushadi — ya'ni mijoz ilovada o'zini o'sha
 * kiyimda tayyor holda ko'radi.
 *
 * ⚠️ NEGA ALOHIDA, KIYINTIRISH NAVBATIDAN EMAS. Bir avatarga o'nlab kiyim
 * kiydiriladi — har biri alohida navbat yozuvi bo'lsa, navbat panjarasi
 * yuzlab yozuv bilan to'lardi. Bu yerda hammasi BITTA avatar ishining
 * ichida: operator gridda har kiyimni ko'radi va yuklaydi.
 */

export interface DressGarment {
  variantId: string;
  productId: string;
  title: string;
  slot: string;
  /** Kiyimning tekis surati — operator uni AI'ga beradi */
  garmentImage: string | null;
  /** Bu kiyim allaqachon kiydirilganmi (mijozda ready render bor) */
  done: boolean;
}

export interface DressBoard {
  /** Kiydiriladigan avatar (imzolangan) — operator uni AI'ga beradi */
  avatarImage: string | null;
  garments: DressGarment[];
}

/**
 * Shu foydalanuvchiga kiydirilishi kerak bo'lgan kiyimlar.
 *
 * ⚠️ FAQAT AI TRY-ON SLOTLARI VA OMBORDA BORLARI. 3D yoki tugagan kiyimni
 * kiydirishning ma'nosi yo'q — mijoz uni baribir sotib ololmaydi.
 * `DISTINCT ON (p.id)` — har mahsulotdan bitta (ranglar takrorlanmasin).
 */
export async function listDressBoard(userId: string): Promise<DressBoard> {
  const avatar = await pool.query<{ avatar_image_url: string | null }>(
    `SELECT avatar_image_url FROM profiles WHERE user_id = $1`,
    [userId],
  );
  const avatarUrl = avatar.rows[0]?.avatar_image_url ?? null;

  const { rows } = await pool.query<{
    variant_id: string;
    product_id: string;
    title: string;
    slot: string;
    image: string | null;
    done: boolean;
  }>(
    `SELECT DISTINCT ON (p.id)
            v.id AS variant_id, p.id AS product_id, p.title, p.slot,
            COALESCE(NULLIF(v.images->>0, ''), NULLIF(p.images->>0, '')) AS image,
            EXISTS (
              SELECT 1 FROM tryon_renders t
               WHERE t.user_id = $1 AND t.variant_id = v.id
                 AND t.angle = 'front' AND t.status = 'ready'
            ) AS done
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
      WHERE p.status = 'active'
        AND p.slot = ANY($2::text[])
        AND EXISTS (SELECT 1 FROM variant_stock vs WHERE vs.variant_id = v.id AND vs.stock > vs.reserved)
      ORDER BY p.id, (v.images->>0) IS NOT NULL DESC, v.created_at ASC`,
    [userId, [...AI_TRYON_SLOTS]],
  );

  const garments = rows.map((row) => ({
    variantId: row.variant_id,
    productId: row.product_id,
    title: row.title,
    slot: row.slot,
    garmentImage: row.image,
    done: row.done,
  }));

  return { avatarImage: (await presignRead(avatarUrl)) ?? avatarUrl, garments };
}

/**
 * Operator bitta kiyimni kiydirdi — natijani mijozning renderiga yozadi.
 *
 * ⚠️ MANZIL BIZNING OMBORDAN BO'LISHI SHART (`/result` bilan bir xil sabab).
 * ⚠️ KESIM ALOHIDA, TRANZAKSIYADAN KEYIN — u sekin va nosozligi renderni
 * buzmasligi kerak (ilova kesimsiz ham suratni ko'rsatadi).
 */
export async function submitDress(
  userId: string,
  variantId: string,
  resultUrl: string,
): Promise<{ variantId: string; done: true }> {
  if (!isOwnCdnUrl(resultUrl)) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Natija avval panel orqali yuklanishi kerak — tashqi havola qabul qilinmaydi',
    );
  }

  // Kiyim mavjud va AI'ga yaroqli slotdami — tekshiriladi
  const { rows } = await pool.query<{ slot: string }>(
    `SELECT p.slot FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE v.id = $1 AND p.status = 'active'`,
    [variantId],
  );
  const slot = rows[0]?.slot;
  if (!slot) throw ApiError.notFound('Bunday kiyim yo`q');
  if (!(AI_TRYON_SLOTS as readonly string[]).includes(slot)) {
    throw new ApiError('VALIDATION_ERROR', 'Bu kiyim AI kiyintirishni qo`llamaydi');
  }

  /*
   * ⚠️ `base_render_id = NULL` — birinchi qatlam (yalang'och avatar ustiga).
   * Ilova aynan shu shart bilan qidiradi (`listRenders`). `source_hash`
   * operator kiyintirishini belgilaydi va takroriy yuklashda O'CHIRIB
   * qaytadan yoziladi (operator qayta kiydirsa yangisi turadi).
   */
  await pool.query(
    `INSERT INTO tryon_renders (user_id, variant_id, angle, source_hash, base_render_id,
                                status, provider, result_url, completed_at)
     VALUES ($1, $2, 'front', 'operator', NULL, 'ready', 'manual', $3, now())
     ON CONFLICT (user_id, variant_id, angle, source_hash)
       DO UPDATE SET result_url = EXCLUDED.result_url, cutout_url = NULL,
                     status = 'ready', error = NULL, completed_at = now()`,
    [userId, variantId, resultUrl],
  );

  void attachCutout(userId, variantId, resultUrl);
  logger.info({ userId, variantId }, 'developer_ai: kiyim kiydirildi');
  return { variantId, done: true };
}

async function attachCutout(userId: string, variantId: string, url: string): Promise<void> {
  try {
    const cutout = await makeCutout(url, 'tryon');
    if (!cutout) return;
    await pool.query(
      `UPDATE tryon_renders SET cutout_url = $3
        WHERE user_id = $1 AND variant_id = $2 AND angle = 'front'
          AND source_hash = 'operator' AND result_url = $4`,
      [userId, variantId, cutout, url],
    );
  } catch (err) {
    logger.warn({ err, userId, variantId }, 'developer_ai: kiyim kesimi yasalmadi');
  }
}
