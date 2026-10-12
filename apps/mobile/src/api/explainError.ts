import type { Dictionary } from '../i18n';
import { ApiError } from './client';

/**
 * Server xatosini foydalanuvchi tiliga o'girilgan matnga aylantiradi.
 *
 * ⚠️ NEGA KERAK. `ApiError.message` SERVERDAN keladi va u o'zbekcha
 * (`apps/api` dagi throw'lar qattiq o'zbekcha). Uni to'g'ridan-to'g'ri
 * ekranda ko'rsatsak, qurilmasi ruscha/inglizcha bo'lgan foydalanuvchi
 * o'zbekcha matn ko'rardi — App Store 4.3(b) uchun aynan «tugallanmagan»
 * taassurot. Shuning uchun matn EMAS, barqaror `code` tarjima qilinadi.
 *
 * ⚠️ MATN EMAS, KOD. `code` hech qachon o'zgarmaydi (`shared-types`
 * `ERROR_CODES`), shuning uchun u ishonchli kalit. Serverning o'zbekcha
 * xabari e'tiborsiz qoldiriladi — faqat kod muhim.
 *
 * ⚠️ UMUMIY KODLAR UMUMIY MATN OLADI. `VALIDATION_ERROR`, `INVALID_STATE`
 * va shu kabilar ko'p turli holatda ishlatiladi; ularning aniq o'zbekcha
 * matnini mijoz tomonda tiklab bo'lmaydi, shuning uchun ular `generic` ga
 * tushadi. Aniq ko'rsatma kerak bo'lgan joy (masalan avatar «yuz kerak»)
 * o'z ekranida alohida lokalizatsiya qilinadi, bu yerga tayanmaydi.
 *
 * ⚠️ `ApiError` BO'LMASA HAM `generic`. Tasodifiy `Error` (masalan
 * kutilmagan istisno) ham xom matn bilan ekranga chiqmasligi kerak.
 */
export function explainError(err: unknown, t: Dictionary): string {
  if (!(err instanceof ApiError)) return t.errors.generic;

  const e = t.errors;
  switch (err.code) {
    case 'NETWORK':
      return e.network;
    case 'OUT_OF_RANGE':
      return e.outOfRange;
    case 'LIMIT_REACHED':
      return e.limitReached;
    case 'RATE_LIMITED':
    case 'OTP_TOO_SOON':
      return e.rateLimited;
    case 'PHONE_NOT_VERIFIED':
    case 'INVALID_PHONE':
      return e.phoneNotVerified;
    case 'BLOCKED':
    case 'RESTRICTED':
      return e.blocked;
    case 'FORBIDDEN':
      return e.forbidden;
    case 'OUT_OF_STOCK':
      return e.outOfStock;
    case 'NOT_FOUND':
      return e.notFound;
    case 'UNAUTHORIZED':
    case 'TOKEN_EXPIRED':
    case 'TOKEN_INVALID':
      return e.sessionExpired;
    case 'SERVICE_UNAVAILABLE':
      return e.serviceUnavailable;
    default:
      // VALIDATION_ERROR, INVALID_STATE, ALREADY_EXISTS, INTERNAL_ERROR,
      // BAD_REQUEST — aniq matni mijozda yo'q, umumiy xabar.
      return e.generic;
  }
}
