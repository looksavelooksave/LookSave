/**
 * reset-password.ts — mavjud foydalanuvchining PAROLINI almashtiradi.
 *
 * ⚠️ ROLGA TEGMAYDI. create-admin / create-courier parol bilan birga rolni
 * ham o'zgartiradi — bu skript esa faqat parolni yangilaydi, qolgani (rol,
 * ism, holat) o'zgarmaydi. Foydalanuvchi topilmasa — xato beradi (yangi
 * yozuv YARATMAYDI, chalkashmaslik uchun).
 *
 * ⚠️ PAROL argumentda BERILMAYDI (shell tarixiga tushmasin). U
 * `NEW_PASSWORD` env dan yoki interaktiv (ko'rinmas) so'rovdan olinadi.
 *
 * Ishga tushirish (prod .env bilan, VPS'da):
 *   cd apps/api
 *   tsx --env-file=.env scripts/reset-password.ts "+998936558959"
 *   # yangi parol so'raladi (yozganingiz ko'rinmaydi)
 *
 * ⚠️ DATABASE_URL qaysi bazani ko'rsatsa, o'shanda almashtiradi.
 */
import { createInterface } from 'node:readline';

import { hashPassword } from '../src/auth/password';
import { pool } from '../src/db/pool';

function usage(msg: string): never {
  console.error(`Xato: ${msg}\n`);
  console.error('Foydalanish: tsx --env-file=.env scripts/reset-password.ts "<telefon>"');
  console.error("Parol: NEW_PASSWORD env yoki interaktiv so'rov orqali.");
  process.exit(1);
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const out = process.stdout as NodeJS.WriteStream;
    const original = out.write.bind(out);
    let silent = false;
    (out as unknown as { write: (s: string) => boolean }).write = (chunk: string): boolean => {
      if (!silent) return original(chunk);
      return true;
    };
    process.stdout.write(question);
    silent = true;
    rl.question('', (answer) => {
      (out as unknown as { write: typeof original }).write = original;
      process.stdout.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

async function main(): Promise<void> {
  const phone = (process.argv[2] ?? '').trim();
  if (!phone) usage('telefon berilmadi');
  if (!/^\+\d{9,15}$/.test(phone)) {
    usage(`telefon xalqaro formatda bo'lsin, mas. +998936558959 (berildi: ${phone})`);
  }

  // Avval foydalanuvchi bor-yo'qligini tekshiramiz
  const found = await pool.query<{ id: string; role: string; full_name: string | null }>(
    `SELECT id, role, full_name FROM users WHERE phone = $1`,
    [phone],
  );
  const existing = found.rows[0];
  if (!existing) usage(`"${phone}" telefonli foydalanuvchi topilmadi`);

  let password = process.env['NEW_PASSWORD'] ?? '';
  if (!password) {
    if (!process.stdin.isTTY) usage("parol yo'q — NEW_PASSWORD env bering yoki interaktiv ishga tushiring");
    password = await promptHidden('Yangi parol: ');
    const again = await promptHidden('Parolni takrorlang:  ');
    if (password !== again) usage('parollar mos kelmadi');
  }
  if (password.length < 8) usage("parol kamida 8 belgidan iborat bo'lsin");

  const passwordHash = await hashPassword(password);

  await pool.query(
    `UPDATE users
        SET password_hash = $2, password_set_at = now(), updated_at = now()
      WHERE phone = $1`,
    [phone, passwordHash],
  );

  console.log('✅ Parol almashtirildi.');
  console.log(`   telefon: ${phone}`);
  console.log(`   ism:     ${existing.full_name ?? '—'}`);
  console.log(`   rol:     ${existing.role} (o'zgarmadi)`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("Almashtirib bo'lmadi:", err instanceof Error ? err.message : err);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
