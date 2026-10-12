import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

/**
 * Ilk ochilish onboarding'i ko'rilganmi — qurilmada saqlanadi.
 *
 * ⚠️ NEGA KERAK. App Store 4.3(b) «nega bu ilova boshqalardan farq qiladi?»
 * degan savolga javob kutadi. Onboarding aynan shu javob: ilk ochilishda uch
 * ekran LookSave'ning uchta o'ziga xosligini aytadi (AI kiyintirish, shaxsiy
 * avatar, yaqin do'konlar). Lekin u FAQAT BIR MARTA ko'rinishi kerak —
 * ko'rgan odam har ochganda qayta ko'rsa bezor bo'ladi.
 *
 * ⚠️ `SecureStore` — SIR UCHUN EMAS, loyihaning yagona qurilma-lokal ombori
 * shu (`aiFlowStore` dagi izoh: `AsyncStorage` qo'shilmagan). «Ko'rildi»
 * bayrog'i maxfiy ma'lumot emas.
 *
 * ⚠️ `seen === null` — HALI O'QILMAGAN. Splash shu holatда ushlab turiladi
 * (`app/_layout.tsx` — `appReady`), aks holda kirish nuqtasi onboarding'ni
 * ko'rsatish kerakmi-yo'qmi bilmasdan `(tabs)` ga sakrab, keyin onboarding
 * uning ustidan ochilib, miltillash bo'lardi.
 */
const SEEN_KEY = 'onboarding.seen';

interface OnboardingState {
  /** `null` — hali o'qilmagan; `true`/`false` — ko'rilgan/ko'rilmagan */
  seen: boolean | null;
  /** Ilova ochilganда bayroqni qurilmadan tiklaydi */
  restore: () => Promise<void>;
  /** Onboarding tugadi (yoki o'tkazib yuborildi) — qayta ko'rsatilmaydi */
  complete: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  seen: null,

  restore: async () => {
    try {
      const raw = await SecureStore.getItemAsync(SEEN_KEY);
      set({ seen: raw === '1' });
    } catch (err) {
      /*
       * O'qib bo'lmasa onboarding'ni KO'RSATMAYMIZ (`seen: true`). Sabab:
       * o'qish xatosi kamdan-kam va u takrorlansa, foydalanuvchi har
       * ochishда onboarding'ni qayta ko'rardi — bu haqiqiy ilk-ochilishdan
       * yomonroq. Ilk marta esa `getItemAsync` xato emas, `null` qaytaradi.
       */
      console.warn('[onboarding] bayroq o`qilmadi', err);
      set({ seen: true });
    }
  },

  complete: () => {
    // Avval holatni o'zgartiramiz — navigatsiya darhol ishlasin; yozuv fonда.
    set({ seen: true });
    void SecureStore.setItemAsync(SEEN_KEY, '1').catch((err: unknown) => {
      console.warn('[onboarding] bayroq saqlanmadi', err);
    });
  },
}));
