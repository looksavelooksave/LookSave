import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme/tokens';

/**
 * Do'kon logosi — rasm bo'lsa rasm, bo'lmasa birinchi harf + barqaror rang.
 *
 * ⚠️ TZ 1-qism, "Qo'shimcha o'zgarishlar / 01": sotuvchi logosini yuklay
 * oladi, lekin ko'pchiligida hali logo yo'q — avval bir xil pin ikonka
 * ko'rinardi, barcha do'kon bir xil edi. Endi do'kon nomidan rang
 * olinadi va birinchi harf chiqadi, har do'kon farqlanadi.
 *
 * ⚠️ RANG — NOMDAN. Palette qisqa va o'zgarmaydi; nomning hash yig'indisi
 * modulo palette uzunligi — shu bois bitta do'kon har safar bir xil
 * rang oladi (foydalanuvchi "nega ikki ko'rinishga ega" demaydi).
 */

interface StoreLogoProps {
  logoUrl: string | null | undefined;
  name: string;
  size?: number;
  style?: ViewStyle;
}

const PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: 'rgba(168,85,247,0.18)', fg: '#c084fc' },
  { bg: 'rgba(96,165,250,0.18)', fg: '#60a5fa' },
  { bg: 'rgba(248,113,113,0.16)', fg: '#f87171' },
  { bg: 'rgba(74,222,128,0.16)', fg: '#4ade80' },
  { bg: 'rgba(232,121,249,0.16)', fg: '#e879f9' },
  { bg: 'rgba(251,191,36,0.16)', fg: '#fbbf24' },
  { bg: 'rgba(34,211,238,0.16)', fg: '#22d3ee' },
];

function pickPalette(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length]!;
}

function firstLetter(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  // Birinchi grafem — Unicode uchun ishonchli; mobile JS odatda intl'ni
  // qo'llab-quvvatlaydi, bo'lmasa oddiy charAt'ga tushamiz.
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const first = seg.segment(trimmed)[Symbol.iterator]().next().value;
    return (first?.segment ?? trimmed.charAt(0)).toUpperCase();
  } catch {
    return trimmed.charAt(0).toUpperCase();
  }
}

export function StoreLogo({ logoUrl, name, size = 52, style }: StoreLogoProps): JSX.Element {
  const dim: ViewStyle = { width: size, height: size, borderRadius: radius.md };

  if (logoUrl) {
    return (
      <View style={[styles.wrap, dim, style]}>
        <Image source={{ uri: logoUrl }} style={styles.image} resizeMode="cover" />
      </View>
    );
  }

  const palette = pickPalette(name);
  const letter = firstLetter(name);
  const fontSize = Math.round(size * 0.42);

  return (
    <View style={[styles.wrap, dim, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.letter, { color: palette.fg, fontSize }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: '100%', height: '100%' },
  letter: { fontWeight: '800', letterSpacing: 0.5 },
});
