import { UTApi } from 'uploadthing/server';

import { env } from '../config/env';

/**
 * UploadThing integratsiyasi — mahsulot, logo va avatar rasmlari uchun
 * muqobil ombor (asosiysi R2). Token bo'sh bo'lsa — xizmat o'chirilgan,
 * yuklash eskicha R2 orqali ketaveradi.
 *
 * ⚠️ NEGA KERAK. R2 presign + ilovaning streaming PUT'i allaqachon tez
 * (3 marta tezlashtirilgan edi, `0c48d86`), lekin bir qator mintaqalardan
 * UploadThing CDN kechikishi R2 ga nisbatan past bo'ladi. Shunga qaramay,
 * eski rasmlar hamon R2'da yashaydi — bu modul ularni ko'chirmaydi.
 */

let cached: UTApi | null = null;

export function isUploadthingReady(): boolean {
  return env().UPLOADTHING_TOKEN.length > 0;
}

export function uploadthing(): UTApi {
  if (!isUploadthingReady()) {
    throw new Error('UPLOADTHING_TOKEN bo‘sh — UploadThing sozlanmagan');
  }
  if (!cached) {
    cached = new UTApi({ token: env().UPLOADTHING_TOKEN });
  }
  return cached;
}

/**
 * Server orqali faylni UploadThing'ga joylaydi va omma manzilini qaytaradi.
 *
 * Fayl Node `Buffer` yoki `Blob` sifatida kelishi mumkin. Nom qo'shilgan
 * eslatma — ombor ichida inson o'qiydigan nom qoladi, lekin URL noyob
 * `fileKey` orqali shakllanadi.
 */
export async function uploadToUploadthing(
  data: Buffer,
  filename: string,
  contentType: string,
): Promise<{ url: string; key: string }> {
  const file = new File([new Uint8Array(data)], filename, { type: contentType });
  const result = await uploadthing().uploadFiles(file);
  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? 'UploadThing xatosi');
  }
  return { url: result.data.ufsUrl, key: result.data.key };
}
