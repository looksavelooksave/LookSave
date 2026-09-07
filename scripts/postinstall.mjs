/**
 * Root postinstall — patch-package'ni himoya bilan ishga tushiradi.
 *
 * Yagona patch — expo-localization (MOBIL bog'liqlik). Veb deploy'ga
 * u umuman kerak emas: expo-localization saytning bundle'iga kirmaydi.
 *
 * ⚠️ NEGA HIMOYA KERAK: Vercel'da npm qandaydir sozlama tufayli root
 * bog'liqliklarni o'rnatmaydi (lokal aynan o'sha node 24.19 / npm 11.17
 * bilan uch marta takrorlashda hammasi joyida edi — ya'ni ayb repoda
 * emas). Paket yo'qligida oddiy `patch-package` chaqiruvi butun
 * deploy'ni yiqitardi.
 *
 * ⚠️ JIM O'TKAZIB YUBORISH FAQAT VERCEL'DA. Boshqa har qanday muhitda
 * (lokal, EAS, CI) paket topilmasa BALAND xato beramiz: u yerlarda
 * patch haqiqatan kerak va jim o'tkazish mobil bug'ni qaytaradi.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);

let entry;
try {
  entry = require.resolve('patch-package');
} catch {
  if (process.env.VERCEL) {
    console.warn('[postinstall] patch-package o\'rnatilmagan — Vercel muhiti, patch veb uchun keraksiz, o\'tkazib yuborildi.');
    process.exit(0);
  }
  console.error('[postinstall] patch-package topilmadi — bu muhitda patch MAJBURIY (expo-localization). `npm install` to\'liq o\'tganini tekshiring.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [entry], { stdio: 'inherit' });
process.exit(result.status ?? 1);
