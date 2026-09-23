import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoreProfile, updateStoreProfile, uploadStoreImage } from '../../src/api/endpoints';
import { ApiError } from '../../src/api/client';
import { Icon } from '../../src/components/Icon';
import { Button, ErrorView, Field, Loading, Screen } from '../../src/components/ui';
import { colors, radius, spacing, text } from '../../src/theme/tokens';
import { goBack } from '../../src/navigation/back';

/**
 * Do'kon sozlamalari.
 *
 * ⚠️ FAQAT MATNLI MAYDONLAR. Ish vaqti jadvali va xaritadagi nuqta bu
 * yerda yo'q: ular murakkab tanlagich talab qiladi va telefonda noqulay
 * chiqadi. Ular veb-panelda qoladi — bu yerda esa eng tez-tez
 * o'zgaradigan narsalar: nom, telefon, manzil, tavsif.
 */
export default function StoreSettings(): JSX.Element {
  /*
   * ⚠️ Ildiz Stack bu bo'limda sarlavha chizmaydi (`headerShown: false`),
   * shuning uchun status paneli ostidagi bo'shliq QO'LDA qo'yiladi.
   * Aks holda sarlavha soat va batareya ustiga chiqib ketadi.
   */
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const profile = useQuery({ queryKey: ['store', 'profile'], queryFn: getStoreProfile });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    landmark: '',
    description: '',
    logoUrl: null as string | null,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Serverdagi qiymatlar kelgach formani to'ldiramiz
  useEffect(() => {
    if (!profile.data) return;
    setForm({
      name: profile.data.name,
      phone: profile.data.phone,
      address: profile.data.address,
      landmark: profile.data.landmark ?? '',
      description: profile.data.description ?? '',
      logoUrl: profile.data.logoUrl,
    });
  }, [profile.data]);

  // Logo tanlash — galereyadan olib, omborga yuklab, formaga yozamiz
  const pickLogo = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Ruxsat kerak', 'Logo tanlash uchun galereyaga ruxsat bering.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    setError(null);
    try {
      const url = await uploadStoreImage(result.assets[0].uri);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      setSaved(false);
    } catch {
      setError('Logo yuklanmadi — qaytadan urinib ko`ring');
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: updateStoreProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      setSaved(true);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Saqlanmadi'),
  });

  if (profile.isLoading) return <Loading />;
  if (profile.isError || !profile.data) {
    return <ErrorView error={profile.error} onRetry={() => void profile.refetch()} />;
  }

  const store = profile.data;

  const set = (key: keyof typeof form) => (value: string) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Orqaga"
          hitSlop={10}
          onPress={() => goBack('/seller')}
          style={styles.back}
        >
          <Icon name="back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Do`kon sozlamalari</Text>
        <View style={styles.back} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Holat</Text>
            <Text style={styles.statusValue}>
              {store.status === 'active' ? 'Faol — katalogda ko`rinadi' : store.status}
            </Text>
          </View>

          {/* Do'kon logosi — katalogda va TOP BRANDS'da ko'rinadi */}
          <Text style={styles.fieldLabel}>DO`KON LOGOSI</Text>
          <View style={styles.logoRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Logo tanlash"
              onPress={() => void pickLogo()}
              disabled={uploading}
              style={styles.logoBox}
            >
              {uploading ? (
                <ActivityIndicator color={colors.accent} />
              ) : form.logoUrl ? (
                <Image source={{ uri: form.logoUrl }} style={styles.logoImage} resizeMode="cover" />
              ) : (
                <Icon name="shop" size={26} color={colors.textDim} />
              )}
            </Pressable>
            <View style={styles.logoActions}>
              <Button
                title={form.logoUrl ? 'Logoni o`zgartirish' : 'Logo tanlash'}
                variant="ghost"
                loading={uploading}
                onPress={() => void pickLogo()}
              />
              {form.logoUrl ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setForm((prev) => ({ ...prev, logoUrl: null }))}
                  hitSlop={8}
                >
                  <Text style={styles.logoRemove}>Olib tashlash</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Field label="Do`kon nomi" value={form.name} onChangeText={set('name')} />
          <Field
            label="Telefon"
            value={form.phone}
            onChangeText={set('phone')}
            keyboardType="phone-pad"
          />
          <Field label="Manzil" value={form.address} onChangeText={set('address')} />
          <Field label="Mo`ljal" value={form.landmark} onChangeText={set('landmark')} />
          <Field
            label="Tavsif"
            value={form.description}
            onChangeText={set('description')}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saved ? <Text style={styles.saved}>Saqlandi</Text> : null}

          <Button
            title="Saqlash"
            loading={save.isPending}
            onPress={() =>
              save.mutate({
                name: form.name.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                landmark: form.landmark.trim() || null,
                description: form.description.trim() || null,
                logoUrl: form.logoUrl,
              })
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...text.h3, color: colors.text, flex: 1, textAlign: 'center' },

  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusLabel: { ...text.tiny, color: colors.textDim },
  fieldLabel: {
    ...text.tiny,
    color: colors.textDim,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoActions: { flex: 1, gap: spacing.xs },
  logoRemove: { ...text.small, color: colors.danger, paddingVertical: spacing.xs },
  statusValue: { ...text.bodyMed, color: colors.success, marginTop: 2 },

  error: { ...text.small, color: colors.danger, marginBottom: spacing.sm },
  saved: { ...text.small, color: colors.success, marginBottom: spacing.sm },
});
