/**
 * CatVTON sifat testi uchun `pairs.json` yasaydi.
 *
 * ⚠️ NEGA SQL YOLG'IZ YETMAYDI. So'rov `body_photo_url` ni qaytaradi,
 * lekin u SHAXSIY bucketda (`r2.ts` — PRIVATE_PURPOSES = face, body).
 * Ya'ni havola to'g'ridan-to'g'ri ochilmaydi: GPU serveri uni yuklab
 * ololmaydi va har juft `502` bilan yiqiladi. Bu skript o'sha havolani
 * `presignRead` bilan imzolaydi — ilovaning O'ZI ishlatadigan funksiya
 * bilan, nusxasi bilan emas.
 *
 * Kiyim surati (`product/`), avatar (`avatar/`) va GPT natijasi
 * (`tryon/`) ochiq bucketda — ular imzolanmaydi.
 *
 * ⚠️ SO'ROV `infra/scripts/bench-pairs.sql` BILAN BIR XIL BO'LISHI
 * SHART. Ikki nusxa bor, chunki u fayl psql o'zgaruvchilarini
 * (`\if`, `:per_slot`) ishlatadi va ularni `pg` tushunmaydi. U fayl —
 * ko'rib chiqish va sanash uchun; ishlaydigan nusxa shu yerda.
 * Birini o'zgartirsangiz, ikkinchisini ham o'zgartiring.
 *
 * ⚠️ IMZOLANGAN HAVOLALAR MUDDATLI. `EXPIRES_IN` dan keyin ular o'ladi
 * va bench `502` qaytaradi. Shuning uchun muddat ataylab uzun (6 soat)
 * va skript tugaganda muddat oxiri chop etiladi.
 *
 * ⚠️ CHIQUVCHI FAYLDA HAQIQIY ODAMLARNING GAVDA SURATLARI BOR.
 * `pairs.json` — shaxsiy ma'lumot. Uni git'ga qo'ymang, test tugagach
 * o'chiring. Skript buni har safar eslatadi.
 *
 * Ishga tushirish (repo ildizidan):
 *
 *   npm run bench:pairs --workspace=apps/api -- --per-slot 10 --out pairs.json
 */

import { writeFileSync } from 'node:fs';

import { pool } from '../src/db/pool';
import { presignRead } from '../src/integrations/r2';

/** 6 soat — bench'ni bemalol qayta ishga tushirish uchun yetarli. */
const EXPIRES_IN = 6 * 60 * 60;

interface Row {
  id: string;
  slot: string;
  person: string;
  garment: string;
  reference: string | null;
}

/** ⚠️ `infra/scripts/bench-pairs.sql` bilan bir xil — izohga qarang. */
const QUERY = `
WITH candidates AS (
  SELECT DISTINCT ON (person, garment)
         p.slot,
         r.result_url                                       AS reference,
         COALESCE(pr.body_photo_url, pr.avatar_image_url)   AS person,
         COALESCE(v.images ->> 0, p.images ->> 0)           AS garment,
         r.created_at
    FROM tryon_renders r
    JOIN product_variants v ON v.id = r.variant_id
    JOIN products         p ON p.id = v.product_id
    JOIN profiles        pr ON pr.user_id = r.user_id
   WHERE r.status = 'ready'
     AND r.result_url IS NOT NULL
     AND r.angle = 'front'
     AND ($2 OR r.base_render_id IS NULL)
     AND p.slot IN ('top', 'outer', 'bottom')
     AND COALESCE(pr.body_photo_url, pr.avatar_image_url) IS NOT NULL
     AND COALESCE(v.images ->> 0, p.images ->> 0) IS NOT NULL
   ORDER BY person, garment, r.created_at DESC
),
balanced AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY slot ORDER BY random()) AS rn
    FROM candidates
)
SELECT slot || '-' || LPAD(rn::text, 2, '0') AS id,
       slot, person, garment, reference
  FROM balanced
 WHERE rn <= $1
 ORDER BY slot, rn
`;

function parseArgs(): { perSlot: number; out: string; includeLayered: boolean } {
  const argv = process.argv.slice(2);
  const read = (flag: string, fallback: string): string => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1]! : fallback;
  };
  return {
    perSlot: Number(read('--per-slot', '10')),
    out: read('--out', 'pairs.json'),
    /*
     * ⚠️ `outer` ODATDA QATLAMLI. Kurtka biror narsaning ustiga
     * kiyiladi, ya'ni deyarli har `outer` renderda `base_render_id`
     * bor va sukut qiymatda ular tushib qoladi. Bayroq ularni
     * qaytaradi — evaziga model surati oldingi GPT natijasi bo'ladi,
     * ya'ni kirish toza emas va buni hisobotni o'qiyotganda bilish kerak.
     */
    includeLayered: argv.includes('--include-layered'),
  };
}

async function main(): Promise<number> {
  const { perSlot, out, includeLayered } = parseArgs();
  if (!Number.isInteger(perSlot) || perSlot < 1) {
    console.error('--per-slot musbat butun son bo`lishi kerak');
    return 1;
  }

  const { rows } = await pool.query<Row>(QUERY, [perSlot, includeLayered]);

  if (rows.length === 0) {
    console.error(
      'Juft topilmadi. Sabablari: hali `ready` natija yo`q, yoki hammasi\n' +
        '`feet` slotida, yoki `base_render_id` bilan (qatlamli —\n' +
        '`--include-layered` bilan ularni ham olish mumkin).',
    );
    return 1;
  }

  /*
   * ⚠️ IMZOLASH KETMA-KET EMAS, BIRGALIKDA. Har biri alohida kutilsa
   * 30 juft uchun 30 ta ketma-ket chaqiruv bo'lardi. Imzolash mahalliy
   * hisob — tarmoqqa chiqmaydi, ya'ni parallel qilish xavfsiz.
   */
  const pairs = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      slot: row.slot,
      person: (await presignRead(row.person, EXPIRES_IN)) ?? row.person,
      garment: row.garment,
      ...(row.reference ? { reference: row.reference } : {}),
    })),
  );

  writeFileSync(out, JSON.stringify(pairs, null, 2) + '\n', 'utf8');

  const perSlotCount = new Map<string, number>();
  for (const p of pairs) perSlotCount.set(p.slot, (perSlotCount.get(p.slot) ?? 0) + 1);
  const withRef = pairs.filter((p) => 'reference' in p).length;

  console.log(`\n${out} — ${pairs.length} juft`);
  for (const [slot, n] of [...perSlotCount].sort()) console.log(`  ${slot.padEnd(8)} ${n}`);
  console.log(`  ${'referens'.padEnd(8)} ${withRef} / ${pairs.length} (GPT natijasi bilan)`);

  if (withRef < pairs.length) {
    console.log('\nReferenssiz juftlar hisobotda faqat CatVTON natijasini ko`rsatadi.');
  }

  const until = new Date(Date.now() + EXPIRES_IN * 1000);
  console.log(`\nImzolangan havolalar amal qiladi: ${until.toLocaleString()}`);
  console.log('⚠️  pairs.json da haqiqiy gavda suratlari bor — git`ga qo`ymang, test tugagach o`chiring.');
  console.log(`\nKeyingi qadam:\n  python3 api/bench.py ${out} --api http://POD-MANZILI:8000\n`);

  return 0;
}

main()
  .then(async (code) => {
    await pool.end();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
