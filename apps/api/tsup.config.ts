import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  sourcemap: true,
  clean: true,
  // Workspace paketlari TypeScript manba sifatida eksport qilinadi —
  // ular bundle ichiga kiritilishi SHART, aks holda runtime'da topilmaydi.
  noExternal: [/^@looksave\//],
  /*
   * ⚠️ NATIV PAKETLAR HECH QACHON BUNDLE'GA KIRMAYDI.
   *
   * `sharp` API da to'g'ridan-to'g'ri import qilinadi, lekin ilgari
   * `package.json` da YO'Q edi (`@imgly/background-removal-node` orqali
   * tasodifan o'rnatilgan). tsup faqat e'lon qilingan bog'liqliklarni
   * tashqarida qoldiradi — shuning uchun `sharp` ESM build ichiga
   * tiqilib, `require("util")` da yiqilardi:
   *   Error: Dynamic require of "util" is not supported
   * Serverda 2026-09-18 da ko'rilgan. U `package.json` ga qo'shildi;
   * bu ro'yxat esa keyingi safar kimdir e'lon qilishni unutsa ham himoya qiladi.
   */
  external: ['sharp', 'onnxruntime-node', '@imgly/background-removal-node'],
});
