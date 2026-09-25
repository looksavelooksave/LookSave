import { rm, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

/**
 * Kengaytma to'plami.
 *
 * ⚠️ BUNDLER SHART, IXTIYORIY EMAS. MV3 da service worker ES modullarini
 * qo'llaydi, lekin CONTENT SCRIPT qo'llamaydi — u oddiy skript bo'lib
 * yuklanadi va `import` qatori sahifada `SyntaxError` beradi.
 *
 * ⚠️ SHU SABABDAN IKKI XIL FORMAT. Worker va popup — `esm`, content script
 * esa `iife`. Bitta formatga yig'ilsa content script jim o'ladi: sahifa
 * ochiladi, kengaytma esa hech qachon javob bermaydi.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist');
const watch = process.argv.includes('--watch');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(resolve(root, 'public'), out, { recursive: true });

const common = {
  outdir: out,
  bundle: true,
  target: 'chrome120',
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
};

const builds = [
  {
    ...common,
    format: 'esm',
    entryPoints: {
      background: resolve(root, 'src/background/index.ts'),
      popup: resolve(root, 'src/popup/index.ts'),
    },
  },
  {
    ...common,
    format: 'iife',
    entryPoints: {
      content: resolve(root, 'src/content/index.ts'),
      bridge: resolve(root, 'src/bridge/index.ts'),
    },
  },
];

if (watch) {
  for (const options of builds) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
  }
  console.log('kuzatilmoqda…');
} else {
  /*
   * ⚠️ KETMA-KET, `Promise.all` EMAS. Ikki build parallel ketganda
   * esbuild'ning xulosa qatorlari bir-birini bosib ketadi va chiqishda
   * fayllarning bir qismi KO'RINMAY QOLADI (`bridge.js` shunday yo'qolgan
   * edi). Fayllar to'g'ri yozilgan bo'lsa ham, jurnalga qarab «ko'prik
   * yig'ilmabdi» degan xulosa chiqadi. Har biri 3 ms — yutuq yo'q,
   * chalg'itish bor.
   */
  for (const options of builds) await esbuild.build(options);
}
