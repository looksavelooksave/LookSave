import { z } from 'zod';

import { presignSchema } from './store-products';

/**
 * `developer_ai` paneli — operator navbati sxemalari.
 *
 * Panel AI ishini odam bajaradigan yo'l: so'rov navbatga tushadi,
 * operator uni band qiladi va natijani qaytaradi.
 */

export const TASK_KINDS = ['avatar', 'render'] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_STATUSES = ['pending', 'claimed', 'done', 'failed', 'expired'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Navbatni o'qish.
 *
 * `open` — hali bajarilmagani (pending + claimed). Panel sukut bo'yicha
 * shuni ko'rsatadi: tugagan ishlar ro'yxatni to'ldirib, navbatdagi
 * ishni ko'rinmas qilib qo'yadi.
 */
export const taskQuerySchema = z.object({
  status: z.enum([...TASK_STATUSES, 'open']).default('open'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type TaskQuery = z.infer<typeof taskQuerySchema>;

/**
 * Natijani topshirish.
 *
 * ⚠️ MANZIL BIZNING OMBORDAN BO'LISHI SHART. Operator ixtiyoriy havola
 * bera olsa, mijoz ilovasida tashqi saytdagi surat ko'rsatilardi — u
 * istalgan paytda o'zgarishi yoki yo'qolishi mumkin. Shuning uchun
 * operator avval suratni yuklaydi (`/uploads/presign`), keyin qaytgan
 * manzilni shu yerga beradi.
 */
export const taskResultSchema = z.object({
  resultUrl: z.string().url().max(2048),
});

export type TaskResultInput = z.infer<typeof taskResultSchema>;

/** Operator bajara olmadi — sabab yoziladi va mijozga ko'rsatiladi. */
export const taskFailSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});

export type TaskFailInput = z.infer<typeof taskFailSchema>;

/**
 * Operator natija suratini yuklaydi.
 *
 * ⚠️ FAQAT `avatar` MAQSADI. Natija ochiq bucketga tushadi (mijoz
 * ilovasi uni to'g'ridan-to'g'ri ko'rsatadi). `face`/`body` shaxsiy
 * bucketga yozadi — operator u yerga hech narsa yuklamasligi kerak.
 */
export const developerAiPresignSchema = presignSchema.extend({
  purpose: z.literal('avatar'),
});

export type DeveloperAiPresignInput = z.output<typeof developerAiPresignSchema>;

/** Operator kiyintirish natijasi — manzil bizning ombordan tekshiriladi. */
export const dressResultSchema = z.object({
  resultUrl: z.string().url().max(2048),
});
export type DressResultInput = z.output<typeof dressResultSchema>;

/** `:id` (avatar ishi) + `:variantId` (kiyim) param. */
export const variantParamSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
});
