import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../src/components/Icon';
import { useI18n } from '../src/i18n';
import { useOnboardingStore } from '../src/store/onboardingStore';
import { images } from '../src/theme/images';
import { colors, radius, spacing, text } from '../src/theme/tokens';

/**
 * Ilk ochilish onboarding'i — App Store 4.3(b) uchun «nega bu farq qiladi?».
 *
 * ⚠️ UCH SLAYD, UCH O'ZIGA XOSLIK. Har biri LookSave'ni oddiy do'kon
 * ilovasidan ajratadigan bitta narsani aytadi: AI kiyintirish, shaxsiy
 * avatar, yaqin do'konlar. Matn i18n'da (`onboarding`) — to'rt tilda.
 *
 * ⚠️ FAQAT BIR MARTA. Tugma bosilганда (yoki «o'tkazish») bayroq qurilmaga
 * yoziladi (`onboardingStore`) va kirish nuqtasi (`app/index.tsx`) boshqa
 * onboarding'ga yo'naltirmaydi. Ekran o'zini `complete()` dan keyin
 * `(tabs)` ga `replace` qiladi — orqaga qaytib yana ko'rinmasin.
 */

interface Slide {
  icon: IconName;
  title: string;
  body: string;
}

export default function Onboarding(): JSX.Element {
  const t = useI18n((state) => state.t);
  const router = useRouter();
  const complete = useOnboardingStore((state) => state.complete);
  const { width } = useWindowDimensions();

  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = [
    { icon: 'tryon', title: t.onboarding.slide1Title, body: t.onboarding.slide1Body },
    { icon: 'profile', title: t.onboarding.slide2Title, body: t.onboarding.slide2Body },
    { icon: 'stores', title: t.onboarding.slide3Title, body: t.onboarding.slide3Body },
  ];

  const last = index >= slides.length - 1;

  const finish = (): void => {
    complete();
    router.replace('/(tabs)');
  };

  const onNext = (): void => {
    if (last) {
      finish();
      return;
    }
    const next = index + 1;
    setIndex(next);
    listRef.current?.scrollToOffset({ offset: next * width, animated: true });
  };

  // Svaypда joriy slaydni aniqlaymiz — nuqtalar va tugma matni shunга qarab
  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    if (page !== index) setIndex(page);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Yuqori qator: logotip + o'tkazish */}
      <View style={styles.top}>
        <View style={styles.brand}>
          <Image source={images.logoMark} style={styles.logo} resizeMode="contain" />
          <Text style={styles.wordmark}>LOOK SAVE</Text>
        </View>
        <Pressable
          onPress={finish}
          hitSlop={12}
          accessibilityRole="button"
          style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.skipText}>{t.onboarding.skip}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.icon}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {/* Glow doira — ikonka LookSave urg'usida nurlab turadi */}
            <View style={styles.glowOuter}>
              <View style={styles.glowInner}>
                <Icon name={item.icon} size={52} color={colors.accent} />
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      {/* Pastki qism: nuqtalar + tugma */}
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <View key={slide.icon} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.ctaText}>{last ? t.onboarding.start : t.onboarding.next}</Text>
          <View style={styles.ctaChevron}>
            <Icon name="next" size={18} color={colors.text} />
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const GLOW = 180;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 30, height: 21 },
  wordmark: { ...text.wordmark, color: colors.accent },
  skip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  skipText: { ...text.bodyMed, color: colors.textMuted },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  // Tashqi yumshoq nurlanish
  glowOuter: {
    width: GLOW,
    height: GLOW,
    borderRadius: GLOW / 2,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  // Ichki to'liq doira — ikonka shu yerda
  glowInner: {
    width: GLOW - 48,
    height: GLOW - 48,
    borderRadius: (GLOW - 48) / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...text.h1, color: colors.text, textAlign: 'center' },
  body: { ...text.body, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },

  bottom: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface3,
  },
  dotActive: { width: 24, backgroundColor: colors.accent },

  cta: {
    height: 58,
    borderRadius: radius.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  ctaText: { ...text.h3, color: colors.text },
  ctaChevron: { position: 'absolute', right: spacing.md },
});
