import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { colors, radius, spacing, text } from '../theme/tokens';

/**
 * Sotuvchi bo'limi uchun yagona premium sarlavha.
 *
 * NEGA YAGONA: panel, mahsulotlar, sozlamalar va yangi mahsulot ekranlari
 * bir xil ko'rinishda bo'lishi uchun. Ilgari har ekran o'z sarlavhasini
 * chizardi va ular bir-biriga mos kelmasdi (biri gradient, biri tekis,
 * matn o'lchamlari har xil).
 *
 * ⚠️ Ildiz Stack bu bo'limda sarlavha chizmaydi (`headerShown: false`),
 * shuning uchun status paneli ostidagi bo'shliq QO'LDA qo'yiladi.
 */
export function SellerHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** O'ng tomondagi amal (masalan qo'ng'iroq yoki qo'shish). Bo'lmasa bo'sh joy. */
  right?: ReactNode;
}): JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#1D1636', '#120E1C', colors.bg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Orqaga"
          hitSlop={8}
          onPress={onBack}
          style={styles.iconButton}
        >
          <Icon name="back" size={20} color={colors.accent} />
        </Pressable>

        <Text style={styles.eyebrow}>
          LOOK<Text style={styles.eyebrowAccent}>SAVE</Text> · SELLER
        </Text>

        <View style={styles.rightSlot}>{right ?? null}</View>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(20, 18, 28, 0.74)',
  },
  eyebrow: { ...text.wordmark, fontSize: 11, letterSpacing: 2.5, color: colors.textMuted },
  eyebrowAccent: { color: colors.accent },
  rightSlot: { minWidth: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  title: { ...text.h1, color: colors.text, marginTop: spacing.xs },
  subtitle: { ...text.body, color: colors.textMuted },
});
