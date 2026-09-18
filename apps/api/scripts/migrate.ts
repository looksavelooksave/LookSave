/**
 * Migratsiyalarni qo'llash — Docker'siz serverlar uchun.
 *
 *   npm run db:migrate --workspace=apps/api             # qo'llash
 *   npm run db:migrate --workspace=apps/api -- --dry-run # faqat ro'yxat
 *
 * ⚠️ NEGA `infra/scripts/migrate.sh` EMAS. U `docker compose exec postgres
 * psql` orqali ishlaydi. Server esa pm2 + tizimdagi Postgres bilan
 * ishlaydi (2026-09-18) — u yerda skript umuman ishga tushmaydi.
 *
 * ⚠️ NEGA `psql "$DATABASE_URL"` EMAS. Serverdagi baza parolida `%`, `@`,
 * `[`, `&`, `+` bor va `psql` uni «invalid percent-encoded token» deb rad
 * etadi. API esa o'sha manzil bilan ulanadi. Bu skript API bilan BIR XIL
 * kutubxona (`pg`) va bir xil `.env` ni ishlatadi — API ulana olsa, bu
 * ham ulanadi.
 *
 * Qoidalar `migrate.sh` bilan bir xil, qayd jadvali ham bir xil
 * (`schema_migrations`), ya'ni ikkalasi almashib ishlatilishi mumkin:
 *  • qo'llangan fayl o'tkazib yuboriladi
 *  • qo'llangandan keyin TAHRIRLANGAN fayl topilsa — to'xtaydi
 *  • har fayl o'z tranzaksiyasida (CONCURRENTLY bo'lsa — tranzaksiyasiz)
 *  • birinchi xatoda to'xtaydi; oldingilari saqlanib qoladi
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '../../../infra/migrations');

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

async function main(): Promise<number> {
  const dryRun = process.argv.includes('--dry-run');
  const url = process.env['DATABASE_URL'];
  if (!url) {
    console.error('❌ DATABASE_URL yo`q — apps/api/.env ni tekshiring');
    return 1;
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename    TEXT PRIMARY KEY,
        checksum    TEXT        NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query<{ filename: string; checksum: string }>(
      'SELECT filename, checksum FROM schema_migrations',
    );
    const recorded = new Map(rows.map((row) => [row.filename, row.checksum]));

    const files = readdirSync(MIGRATIONS)
      .filter((name) => name.endsWith('.sql'))
      .sort();

    let applied = 0;
    let skipped = 0;

    for (const name of files) {
      const sql = readFileSync(join(MIGRATIONS, name), 'utf8');
      const checksum = sha256(sql);
      const previous = recorded.get(name);

      if (previous) {
        if (previous !== checksum) {
          console.error(`❌ ${name} qo'llangandan keyin o'zgartirilgan.`);
          console.error('   Migratsiya tahrirlanmaydi — o`zgarish uchun yangi raqamli fayl yarating.');
          return 1;
        }
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(`  kutmoqda: ${name}`);
        applied += 1;
        continue;
      }

      process.stdout.write(`→ ${name} … `);
      const concurrent = /CONCURRENTLY/i.test(sql);

      try {
        if (!concurrent) await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [
          name,
          checksum,
        ]);
        if (!concurrent) await client.query('COMMIT');
        console.log('ok');
        applied += 1;
      } catch (err) {
        if (!concurrent) await client.query('ROLLBACK').catch(() => undefined);
        console.log('XATO');
        const message = err instanceof Error ? err.message : String(err);
        console.error(`\n❌ ${name}: ${message}`);

        /*
         * Eng ko'p uchraydigan sabab — PostGIS o'rnatilmagan, xato matni esa
         * nima o'rnatishni aytmaydi. Shuning uchun yechim shu yerda.
         *
         * ⚠️ IKKI XIL MATN. Postgres versiyasiga qarab xato yo `extension
         * "postgis" is not available`, yo `could not open extension control
         * file ".../postgis.control"` bo'ladi. Serverda (Postgres 14)
         * ikkinchisi chiqdi va maslahat ko'rsatilmay qolgan edi.
         */
        /*
         * ⚠️ `extension "postgis"` YETARLI EMAS: «permission denied to create
         * extension "postgis"» da ham shu so'zlar bor va skript ikkala
         * maslahatni birdan chiqarardi. Faqat «mavjud emas» holatlari.
         */
        if (/extension "postgis" is not available|postgis\.control/i.test(message)) {
          console.error('\n   PostGIS o`rnatilmagan. Serverda (Postgres versiyasiga mos):');
          console.error('     apt install -y postgresql-$(pg_lsclusters -h | cut -d" " -f1)-postgis-3');
        }
        if (/permission denied to create extension|must be owner|superuser/i.test(message)) {
          console.error('\n   Kengaytma yaratishga huquq yo`q. Bir marta postgres nomidan:');
          console.error(
            '     sudo -u postgres psql -d <baza> -c "CREATE EXTENSION IF NOT EXISTS postgis; ' +
              'CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS pgcrypto; ' +
              'CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"',
          );
        }
        console.error(`\n   ${applied} ta qo'llandi, xatodan keyingilari qo'llanmadi.`);
        return 1;
      }
    }

    console.log(
      dryRun
        ? `\n${applied} ta qo'llanishi kerak, ${skipped} tasi allaqachon qo'llangan.`
        : `\n✅ Migratsiyalar: ${applied} ta qo'llandi, ${skipped} ta o'tkazib yuborildi`,
    );
    return 0;
  } finally {
    await client.end();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error('❌', err instanceof Error ? err.message : err);
    process.exit(1);
  });
