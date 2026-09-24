import { z } from 'zod';

/**
 * Sotuvchi username'i — store panelga kirish uchun va do'konning ochiq
 * @handle'i sifatida (infra/migrations/032_usernames.sql).
 *
 * Qoida: 3–30 belgi, harf bilan boshlanadi, faqat lotin kichik harf, raqam,
 * `_` va `.`. Katta harf XATO EMAS — kichikka o'giriladi: foydalanuvchi
 * "Chilonzor" deb yozsa, "chilonzor" saqlanadi. Bazadagi CHECK aynan shu
 * regex bilan bir xil — ikkisi ajralib ketmasin.
 *
 * ⚠️ `+` bilan boshlanmaydi va raqam bilan boshlanmaydi — login maydoni
 * telefon va username'ni shu farq bo'yicha ajratadi (`loginSchema`).
 */
export const USERNAME_PATTERN = /^[a-z][a-z0-9_.]{2,29}$/;

/**
 * Tizim yoki brendga o'xshab ko'rinadigan nomlar. Sotuvchi "admin" yoki
 * "looksave" bo'lib olsa, xaridor uni rasmiy akkaunt deb o'ylashi mumkin.
 */
const RESERVED = new Set([
  'admin',
  'administrator',
  'looksave',
  'look_save',
  'look.save',
  'support',
  'help',
  'moderator',
  'system',
  'root',
  'api',
  'store',
  'stores',
  'official',
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    USERNAME_PATTERN,
    'Username 3–30 belgi: lotin harfi bilan boshlanadi, faqat harf, raqam, _ va .',
  )
  .refine((value) => !value.includes('..'), 'Ketma-ket ikki nuqta bo`lmasin')
  .refine((value) => !value.endsWith('.'), 'Username nuqta bilan tugamasin')
  .refine((value) => !RESERVED.has(value), 'Bu username band — boshqasini tanlang');

export const setUsernameSchema = z.object({ username: usernameSchema });

export type SetUsernameInput = z.output<typeof setUsernameSchema>;
