import { Stack } from 'expo-router';

import { colors } from '../../src/theme/tokens';

export default function AuthLayout(): JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitle: '',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />

      {/*
        sign-in va sign-up uchun header va qora fon olib tashlanadi.
        contentStyle: transparent — ImageBackground status bar ostiga to'liq chiqadi.
        animation: 'slide_from_right' — tabiiy iOS navigatsiya hissi.
      */}
      <Stack.Screen
        name="sign-in"
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
