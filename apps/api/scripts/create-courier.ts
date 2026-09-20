/**
 * create-courier.ts — yetkazib berish paneli uchun `role = 'courier'`
 * foydalanuvchi yaratadi yoki mavjudini shu rolga o'tkazadi (idempotent).
 *
 * Dostavka paneli `/v1/auth/login` orqali kiradi va `/v1/delivery/*` yo'llari
 * `requireRole('courier')` bilan himoyalangan. Kirish uchun telefon + parol +
 * `role='courier'` bo'lgan `users` qatori kerak — bu skript shuni beradi.
 *
 * ⚠️ PAROL argument sifatida BERILMAYDI (shell tarixiga tushmasin). U
 * `COURIER_PASSWORD` muhit o'zgaruvchisidan yoki interaktiv (ko'rinmas)
 * so'rovdan olinadi.
 *
 * Ishga tushirish (prod .env bilan, VPS'da):
 *   cd apps/api
 *   tsx --env-file=.env scripts/create-courier.ts "+998901234567" "Dostavka firma"
 *   # parol so'raladi (yozganingiz ko'rinmaydi)
 *
 * ⚠️ DATABASE_URL qaysi bazani ko'rsatsa, o'shanda yaratadi.
 */
import { createInterface } from 'node:readline';

import { hashPassword } from '../src/auth/password';
import { pool } from '../src/db/pool';

function usage(msg: string): never {
  console.error(`Xato: ${msg}\n`);
  console.error('Foydalanish: tsx --env-file=.env scripts/create-courier.ts "<telefon>" ["<nom>"]');
  console.error("Parol: COURIER_PASSWORD env yoki interaktiv so'rov orqali.");
  process.exit(1);
}

/** Parolni ko'rsatmasdan o'qiydi. */
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
  const fullName = (process.argv[3] ?? '').trim() || 'Dostavka';

  if (!phone) usage('telefon berilmadi');
  if (!/^\+\d{9,15}$/.test(phone)) {
    usage(`telefon xalqaro formatda bo'lsin, mas. +998901234567 (berildi: ${phone})`);
  }

  let password = process.env['COURIER_PASSWORD'] ?? '';
  if (!password) {
    if (!process.stdin.isTTY) usage("parol yo'q — COURIER_PASSWORD env bering yoki interaktiv ishga tushiring");
    password = await promptHidden('Yangi parol: ');
    const again = await promptHidden('Parolni takrorlang:  ');
    if (password !== again) usage('parollar mos kelmadi');
  }
  if (password.length < 8) usage("parol kamida 8 belgidan iborat bo'lsin");

  const passwordHash = await hashPassword(password);

  const { rows } = await pool.query<{ id: string; phone: string; role: string; created: boolean }>(
    `INSERT INTO users (phone, full_name, password_hash, password_set_at, role, country, locale, is_active)
     VALUES ($1, $2, $3, now(), 'courier', 'UZ', 'uz', true)
     ON CONFLICT (phone) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           password_set_at = now(),
           role = 'courier',
           is_active = true,
           full_name = COALESCE(NULLIF(users.full_name, ''), EXCLUDED.full_name),
           updated_at = now()
     RETURNING id, phone, role, (xmax = 0) AS created`,
    [phone, fullName, passwordHash],
  );

  const u = rows[0];
  if (!u) throw new Error('foydalanuvchi yozilmadi');

  console.log(u.created ? '✅ Yangi dostavka logini yaratildi.' : '✅ Mavjud foydalanuvchi courier r0liga o`tkazildi.');
  console.log(`   id:      ${u.id}`);
  console.log(`   telefon: ${u.phone}`);
  console.log(`   rol:     ${u.role}`);
  console.log('\nEndi dostavka paneliga shu telefon va parol bilan kiring.');
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error("Yaratib bo'lmadi:", err instanceof Error ? err.message : err);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
