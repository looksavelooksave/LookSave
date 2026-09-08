import { getTryonStores } from '@/api/endpoints';
import { isLocale } from '@/i18n/locale';
import { auth } from '@/session.server';

import type { Route } from './+types/try-on.stores';

/**
 * AI kiyintirishga mos do'konlar — BFF resurs marshruti.
 *
 * ⚠️ `/stores` SAHIFASIDAGI RO'YXAT EMAS. U do'konlarni 3D modellari
 * bo'yicha sanaydi; bu yerda esa AI kiyintira oladigan kiyimlar
 * sanaladi va o'lcham filtri ham hisobga olinadi — ya'ni «12 ta kiyim»
 * yozuvi foydalanuvchi ichkariga kirganda ko'radigan son bilan bir xil.
 *
 * ⚠️ ALOHIDA MARSHRUT, `state` ICHIDA EMAS. Do'konlar ro'yxati faqat
 * panel ochilganda kerak; holat esa har ikki soniyada so'raladi. Bitta
 * javobga qo'shilsa har pollingda do'konlar ham qayta sanalardi.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const context = await auth(request, locale);

  const headers = context.setCookie ? { 'Set-Cookie': context.setCookie } : undefined;

  if (!context.user) {
    return Response.json({ stores: [], error: 'Kirish kerak' }, { status: 401, headers });
  }

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));

  try {
    const stores = await getTryonStores(
      {
        // Koordinata bo'lmasa masofa hisoblanmaydi — ro'yxat kiyim soni bo'yicha keladi
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        gender: url.searchParams.get('gender'),
        size: url.searchParams.get('size'),
      },
      context.options,
    );

    return Response.json({ stores, error: null }, { headers });
  } catch (error) {
    return Response.json(
      { stores: [], error: error instanceof Error ? error.message : 'Do`konlar yuklanmadi' },
      { headers },
    );
  }
}
