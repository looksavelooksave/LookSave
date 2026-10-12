import { Redirect } from 'expo-router';

import { useOnboardingStore } from '../src/store/onboardingStore';

/**
 * Kirish nuqtasi.
 *
 * ⚠️ KIRISH SO'RALMAYDI. Ilgari bu yerda auth holati tekshirilib,
 * kirmagan foydalanuvchi `welcome` ekraniga yuborilardi — ya'ni ilovani
 * ochgan odam birinchi ko'radigan narsa parol so'rovi bo'lardi.
 *
 * Magazin ilovasida bu noto'g'ri: katalogni ko'rish, do'konlarni izlash va
 * narxlarni solishtirish uchun akkaunt kerak emas. Kirish faqat shaxsiy
 * qismga o'tganda so'raladi — profil, buyurtma, avatar.
 *
 * O'sha ekranlar `SignInRequired` bilan o'zini himoya qiladi.
 *
 * ⚠️ FAQAT ILK OCHILISHDA ONBOARDING. `seen === false` bo'lsa — qurilmada
 * bayroq yo'q, ya'ni ilova ilk marta ochilyapti: onboarding ko'rsatiladi.
 * `seen` bu yerда hech qachon `null` bo'lmaydi — splash uni o'qib bo'lguncha
 * ushlab turadi (`_layout.tsx` — `appReady`), shuning uchun miltillash yo'q.
 */
export default function Index(): JSX.Element {
  const seen = useOnboardingStore((state) => state.seen);
  if (seen === false) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
