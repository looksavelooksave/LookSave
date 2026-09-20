import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, text } from '../../theme/tokens';

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
      {/*
        Orqa fon — bir-birining ustiga tushgan neon romkalar (maketdagi
        3-rasm). Ilgari bu to'r chiziqlari edi; foydalanuvchi ularni
        olib tashlab, romkali fonni so'radi. Romkalar biroz burilgan va
        past shaffoflikda — gavdaga e'tibor tortmaydi, chuqurlik beradi.
      */}
      <View style={styles.frames} pointerEvents="none">
        <View style={[styles.frame, styles.frameA]} />
        <View style={[styles.frame, styles.frameB]} />
        <View style={[styles.frame, styles.frameC]} />
      </View>

      {/*
        Odam ORQASIDAGI nur — maketdagi binafsha halo.

        ⚠️ RADIAL GRADIENT EMAS, SOYA. React Native da radial gradient yo'q;
        `expo-linear-gradient` faqat chiziqli. Dumaloq View ning katta
        `shadowRadius` i iOS da aynan shunday yumshoq tarqaladi va qo'shimcha
        kutubxona talab qilmaydi.
      */}
      <View style={styles.auraOuter} pointerEvents="none">
        <View style={styles.auraL4} />
        <View style={styles.auraL3} />
        <View style={styles.auraMid} />
        <View style={styles.auraL1} />
        <View style={styles.auraInner} />
      </View>

      {/* Pastdagi nur — odam "platforma" ustida turgandek */}
      <Animated.View style={[styles.floorGlow, { opacity }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(139,92,246,0.28)', 'rgba(139,92,246,0)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {children ? (
        <View style={[StyleSheet.absoluteFill, dimmed && styles.dimmed]}>{children}</View>
      ) : source ? (
        <Image
          source={{ uri: source }}
          style={[styles.person, dimmed && styles.dimmed, zoomed && styles.personZoomed]}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.person} />
      )}

      {/*
        ── Pastki singdirish (fade) + PODIUM ──

        ⚠️ ODAMDAN KEYIN CHIZILADI, ATAYIN. Avatar rasmlari SON sohasida
        kesilgan (oyoq yo'q) — agar podium ortida qolsa, kesilgan oyoq
        podium ustidan chiqib, «disk ichiga tiqilgan oyoq» bo'lib ko'rinadi.
        Shuning uchun avval gavdaning pastki qismini qorong'iga singdiramiz,
        keyin podiumni OLDINDA chizamiz — figura pedestal ORTIDA turgandek,
        kesim chizig'i esa ko'rinmaydi.

        Bu kompozitsiya to'liq bo'yli avatar bo'lmaganda eng toza yechim;
        haqiqiy oyoq faqat avatar qayta yasalganda chiqadi.
      */}
      {!children ? (
        <LinearGradient
          colors={['rgba(5,5,9,0)', 'rgba(5,5,9,0.92)', '#050509']}
          locations={[0, 0.42, 0.68]}
          style={styles.bottomFade}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.podium} pointerEvents="none">
        <View style={styles.podiumSide} />
        <LinearGradient
          colors={['#3a2c66', '#181030']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={styles.podiumTop}
        />
        <View style={styles.podiumRim} />
      </View>

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

  /*
   * ── Orqa fon romkalari (maketdagi 3-rasm) ──
   *
   * ⚠️ NOZIK VA GAVDA ORTIDA. Ilgari ular yorqin va katta edi — bosh
   * ustidan o'tib, gavdadan e'tiborni tortardi. Endi past shaffoflik,
   * kichikroq o'lcham va biroz pastroq markaz (torsо ortida turadi).
   */
  frames: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 12,
  },
  frameA: {
    width: '52%',
    height: '58%',
    top: '20%',
    borderColor: 'rgba(124,58,237,0.28)',
    transform: [{ rotate: '-5deg' }],
  },
  frameB: {
    width: '46%',
    height: '62%',
    top: '18%',
    borderColor: 'rgba(139,92,246,0.22)',
    transform: [{ rotate: '4deg' }],
  },
  frameC: {
    width: '40%',
    height: '54%',
    top: '24%',
    borderColor: 'rgba(192,132,252,0.18)',
    transform: [{ rotate: '9deg' }],
  },

  /*
   * ⚠️ TOR VA PAST. Avval kadrning 70% kengligi va 18% balandligi edi —
   * oyoq ostida katta binafsha dog' bo'lib turardi va sahnaning eng
   * ko'zga tashlanadigan qismiga aylanib qolgandi. Nur odamni FONDAN
   * ajratish uchun, o'ziga e'tibor tortish uchun emas.
   */
  /*
   * ⚠️ SOYA EMAS, UCH QATLAM. Ilgari bu bitta dumaloq View edi va nurni
   * katta `shadowRadius` bergan. iOS uni har kadrda qayta hisoblaydi
   * (RN ogohlantiradi: «cannot calculate shadow efficiently») — iPhone 11
   * da sezilarli sekinlashish. Uchta shaffof doira bir xil yumshoq
   * o'tishni beradi va hech narsa hisoblanmaydi.
   */
  auraOuter: {
    position: 'absolute',
    alignSelf: 'center',
    top: '8%',
    width: 300,
    height: 300,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(139,92,246,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /*
   * Qatlamlar KO'P va har birining shaffofligi PAST. Uchta qatlamda
   * doiralarning qirrasi ko'rinib qolardi — beshtasida o'tish yumshoq
   * bo'ladi va baribir hech narsa hisoblanmaydi.
   */
  auraL4: {
    position: 'absolute',
    width: 264,
    height: 264,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(139,92,246,0.035)',
  },
  auraL3: {
    position: 'absolute',
    width: 228,
    height: 228,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(139,92,246,0.035)',
  },
  auraMid: {
    position: 'absolute',
    width: 192,
    height: 192,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(139,92,246,0.035)',
  },
  auraL1: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(139,92,246,0.035)',
  },
  auraInner: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(139,92,246,0.04)',
  },
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
  person: { position: 'absolute', top: '2%', left: 0, right: 0, bottom: '13%' },

  /*
   * Pastki singdirish — gavdaning kesilgan pastki qismini qorong'iga
   * eritadi. Podium shu zona ichida, uning ustida turadi.
   */
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  dimmed: { opacity: 0.35 },
  /*
   * 1.45 — tajribada tanlangan. Kamrog'i sezilmaydi, ko'prog'ida bosh
   * ramkadan chiqib ketadi va kiyim o'rniga bo'yin ko'rinadi.
   * Kelib chiqish nuqtasi pastda: yaqinlashganda odam gavdaning USTKI
   * qismini ko'rmoqchi bo'ladi, oyoq emas.
   */
  personZoomed: { transform: [{ scale: 1.45 }, { translateY: 40 }] },

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
    left: '21%',
    right: '25%',
    bottom: '8%',
    height: 50,
  },
  // Yon devor — diskka qalinlik beradi
  podiumSide: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 14,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: '#120c22',
  },
  // Yaltiroq usti — gradient bilan
  podiumTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 30,
    borderRadius: 999,
  },
  // Yuqori qirradagi yorug'lik — yaltiroqlik shu bilan seziladi
  podiumRim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.45)',
  },

  label: { position: 'absolute' },
  labelValue: { ...text.h3, color: colors.text, fontVariant: ['tabular-nums'] },
  labelUnit: { ...text.tiny, color: colors.textMuted, marginTop: -2 },
});
