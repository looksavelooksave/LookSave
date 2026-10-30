import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { Icon } from '../../src/components/Icon';
import { useI18n } from '../../src/i18n';
import { colors, text } from '../../src/theme/tokens';

/**
 * Sotuvchi paneli — alohida tab bar.
 *
 * ⚠️ MIJOZ TAB BAR'IDAN FARQ QILADI. Sotuvchiga 3D kiyintirish, savat
 * yoki sevimlilar kerak emas; unga buyurtma, mahsulot, statistika va
 * sozlamalar kerak. Shuning uchun bu bo'lak o'z Tabs qatorini yuritadi.
 *
 * `href: null` bilan belgilangan ekranlar tabda ko'rinmaydi, lekin
 * router orqali ochilishi mumkin (apply, product-new).
 */
export default function SellerLayout(): JSX.Element {
  const t = useI18n((state) => state.t);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.sellerTabs.dashboard,
          tabBarIcon: ({ color, size }) => <Icon name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t.sellerTabs.orders,
          tabBarIcon: ({ color, size }) => <Icon name="orders" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t.sellerTabs.products,
          tabBarIcon: ({ color, size }) => <Icon name="shop" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t.sellerTabs.analytics,
          tabBarIcon: ({ color, size }) => <Icon name="premium" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.sellerTabs.settings,
          tabBarIcon: ({ color, size }) => <Icon name="settings" size={size} color={color} />,
        }}
      />
      {/* Tabda ko'rinmaydigan ekranlar — qo'yishga arzimaydi, lekin ochilishi mumkin */}
      <Tabs.Screen name="apply" options={{ href: null }} />
      <Tabs.Screen name="product-new" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 86 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  tabLabel: { ...text.tiny, fontWeight: '600' },
});
