import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, text } from '../theme/tokens';

/**
 * Razmer tanlash — chiplar qatori (XS … 3XL yoki 35 … 46).
 *
 * ⚠️ NEGA RAQAM KIRITISH EMAS. Ilgari ko'krak, bel va son aylanasi
 * santimetrda so'ralardi — oddiy xaridor ularni o'lchay olmaydi va
 * taxminiy raqam yozardi. O'z razmerini («L», «42») esa har kim biladi,
 * do'kon ham aynan shu razmerlar bilan ishlaydi.
 *
 * Tanlangan chip qayta bosilsa tanlov bekor bo'ladi — majburiy emas.
 */
export function SizeChips<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly T[];
  value: T | null | undefined;
  onChange: (next: T | null) => void;
  accessibilityLabel: string;
}): JSX.Element {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const active = value === option;
        return (
          <Pressable
            key={String(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(active ? null : option)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && !active && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minWidth: 52,
    height: 40,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: 'rgba(139,92,246,0.18)' },
  chipPressed: { backgroundColor: colors.surface3 },
  chipText: { ...text.bodyMed, color: colors.textMuted },
  chipTextActive: { color: colors.text },
});
