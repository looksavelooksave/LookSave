import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, text } from '../../theme/tokens';

const PODIUM_IMAGE = require('../../../assets/tryon-podium.png');
const STUDIO_BACKGROUND = require('../../../assets/tryon-studio-bg.png');

/**
 * Avatar sahnasi — mijoz maketidagi ko'rinish.
 *
 * Qorong'i fon, to'r chiziqlari, gavda atrofidagi neon halqalar va chetdagi
 * o'lchov yozuvlari. Odam bularning orasida turadi.
 *
 * ⚠️ 3D EMAS, KOMPOZITSIYA. Maketdagi rasm ham 3D render emas —
 * fotorealistik surat ustiga qo'yilgan bezak. Shuni takrorlaymiz: AI
 * yasagan (yoki foydalanuvchi yuklagan) suratdan odam kesib olinadi va
 * shu sahnaga qo'yiladi.
 *
 * Bu yondashuvning ustunligi: sahna BEPUL va DARHOL chiziladi, har
 * o'zgarishda AI chaqirilmaydi.
 *
 * ⚠️ KESIM BO'LMASA HAM ISHLAYDI. `cutoutUrl` yo'q bo'lsa oddiy surat
 * ko'rsatiladi — u och kulrang fonli bo'ladi, lekin ekran buzilmaydi.
 * Kesim serverda yasaladi va u yerda nosozlik bo'lishi mumkin.
 */

export interface StageMeasurements {
  height?: number;
  weight?: number;
  waist?: number;
  shoeSize?: number;
}

export function AvatarStage({
  imageUrl,
  cutoutUrl,
  measurements,
  dimmed = false,
  showRings = true,
  zoomed = false,
  children,
}: {
  imageUrl: string | null;
  cutoutUrl?: string | null;
  measurements?: StageMeasurements;
  /** Kutish paytida surat xiralashadi */
  dimmed?: boolean;
  /** Halqalar va o'lchovlar — kiyintirish paytida chalg'itmasin uchun o'chiriladi */
  showRings?: boolean;
  /**
   * Yaqinlashtirish — kiyim tafsilotini ko'rish uchun.
   *
   * ⚠️ FAQAT SURAT KATTALASHADI, sahna emas. To'r, platforma va halqalar
   * joyida qoladi: ular o'lcham mo'ljali bo'lib xizmat qiladi va ular ham
   * kattalashsa, foydalanuvchi nimaga nisbatan yaqinlashganini yo'qotadi.
   */
  zoomed?: boolean;
  /**
   * Suratning O'RNIGA qo'yiladigan tarkib — svayp tasmasi uchun.
   *
   * ⚠️ NEGA ALMASHTIRADI, USTIGA QO'SHMAYDI. Svayp tasmasi o'zi surat
   * chizadi; ostida yana bir `<Image>` qolsa, karta qiyshayganda uning
   * chetidan eski surat ko'rinib turardi.
   *
   * Sahnaning qolgan bezagi (to'r, platforma, halqalar, o'lchovlar)
   * saqlanadi — ular tasma ustidan o'tadi va maketdagi ko'rinish
   * buzilmaydi.
   */
  children?: ReactNode;
}): JSX.Element {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    /*
     * Halqalar sekin "nafas oladi". Aylanish emas, kattalashib-kichrayish:
     * aylanish e'tiborni tortadi va kiyimga qarashga xalaqit qiladi,
     * sekin puls esa sahnani tirik qiladi, lekin ko'zni charchatmaydi.
     */
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Pastdagi nur sekin "nafas oladi" (halqalar olib tashlangach faqat shu qoldi)
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.95] });

  // Kesim bor bo'lsa u ustun: faqat u qorong'i fonda to'g'ri ko'rinadi
  const source = cutoutUrl ?? imageUrl;

  return (
    <View style={styles.root}>
      <Image
        source={STUDIO_BACKGROUND}
        style={styles.studioBackground}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(5,5,9,0.42)', 'rgba(5,5,9,0.28)', 'rgba(5,5,9,0.5)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Pastdagi nur — odam "platforma" ustida turgandek */}
      <Animated.View style={[styles.floorGlow, { opacity }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(139,92,246,0.28)', 'rgba(139,92,246,0)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Podium avatar ortida chiziladi: oyoqlar uning ustida turib ko'rinadi. */}
      <View style={styles.podium} pointerEvents="none">
        <Image source={PODIUM_IMAGE} style={styles.podiumImage} resizeMode="contain" />
      </View>

      {children ? (
        <View
          style={[
            styles.swipeFrame,
            zoomed && styles.personFrameZoomed,
            dimmed && styles.dimmed,
          ]}
        >
          {children}
        </View>
      ) : source ? (
        <Image
          source={{ uri: source }}
          style={[
            styles.personFrame,
            dimmed && styles.dimmed,
            zoomed && styles.personFrameZoomed,
          ]}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.personFrame} />
      )}

      {/* Pastdagi yengil fade sahnani ilova foniga yumshoq ulaydi. */}
      <LinearGradient
        colors={['rgba(5,5,9,0)', 'rgba(5,5,9,0.42)', 'rgba(5,5,9,0.82)']}
        locations={[0, 0.62, 1]}
        style={styles.bottomFade}
        pointerEvents="none"
      />

      {/*
        ⚠️ GAVDANI KESIB O'TGAN HALQALAR OLIB TASHLANDI (2026-09-20).
        Ilgari 34% va 56% da ikkita neon ellips gavdadan o'tardi —
        foydalanuvchi ularni «aylanachalar» deb, olib tashlashni so'radi.
        Podium (pastdagi) va orqa fon romkalari qoldi.
      */}

      {/* O'lchovlar — maketdagi joylashuvda */}
      {showRings && measurements ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {measurements.height ? (
            <Label value={String(Math.round(measurements.height))} unit="cm" pos="topLeft" />
          ) : null}
          {measurements.weight ? (
            <Label value={String(Math.round(measurements.weight))} unit="kg" pos="midRight" />
          ) : null}
          {measurements.waist ? (
            <Label value={String(Math.round(measurements.waist))} unit="cm" pos="lowLeft" />
          ) : null}
          {measurements.shoeSize ? (
            <Label value={String(Math.round(measurements.shoeSize))} unit="EU" pos="lowRight" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const POSITIONS = {
  topLeft: { top: '10%', left: spacing.md },
  midRight: { top: '46%', right: spacing.md },
  lowLeft: { top: '68%', left: spacing.md },
  lowRight: { top: '82%', right: spacing.md },
} as const;

function Label({
  value,
  unit,
  pos,
}: {
  value: string;
  unit: string;
  pos: keyof typeof POSITIONS;
}): JSX.Element {
  return (
    <View style={[styles.label, POSITIONS[pos]]}>
      <Text style={styles.labelValue}>{value}</Text>
      <Text style={styles.labelUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * ⚠️ SOF QORA, brend foni (#0A0A0F) emas. Sahna ilova fonidan
   * SEZILARLI qorong'iroq bo'lishi kerak — aks holda ramka bilinmaydi va
   * "sahna" hissi yo'qoladi.
   */
  /*
   * ⚠️ CHETKI CHIZIQ (border) OLIB TASHLANDI (2026-09-20) — foydalanuvchi
   * so'radi. Sahna endi ilova foniga chegarasiz qo'shiladi; orqa fon
   * romkalari o'zi «sahna» hissini beradi.
   */
  root: {
    flex: 1,
    backgroundColor: '#050509',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },

  studioBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  floorGlow: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    bottom: 0,
    height: '10%',
    borderRadius: 999,
    overflow: 'hidden',
  },

  /*
   * ⚠️ PASTDA JOY QOLDIRILADI. Boshqaruv tugmalari sahna ostida yotiq qator
   * bo'lib turadi va odam to'liq ekranni egallasa, ular oyoq ustiga
   * tushadi. 14% — tugmalar balandligi va biroz nafas.
   */
  /*
   * ⚠️ ORQAROQ OLINDI (2026-09-20). Ilgari `top: 0, bottom: 14%` edi va
   * gavda sahnani to'ldirib, kesilgan pastki qismi podium bilan qo'shilib
   * ketardi. `top: 5%, bottom: 20%` — figura kichrayadi va yuqoriroq
   * turadi, pastda podium uchun joy qoladi.
   *
   * ⚠️ Avatar rasmlari SON sohasida kesilgan (oyoq yo'q) — bu rasm
   * cheklovi, UI emas. Orqaroq olish podium kompozitsiyasini beradi,
   * lekin haqiqiy oyoq faqat to'liq bo'yli avatar qayta yasalganda chiqadi.
   */
  personFrame: {
    position: 'absolute',
    top: '4%',
    left: '8%',
    right: '8%',
    bottom: '3%',
  },
  swipeFrame: { ...StyleSheet.absoluteFillObject },

  /*
   * Pastki singdirish — gavdaning kesilgan pastki qismini qorong'iga
   * eritadi. Podium shu zona ichida, uning ustida turadi.
   */
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '22%' },
  dimmed: { opacity: 0.35 },
  /*
   * 1.45 — tajribada tanlangan. Kamrog'i sezilmaydi, ko'prog'ida bosh
   * ramkadan chiqib ketadi va kiyim o'rniga bo'yin ko'rinadi.
   * Kelib chiqish nuqtasi pastda: yaqinlashganda odam gavdaning USTKI
   * qismini ko'rmoqchi bo'ladi, oyoq emas.
   */
  personFrameZoomed: { transform: [{ scale: 1.38 }, { translateY: 34 }] },

  /*
   * ⚠️ KENGLIK GAVDAGA YAQIN. Avval 12% edi — halqa deyarli butun kadrni
   * egallab, gavdani o'ragandek emas, ustidan o'tgan katta to'rtburchakdek
   * ko'rinardi. Odam kadrning o'rtadagi ~45% ini egallaydi, halqa esa
   * undan bir oz kengroq bo'lishi kerak.
   */
  /*
   * ── Podium (maketdagi 2-rasm) ──
   *
   * ⚠️ OYOQ OSTIDA, PAST. Ilgari u yuqorida (son sohasida) va juda
   * yorqin edi. Endi sahnaning tagiga tushirilgan va rangi bosiqroq —
   * odam ustida turgandek ko'rinadi, e'tibor tortmaydi.
   */
  podium: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    bottom: '-11%',
    height: '36%',
  },
  podiumImage: { width: '100%', height: '100%' },

  label: { position: 'absolute' },
  labelValue: { ...text.h3, color: colors.text, fontVariant: ['tabular-nums'] },
  labelUnit: { ...text.tiny, color: colors.textMuted, marginTop: -2 },
});
