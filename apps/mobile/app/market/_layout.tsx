import { Stack } from 'expo-router';

import { colors } from '../../src/theme/tokens';

/**
 * Market ichma-ich oqimi (do'konlar → kategoriyalar). Ekranlar o'z
 * sarlavhalarini chizadi — ildiz Stack sarlavha qo'ymasin.
 */
export default function MarketLayout(): JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
