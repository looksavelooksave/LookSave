/**
 * Qo'lda yig'ilgan rasmlardan CatVTON sifat testi uchun `pairs.json`.
 *
 * ⚠️ NEGA ALOHIDA SKRIPT. `make-bench-pairs.ts` bazadagi TAYYOR
 * renderlardan juft tuzadi — production bo'lmaganda u bo'sh qaytaradi.
 * Bu yerda manba boshqa: papkadagi fayllar. Qolgan hammasi bir xil,
 * chiqish ham bir xil (`api/bench.py` o'qiydigan `pairs.json`).
 *
 * ⚠️ REFERENSSIZ TEST YARIM TEST. `pairs.json` da `reference` bo'lmasa
 * hisobot faqat CatVTON natijasini ko'rsatadi va "GPT'dan yaxshimi?"
 * degan asosiy savol javobsiz qoladi. Shuning uchun `--with-reference`
 * bayrog'i bor: u O'SHA juftlar uchun `gpt-image` natijasini ham yasaydi
 * va yonma-yon solishtirish tiklanadi.
 *
 * ⚠️ REFERENS PUL SARFLAYDI. Har rasm ~$0.15. Skript boshlashdan oldin
 * nechta va taxminan qancha bo'lishini chop etadi.
 *
 * ⚠️ HAQIQIY KOD CHAQIRILADI, NUSXASI EMAS. Referens `integrations/
 * openai.ts` dagi `generateTryon` bilan yasaladi — ya'ni ilova
 * foydalanuvchiga beradigan natijaning AYNI O'ZI. Mantiq bu yerda
 * takrorlansa, solishtirish jimgina yolg'on gapira boshlardi.
 *
 * ⚠️ MAHALLIY FAYLLAR UCHUN VAQTINCHALIK SERVER. `generateTryon` HTTPS
 * havola kutadi va uni O'Z SERVERIDAN yuklaydi (`fetchAsBlob`), OpenAI
 * tomonidan emas. Shuning uchun `127.0.0.1` da qisqa umrli static
 * server yetarli — fayllarni R2 ga yuklash va keyin tozalash shart emas.
 *
 * Papka tuzilishi:
 *
 *   bench-data/
 *     person/   p1.jpg  p2.jpg  p3.jpg
 *     garment/  top__ko-ylak.jpg  bottom__jinsi.jpg  outer__palto.jpg
 *
 * Kiyim fayli nomi `<slot>__<nom>` ko'rinishida — slot shundan olinadi.
 * Slotlar: top · outer · bottom (feet CatVTON'da ishlamaydi).
 *
 * ⚠️ `openai` MODULI KECHIKTIRIB IMPORT QILINADI. U `logger` ni, u esa
 * `config/env` ni tortadi va o'sha yerda DATABASE_URL, REDIS_URL, JWT
 * kalitlari TALAB qilinadi. Yuqorida import qilinsa, papkadan juft
 * yig'ish uchun ham to'liq `.env` kerak bo'lardi — holbuki bu bosqichda
 * na baza, na Redis ishlatiladi. Faqat `--with-reference` berilganda
 * yuklanadi.
 *
 * Ishga tushirish (repo ildizidan):
 *
 *   npm run bench:pairs:local --workspace=apps/api -- --dir bench-data
 *   npm run bench:pairs:local --workspace=apps/api -- --dir bench-data --with-reference
 */

import { createReadStream, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { basename, extname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';

/** CatVTON qo'llab-quvvatlaydigan slotlar. `feet` ataylab yo'q. */
const SLOTS = new Set(['top', 'outer', 'bottom']);

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/** Taxminiy narx — faqat ogohlantirish uchun, hisob-kitob emas. */
const USD_PER_IMAGE = 0.15;

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

interface Pair {
  id: string;
  slot: string;
  person: string;
  garment: string;
  reference?: string;
}

function parseArgs(): { dir: string; out: string; cross: boolean; withReference: boolean } {
  const argv = process.argv.slice(2);
  const read = (flag: string, fallback: string): string => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1]! : fallback;
  };
  return {
    dir: read('--dir', 'bench-data'),
    out: read('--out', 'pairs.json'),
    /* Har odamni har kiyim bilan. 3 odam × 10 kiyim = 30 juft. */
    cross: argv.includes('--cross'),
    withReference: argv.includes('--with-reference'),
  };
}

function listImages(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
    .sort()
    .map((f) => join(dir, f));
}

/** `top__ko-ylak.jpg` -> `top`. Prefiks yo'q yoki noma'lum bo'lsa `null`. */
function slotOf(file: string): string | null {
  const name = basename(file, extname(file));
  const slot = name.includes('__') ? name.split('__')[0]! : '';
  return SLOTS.has(slot) ? slot : null;
}

function buildPairs(persons: string[], garments: string[], cross: boolean): Pair[] {
  const pairs: Pair[] = [];
  const counter = new Map<string, number>();

  for (const [gi, garment] of garments.entries()) {
    const slot = slotOf(garment);
    if (!slot) continue;

    /*
     * ⚠️ SUKUT BO'YICHA AYLANMA, KO'PAYTMA EMAS. 3 odam × 20 kiyim = 60
     * juft bo'lardi va referens bilan $9 ketardi — holbuki bir kiyimni
     * uch odamda sinash sifat haqida deyarli yangi narsa aytmaydi.
     * Ko'proq kerak bo'lsa `--cross`.
     */
    const chosen = cross ? persons : [persons[gi % persons.length]!];

    for (const person of chosen) {
      const n = (counter.get(slot) ?? 0) + 1;
      counter.set(slot, n);
      pairs.push({
        id: `${slot}-${String(n).padStart(2, '0')}`,
        slot,
        person,
        garment,
      });
    }
  }
  return pairs;
}

/** Fayllarni `127.0.0.1` da beradigan qisqa umrli server. */
async function serveLocally(root: string): Promise<{ base: string; close: () => Promise<void> }> {
  const rootPath = resolve(root);

  const server: Server = createServer(async (req, res) => {
    try {
      const rel = decodeURIComponent((req.url ?? '/').replace(/^\//, ''));
      const target = resolve(rootPath, rel);

      // ⚠️ Papkadan tashqariga chiqishni bloklash (`../`).
      if (target !== rootPath && !target.startsWith(rootPath + sep)) {
        res.writeHead(403).end();
        return;
      }
      if (!existsSync(target)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream' });
      await pipeline(createReadStream(target), res);
    } catch {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    }
  });

  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const addr = server.address();
  if (typeof addr === 'string' || addr === null) throw new Error('Server manzili olinmadi');

  return {
    base: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise<void>((ok) => server.close(() => ok())),
  };
}

async function addReferences(pairs: Pair[], dir: string): Promise<number> {
  const { garmentKindForSlot, generateTryon } = await import('../src/integrations/openai');

  const refDir = join(dir, 'reference');
  mkdirSync(refDir, { recursive: true });

  const { base, close } = await serveLocally('.');
  const url = (p: string) => `${base}/${p.split(sep).map(encodeURIComponent).join('/')}`;
  let done = 0;

  try {
    for (const [i, pair] of pairs.entries()) {
      process.stdout.write(`  [${i + 1}/${pairs.length}] ${pair.id} ... `);
      try {
        /*
         * ⚠️ KETMA-KET, PARALLEL EMAS. `gpt-image` da tezlik chegarasi
         * bor va 429 dan keyin `generateTryon` qayta urinmaydi (ataylab —
         * har urinish pul). Ketma-ket yurish sekinroq, lekin natija
         * to'liq chiqadi.
         */
        const buffer = await generateTryon({
          modelImageUrl: url(pair.person),
          garmentImageUrl: url(pair.garment),
          kind: garmentKindForSlot(pair.slot),
        });
        const dest = join(refDir, `${pair.id}.png`);
        writeFileSync(dest, buffer);
        pair.reference = dest;
        done += 1;
        console.log('ok');
      } catch (err) {
        // Bitta referens yiqilsa qolganlari davom etsin — juft baribir
        // hisobotga tushadi, faqat solishtiruvchisiz.
        console.log(`yiqildi (${err instanceof Error ? err.message : String(err)})`);
      }
    }
  } finally {
    await close();
  }
  return done;
}

async function main(): Promise<number> {
  const { dir, out, cross, withReference } = parseArgs();

  /*
   * ⚠️ NISBIY YO'L `apps/api/` GA NISBATAN. npm workspace skriptini
   * workspace papkasida ishga tushiradi, repo ildizida emas. Ya'ni
   * `--dir bench-data` -> `apps/api/bench-data`. Papkani ildizda yasagan
   * odam uchun bu ko'rinmas tuzoq, shuning uchun hamma joyda ABSOLUT
   * yo'l chop etiladi.
   */
  const dirAbs = resolve(dir);
  const persons = listImages(join(dirAbs, 'person'));
  const garments = listImages(join(dirAbs, 'garment'));

  if (persons.length === 0 || garments.length === 0) {
    console.error(
      `Rasm topilmadi: ${dirAbs}\n\n` +
        `Kutilgan tuzilish:\n` +
        `  ${dirAbs}/person/   — to'liq bo'yli suratlar\n` +
        `  ${dirAbs}/garment/  — <slot>__<nom>.jpg  (slot: top | outer | bottom)\n`,
    );

    // Repo ildizida yasab qo'yilgan bo'lsa — eng ehtimolli xato, aytamiz.
    const atRoot = resolve(process.cwd(), '../..', dir);
    if (atRoot !== dirAbs && existsSync(atRoot)) {
      console.error(`Papka repo ildizida turibdi. Shuni bering:\n  --dir ${atRoot}\n`);
    }
    return 1;
  }

  const skipped = garments.filter((g) => !slotOf(g));
  const pairs = buildPairs(persons, garments, cross);

  if (pairs.length === 0) {
    console.error(
      'Slot prefiksi bo`lgan kiyim topilmadi. Fayl nomi `top__ko-ylak.jpg` ko`rinishida bo`lsin.',
    );
    return 1;
  }

  console.log(`\n${persons.length} odam × ${garments.length - skipped.length} kiyim -> ${pairs.length} juft`);
  const perSlot = new Map<string, number>();
  for (const p of pairs) perSlot.set(p.slot, (perSlot.get(p.slot) ?? 0) + 1);
  for (const [slot, n] of [...perSlot].sort()) console.log(`  ${slot.padEnd(8)} ${n}`);
  if (skipped.length) {
    console.log(`\n⚠️  Slot prefiksisiz ${skipped.length} fayl o'tkazib yuborildi:`);
    for (const f of skipped) console.log(`     ${basename(f)}`);
  }

  if (withReference) {
    const { isOpenAiEnabled } = await import('../src/integrations/openai');
    if (!isOpenAiEnabled()) {
      console.error('\nOPENAI_API_KEY sozlanmagan — referens yasab bo`lmaydi.');
      return 1;
    }
    console.log(
      `\nReferens yasalmoqda: ${pairs.length} rasm, taxminan $${(pairs.length * USD_PER_IMAGE).toFixed(2)}\n`,
    );
    const done = await addReferences(pairs, dirAbs);
    console.log(`\nReferens: ${done} / ${pairs.length}`);
  } else {
    console.log('\nReferenssiz — hisobotda faqat CatVTON ko`rinadi.');
    console.log('Yonma-yon solishtirish uchun: --with-reference');
  }

  const outAbs = resolve(out);
  writeFileSync(outAbs, JSON.stringify(pairs, null, 2) + '\n', 'utf8');
  console.log(`\n${outAbs} yozildi`);

  // ⚠️ ABSOLUT YO'L ATAYLAB: `bench.py` boshqa repodan (CatVTON) chaqiriladi,
  // ya'ni nisbiy yo'l u yerda ishlamaydi.
  console.log(`\nKeyingi qadam (CatVTON repo'sidan):\n  python3 api/bench.py ${outAbs} --api http://POD-MANZILI:8000\n`);
  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(1);
});
