import { z } from 'zod';

import {
  addToCart,
  presignProfileUpload,
  requestAvatar,
  requestAvatarAngle,
  requestRender,
  requestRenderBatch,
  setBodyPhoto,
  setFacePhoto,
  updateMeasurements,
} from '@/api/endpoints';
import { isLocale } from '@/i18n/locale';
import { auth } from '@/session.server';

import type { Route } from './+types/try-on.act';

/**
 * Kiyintirish amallari — BFF resurs marshruti.
 *
 * ⚠️ NEGA BITTA MARSHRUT, `op` BILAN. Har amal uchun alohida fayl
 * bo'lsa oltita marshrut chiqardi va ularning hammasi bir xil narsani
 * qilardi: sessiyani o'qish, tokenni olish, API ga uzatish, cookie'ni
 * qaytarish. Farq faqat oxirgi qatorda.
 *
 * ⚠️ `op` RO'YXATI YOPIQ (zod). Ochiq qoldirilsa bu marshrut istalgan
 * API chaqiruvini foydalanuvchi nomidan bajaradigan umumiy proksiga
 * aylanardi.
 *
 * ⚠️ SURATNING O'ZI BU YERDAN O'TMAYDI. `presign` faqat imzo beradi,
 * faylni brauzer to'g'ridan-to'g'ri R2 ga yuboradi — aks holda har
 * surat SSR serverining xotirasi va kanalidan o'tardi.
 */

const bodySchema = z.discriminatedUnion('op', [
  /** Avatar yasashni boshlaydi (yuz surati saqlangandan keyin) */
  z.object({ op: z.literal('avatar') }),

  z.object({ op: z.literal('angle'), angle: z.enum(['front', 'side', 'back']) }),

  z.object({
    op: z.literal('render'),
    variantId: z.string().uuid(),
    angle: z.enum(['front', 'side', 'back']).default('front'),
    baseRenderId: z.string().uuid().nullish(),
  }),

  z.object({
    op: z.literal('batch'),
    variantIds: z.array(z.string().uuid()).min(1).max(30),
    angle: z.enum(['front', 'side', 'back']).default('front'),
    baseRenderId: z.string().uuid().nullish(),
  }),

  /*
   * ⚠️ TURLAR ROYXATI CHEKLANGAN: `avatar`, `face` va `body`. Mahsulot
   * va do'kon rasmlari boshqa marshrutdan yuklanadi va ular sotuvchi
   * rolini talab qiladi — bu yerga tushib qolsa har qanday
   * foydalanuvchi katalog rasmini almashtira olardi.
   */
  z.object({
    op: z.literal('presign'),
    purpose: z.enum(['avatar', 'face', 'body']),
    /*
     * ⚠️ API SXEMASI BILAN BIR XIL RO'YXAT (`presignSchema`). Ilgari
     * bu yerda `z.string()` turardi va mos kelmagan tur API'ga yetib
     * borib, u yerda 422 bo'lardi — foydalanuvchi esa faqat
     * «Ma`lumotlar to`liq emas» ni ko'rardi.
     */
    contentType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
    /* API'da MAJBURIY — kengaytmani aniqlash uchun ishlatiladi */
    fileName: z.string().trim().min(1).max(200),
  }),

  z.object({ op: z.literal('face'), url: z.string().url().max(500) }),
  z.object({ op: z.literal('bodyPhoto'), url: z.string().url().max(500) }),

  z.object({ op: z.literal('measurements'), values: z.record(z.number()) }),

  z.object({
    op: z.literal('cart'),
    lines: z
      .array(z.object({ variantId: z.string().uuid(), chosenSize: z.string().min(1).max(16) }))
      .min(1)
      .max(9),
  }),
]);

export async function action({ params, request }: Route.ActionArgs) {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const context = await auth(request, locale);

  const headers = context.setCookie ? { 'Set-Cookie': context.setCookie } : undefined;

  if (!context.user) {
    return Response.json({ error: 'Kirish kerak', signedIn: false }, { status: 401, headers });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    /*
     * ⚠️ QAYSI MAYDON YIQILGANI AYTILADI. Ilgari javob faqat quruq
     * «So`rov noto`g`ri» edi va sabab hech qayerda ko'rinmasdi —
     * yetishmayotgan bitta maydonni topish uchun butun zanjirni
     * qo'lda tekshirishga to'g'ri kelardi.
     *
     * Bu ichki BFF marshruti: `bodySchema` mijozning O'Z kodidan
     * keladigan shaklni tekshiradi, foydalanuvchi kiritmasini emas.
     * Ya'ni bu yerda maydon nomlarini ochish sir oshkor qilmaydi —
     * u faqat o'z xatomizni ko'rsatadi.
     */
    const fields = parsed.error.issues.map((i) => `${i.path.join('.') || '(ildiz)'}: ${i.message}`);
    return Response.json({ error: 'So`rov noto`g`ri', fields }, { status: 400, headers });
  }

  const input = parsed.data;
  const options = context.options;

  try {
    switch (input.op) {
      case 'avatar':
        return Response.json({ data: await requestAvatar(options) }, { headers });

      case 'angle':
        return Response.json({ data: await requestAvatarAngle(input.angle, options) }, { headers });

      case 'render':
        return Response.json(
          {
            data: await requestRender(
              {
                variantId: input.variantId,
                angle: input.angle,
                baseRenderId: input.baseRenderId ?? null,
              },
              options,
            ),
          },
          { headers },
        );

      case 'batch':
        return Response.json(
          {
            data: await requestRenderBatch(
              {
                variantIds: input.variantIds,
                angle: input.angle,
                baseRenderId: input.baseRenderId ?? null,
              },
              options,
            ),
          },
          { headers },
        );

      case 'presign':
        return Response.json(
          {
            data: await presignProfileUpload(
              {
                purpose: input.purpose,
                contentType: input.contentType,
                fileName: input.fileName,
              },
              options,
            ),
          },
          { headers },
        );

      case 'face':
        await setFacePhoto(input.url, options);
        return Response.json({ data: { ok: true } }, { headers });

      case 'bodyPhoto':
        return Response.json({ data: await setBodyPhoto(input.url, options) }, { headers });

      case 'measurements':
        return Response.json(
          { data: await updateMeasurements(input.values, options) },
          { headers },
        );

      /*
       * ⚠️ KETMA-KET, PARALLEL EMAS. Savat endpointi bitta qator qabul
       * qiladi va parallel yuborilsa savatning bir vaqtdagi o'zgarishi
       * bir-birini bosib ketishi mumkin.
       */
      case 'cart': {
        for (const line of input.lines) {
          await addToCart({ variantId: line.variantId, size: line.chosenSize }, options);
        }
        return Response.json({ data: { added: input.lines.length } }, { headers });
      }
    }
  } catch (error) {
    /*
     * Server xato matnini o'zbekcha beradi («Kunlik chegara tugadi…») —
     * uni o'zgartirmasdan uzatamiz. Kod ham beriladi: sahifa
     * `RATE_LIMITED` ni xato emas, banner sifatida ko'rsatadi.
     */
    const code = (error as { code?: string }).code ?? null;
    return Response.json(
      { error: error instanceof Error ? error.message : 'Amal bajarilmadi', code },
      { status: 400, headers },
    );
  }
}
