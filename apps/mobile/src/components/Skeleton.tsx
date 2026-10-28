import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens';

/**
 * Yuklanish skeletonlari — kontentning shakli oldindan ko'rsatiladi.
 *
 * ⚠️ NEGA AYLANUVCHI INDIKATOR EMAS: bo'sh ekran o'rtasidagi spinner
 * foydalanuvchiga nima kutayotganini aytmaydi va kutish uzoqroq tuyuladi.
 * Skeleton esa joylashuvni oldindan chizadi — kontent kelganda ekran
 * sakramaydi va o'tish bir tekis bo'ladi. Bu sezilgan tezlikni oshiradi,
 * garchi haqiqiy tezlik o'zgarmasa ham.
 *
 * ⚠️ `react-native-reanimated` ISHLATILMAYDI: u o'rnatilgan, lekin
 * `babel.config.js` da plagini yo'q — worklet'lar ishlamaydi. RN'ning
 * `Animated` i esa `useNativeDriver` bilan JS oqimini band qilmaydi.
 */

/**
 * BITTA umumiy puls — barcha skeletonlar uchun.
 *
 * ⚠️ NEGA MODUL DARAJASIDA: har blok o'z animatsiyasini boshlasa, ular
 * turli vaqtda yonib-o'chadi va ro'yxat titrayotgandek ko'rinadi. Bitta
 * manba hammasini bir maromda ushlab turadi — bu arzon va qimmat
 * ko'rinishning orasidagi asosiy farq.
 */
const pulse = new Animated.Value(0);
let running = false;

function startPulse(): void {
  if (running) return;
  running = true;

  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 0,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]),
  ).start();
}

/** Bitta to'rtburchak — matn qatori, rasm yoki tugma o'rnida. */
export function Skeleton({
  width,
  height,
  aspectRatio,
  radius: r = radius.sm,
  style,
}: {
  width?: ViewStyle['width'];
  height?: number;
  /** Balandlik o'rniga nisbat — rasm o'rnini egallaganda kerak */
  aspectRatio?: number;
  radius?: number;
  style?: ViewStyle;
}): JSX.Element {
  useEffect(startPulse, []);

  return (
    <Animated.View
      // Ekran o'quvchisi skeletonni o'qimasligi kerak — u mazmun emas
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: width ?? '100%',
          // Nisbat berilsa balandlik undan hisoblanadi
          ...(aspectRatio ? { aspectRatio } : { height: height ?? 14 }),
          borderRadius: r,
          backgroundColor: colors.surface2,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
        },
        style,
      ]}
    />
  );
}

/**
 * Matn bloki — bir necha qator.
 *
 * Oxirgi qator qisqaroq: haqiqiy matn ham shunday tugaydi va bu kichik
 * tafsilot blokni "yuklanmoqda" emas, "matn" qilib ko'rsatadi.
 */
export function SkeletonText({ lines = 2 }: { lines?: number }): JSX.Element {
  return (
    <View style={styles.textBlock}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} height={12} width={index === lines - 1 ? '62%' : '100%'} />
      ))}
    </View>
  );
}

/** Mahsulot kartasining ichki chekkasi — haqiqiy karta shu qiymatdan oladi. */
export const CARD_PADDING = spacing.sm;
/** Sarlavha va narxning rasm chetidan qo'shimcha siljishi. */
export const CARD_TEXT_INSET = spacing.xs;

/**
 * Mahsulot kartasi — katalog va bosh sahifadagi to'r uchun.
 *
 * ⚠️ HAQIQIY KARTANING NUSXASI: bir xil quti (fon, chegara, chekka), 3:4
 * rasm, sarlavha qatori va narx + savat tugmasi qatori. Ilgari skeleton
 * uch qator matndan iborat edi, karta esa ikki qator va tugmadan — ma'lumot
 * kelganda to'r balandligi o'zgarib, ekran sakrardi.
 */
export function SkeletonCard(): JSX.Element {
  return (
    <View style={styles.card}>
      <Skeleton aspectRatio={3 / 4} radius={radius.md} />
      <View style={styles.cardText}>
        <Skeleton height={14} width="80%" />
        <View style={styles.cardPriceRow}>
          <Skeleton height={16} width="48%" />
          <Skeleton width={36} height={36} radius={radius.md} />
        </View>
      </View>
    </View>
  );
}

/** Ro'yxat qatori — buyurtma, do'kon, savat uchun. */
export function SkeletonRow(): JSX.Element {
  return (
    <View style={styles.row}>
      <Skeleton width={56} height={56} radius={radius.md} />
      <View style={styles.rowText}>
        <Skeleton height={13} width="70%" />
        <Skeleton height={11} width="45%" />
      </View>
    </View>
  );
}

/**
 * To'r ko'rinishidagi kutish holati.
 *
 * `count` — nechta karta. Ekranga sig'adigan miqdordan ko'p bermang:
 * ko'rinmaydigan skeleton foyda bermaydi, faqat animatsiyani og'irlashtiradi.
 */
export function SkeletonGrid({ count = 4 }: { count?: number }): JSX.Element {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

/** Ro'yxat ko'rinishidagi kutish holati. */
export function SkeletonList({ count = 5 }: { count?: number }): JSX.Element {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  textBlock: { gap: spacing.xs },

  /*
   * ⚠️ `maxWidth`, `minWidth` EMAS — bu to'rni buzgan xato edi.
   *
   * `flex: 1` bilan element `flexBasis: 0` oladi va bo'sh joyni to'liq
   * egallaydi. `minWidth` uni CHEKLAMAYDI, faqat pastki chegara qo'yadi —
   * natijada har karta butun qatorni oldi va ikki ustun o'rniga bitta
   * ustun chiqdi.
   *
   * 48.5% — haqiqiy mahsulot kartasi bilan bir xil qiymat
   * (`(tabs)/index.tsx`). Skeleton kontentning shaklini takrorlashi kerak,
   * aks holda ma'lumot kelganda joylashuv sakraydi.
   */
  card: {
    flex: 1,
    maxWidth: '48.5%',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardText: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1, gap: spacing.xs },

  /*
   * ⚠️ `padding` YO'Q, `gap` — karta to'ri bilan bir xil (`spacing.sm`).
   * Skeleton ro'yxat sarlavhasi ichida turadi, ro'yxatning o'zida esa
   * allaqachon `padding: spacing.md` bor — ikkinchi chekka skeletonni
   * haqiqiy kartalardan torroq va ichkariroq qilib qo'yardi.
   */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { gap: spacing.md, padding: spacing.md },
});
