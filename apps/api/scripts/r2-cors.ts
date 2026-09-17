/**
 * R2 bucketlariga CORS siyosatini qo'yadi va tekshiradi.
 *
 * ⚠️ NEGA KERAK. Surat yuklash IKKI QADAMLI: server imzolangan havola
 * beradi, brauzer esa faylni TO'G'RIDAN-TO'G'RI R2 ga `PUT` qiladi
 * (`PhotoStep.tsx` — `upload`). Ikkinchi qadam boshqa manzilga so'rov,
 * ya'ni brauzer avval `OPTIONS` preflight yuboradi. Bucketda CORS
 * bo'lmasa R2 uni `403 CORS not configured for this bucket` bilan rad
 * etadi va `fetch` javob qaytarmay otib ketadi.
 *
 * Bu holat SERVER LOGIDA KO'RINMAYDI: preflight API ga umuman
 * bormaydi, to'g'ri R2 ga boradi. Shuning uchun tekshiruv shu yerda.
 *
 * ⚠️ HAR IKKALA BUCKET KERAK. `face` va `body` sozlangan bo'lsa
 * shaxsiy bucketga tushadi (`PRIVATE_PURPOSES`) — ya'ni yuz skaneri
 * aynan o'sha bucketga yozadi. Ochiq bucketga CORS qo'yib, shaxsiysini
 * unutish — xatoni yarim tuzatish.
 *
 * ⚠️ `*` ISHLATILMAYDI. Imzolangan havola qo'lga tushsa, ruxsat etilgan
 * manzillar ro'yxati qolgan himoya bo'lib qoladi.
 *
 * Ishga tushirish (repo ildizidan):
 *
 *   npm run r2:cors --workspace=apps/api             # tekshirish
 *   npm run r2:cors --workspace=apps/api -- --apply  # qo'yish
 */

import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';
import type { CORSRule } from '@aws-sdk/client-s3';

import { env } from '../src/config/env';

/**
 * Ruxsat etilgan manzillar.
 *
 * ⚠️ DEV PORTLARI ORALIQ BILAN. Vite band portni ko'rsa keyingisiga
 * o'tadi (`vite.config.ts` da 5173/5174/5175), ya'ni sayt amalda
 * 5177 da ham ochilishi mumkin. Bittasini yozib qo'yish — ertaga
 * yana o'sha xatoga tushish.
 */
const ORIGINS = [
  'https://looksave.app',
  // ⚠️ www ham kerak — bucketda qo'lda qo'yilgan edi va ro'yxatda bo'lmagani
  // uchun `--apply` uni jimgina o'chirib yuborardi
  'https://www.looksave.app',
  'https://store.looksave.app',
  'https://admin.looksave.app',
  // developer_ai paneli — operator natija suratini to'g'ridan-to'g'ri yuklaydi
  'https://ai.looksave.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
];

/**
 * ⚠️ SARLAVHALAR `presignUpload` BILAN BIR XIL BO'LISHI SHART.
 * U `Content-Type` va `Cache-Control` qaytaradi va brauzer ikkalasini
 * ham yuboradi (`integrations/r2.ts`). Ro'yxatda bo'lmagan sarlavha
 * preflight'ni yiqitadi.
 */
const RULE: CORSRule = {
  AllowedOrigins: ORIGINS,
  AllowedMethods: ['GET', 'PUT', 'HEAD'],
  AllowedHeaders: ['content-type', 'cache-control'],
  ExposeHeaders: ['ETag'],
  MaxAgeSeconds: 3600,
};

function client(): S3Client {
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT } = env();
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
    throw new Error('R2 sozlanmagan — apps/api/.env dagi R2_* qiymatlarini tekshiring');
  }
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

/** Sozlangan bucketlar. Shaxsiysi bo'sh bo'lsa ro'yxatga kirmaydi. */
function buckets(): Array<{ name: string; label: string }> {
  const list = [{ name: env().R2_BUCKET_ASSETS, label: 'ochiq' }];
  if (env().R2_BUCKET_PRIVATE) {
    list.push({ name: env().R2_BUCKET_PRIVATE, label: 'shaxsiy' });
  }
  return list;
}

async function readCors(s3: S3Client, Bucket: string): Promise<CORSRule[] | null> {
  try {
    const out = await s3.send(new GetBucketCorsCommand({ Bucket }));
    return out.CORSRules ?? [];
  } catch {
    // R2 sozlanmagan bucketda xato qaytaradi — bu "yo'q" degani, nosozlik emas
    return null;
  }
}

async function main(): Promise<number> {
  const apply = process.argv.includes('--apply');
  const s3 = client();
  const targets = buckets();

  if (!env().R2_BUCKET_PRIVATE) {
    console.log('⚠️  R2_BUCKET_PRIVATE bo`sh — faqat ochiq bucket sozlanadi.');
    console.log('   Shaxsiy bucket yoqilganda (D-43) shu skriptni QAYTA yurgizing.\n');
  }

  let missing = 0;

  for (const { name, label } of targets) {
    const before = await readCors(s3, name);
    console.log(`${name}  (${label})`);
    console.log(`  hozir: ${before === null ? 'CORS YO`Q' : `${before.length} qoida`}`);

    if (!apply) {
      // ⚠️ MAVJUD QOIDA CHOP ETILADI. Nima turganini ko'rsatmasdan
      // "1 qoida bor" deyish — ustiga yozish xavfini yashirish demak.
      if (before && before.length > 0) {
        console.log(JSON.stringify(before, null, 2).split('\n').map((l) => `  ${l}`).join('\n'));
      }
      if (before === null || before.length === 0) missing += 1;
      continue;
    }

    await s3.send(
      new PutBucketCorsCommand({ Bucket: name, CORSConfiguration: { CORSRules: [RULE] } }),
    );

    const after = await readCors(s3, name);
    const ok = after !== null && after.length > 0;
    console.log(`  natija: ${ok ? '✅ qo`yildi' : '❌ qo`yilmadi'}`);
    if (!ok) missing += 1;
  }

  if (!apply && missing > 0) {
    console.log(`\n${missing} ta bucketda CORS yo'q. Qo'yish uchun:`);
    console.log('  npm run r2:cors --workspace=apps/api -- --apply');
  }
  if (apply) {
    console.log('\nRuxsat etilgan manzillar:');
    for (const o of ORIGINS) console.log(`  ${o}`);
  }

  return missing > 0 && apply ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
