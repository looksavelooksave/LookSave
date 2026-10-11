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
  TextInput,
  View,
} from 'react-native';
import {
  getMyBrand,
  getStoreProfile,
  saveMyBrand,
  updateStoreProfile,
  uploadStoreImage,
  type StoreBrandInput,
  type WorkingHour,
} from '../../src/api/endpoints';
import { ApiError } from '../../src/api/client';
import { Icon } from '../../src/components/Icon';
import { SellerHeader } from '../../src/components/SellerHeader';
import { Button, ErrorView, Field, Loading, Screen } from '../../src/components/ui';
import { colors, radius, spacing, text } from '../../src/theme/tokens';
import { goBack } from '../../src/navigation/back';

/**
 * Do'kon sozlamalari.
 *
 * Ish vaqti va yetkazish sozlamalari ham shu yerda tahrirlanadi — do'konchi
 * telefondan ishlaydi, veb-paneldan foydalanish kutilmaydi.
 */

const DAYS: { day: number; label: string }[] = [
  { day: 1, label: 'Dushanba' },
  { day: 2, label: 'Seshanba' },
  { day: 3, label: 'Chorshanba' },
  { day: 4, label: 'Payshanba' },
  { day: 5, label: 'Juma' },
  { day: 6, label: 'Shanba' },
  { day: 7, label: 'Yakshanba' },
];

function hoursToMap(hours: WorkingHour[]): Record<number, WorkingHour> {
  return Object.fromEntries(hours.map((hour) => [hour.day, hour]));
}

/**
 * "10:5" kabi qisqa yozuvni "10:05" ga aylantiradi va soat/daqiqa
 * chegarasidan tashqarini o'zgartiradi. Bo'sh qolsa `'00:00'` qaytaradi
 * — server bo'sh qatorni qabul qilmaydi.
 */
function normalizeTime(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4).padStart(4, '0');
  const hoursNum = Math.min(23, Number(digits.slice(0, 2)));
  const minutesNum = Math.min(59, Number(digits.slice(2, 4)));
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(hoursNum)}:${pad(minutesNum)}`;
}

/**
 * Yozayotganda ":" ni avtomatik qo'yadi: "1015" → "10:15". Foydalanuvchi
 * o'zi ":" tergan bo'lsa uni takrorlamaydi.
 */
function formatWhileTyping(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function StoreSettings(): JSX.Element {
  /*
   * ⚠️ Ildiz Stack bu bo'limda sarlavha chizmaydi (`headerShown: false`),
   * shuning uchun status paneli ostidagi bo'shliq QO'LDA qo'yiladi.
   * Aks holda sarlavha soat va batareya ustiga chiqib ketadi.
   */
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
  const [hours, setHours] = useState<Record<number, WorkingHour>>({});
  const [delivery, setDelivery] = useState({
    enabled: false,
    pickup: true,
    radiusKm: '15',
    fee: '0',
    freeFrom: '' as string,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
    setHours(hoursToMap(profile.data.workingHours ?? []));
    setDelivery({
      enabled: profile.data.delivery.enabled,
      pickup: profile.data.pickupEnabled,
      radiusKm: (profile.data.delivery.radiusM / 1000).toString(),
      fee: profile.data.delivery.fee,
      freeFrom: profile.data.delivery.freeFrom ?? '',
    });
  }, [profile.data]);

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
    mutationFn: () => {
      const workingHours = DAYS.map(({ day }) => {
        const hour = hours[day];
        return {
          day,
          open: normalizeTime(hour?.open ?? '10:00'),
          close: normalizeTime(hour?.close ?? '20:00'),
          closed: hour?.closed ?? false,
        };
      });

      const radiusM = Math.round(Math.max(0.5, Number(delivery.radiusKm) || 0) * 1000);
      const feeAmount = delivery.fee.trim() === '' ? '0' : delivery.fee.trim();
      const freeFromAmount = delivery.freeFrom.trim() === '' ? null : delivery.freeFrom.trim();

      return updateStoreProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        landmark: form.landmark.trim() || null,
        description: form.description.trim() || null,
        logoUrl: form.logoUrl,
        workingHours,
        deliveryEnabled: delivery.enabled,
        pickupEnabled: delivery.pickup,
        deliveryRadiusM: radiusM,
        deliveryFee: feeAmount,
        freeDeliveryFrom: freeFromAmount,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['store'] });
      setSaved(true);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Saqlanmadi'),
  });

  // ── Mening brendim (@username bilan) — do'kondan alohida yozuv, alohida saqlash ──
  const brand = useQuery({ queryKey: ['store', 'brand'], queryFn: getMyBrand });
  const [brandForm, setBrandForm] = useState({
    name: '',
    username: '',
    description: '',
    logoUrl: null as string | null,
  });
  const [brandUploading, setBrandUploading] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);

  useEffect(() => {
    if (brand.data === undefined) return;
    setBrandForm({
      name: brand.data?.name ?? '',
      username: brand.data?.username ?? '',
      description: brand.data?.description ?? '',
      logoUrl: brand.data?.logoUrl ?? null,
    });
  }, [brand.data]);

  const setBrand = (key: keyof typeof brandForm) => (value: string) => {
    setBrandSaved(false);
    setBrandForm((current) => ({ ...current, [key]: value }));
  };

  const pickBrandLogo = async (): Promise<void> => {
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

    setBrandUploading(true);
    setBrandError(null);
    try {
      const url = await uploadStoreImage(result.assets[0].uri);
      setBrandForm((prev) => ({ ...prev, logoUrl: url }));
      setBrandSaved(false);
    } catch {
      setBrandError('Logo yuklanmadi — qaytadan urinib ko`ring');
    } finally {
      setBrandUploading(false);
    }
  };

  const saveBrand = useMutation({
    mutationFn: (input: StoreBrandInput) => saveMyBrand(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['store', 'brand'] });
      setBrandSaved(true);
      setBrandError(null);
    },
    onError: (err) => setBrandError(err instanceof ApiError ? err.message : 'Saqlanmadi'),
  });

  const brandUsername = brandForm.username.trim().replace(/^@/, '').toLowerCase();
  const brandValid = brandForm.name.trim().length >= 2 && brandUsername.length >= 3;

  if (profile.isLoading) return <Loading />;
  if (profile.isError || !profile.data) {
    return <ErrorView error={profile.error} onRetry={() => void profile.refetch()} />;
  }

  const store = profile.data;

  const set = (key: keyof typeof form) => (value: string) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setHour = (day: number, patch: Partial<WorkingHour>): void => {
    setSaved(false);
    setHours((prev) => ({
      ...prev,
      [day]: {
        day,
        open: prev[day]?.open ?? '10:00',
        close: prev[day]?.close ?? '20:00',
        closed: prev[day]?.closed ?? false,
        ...patch,
      },
    }));
  };

  const setDeliveryField = <K extends keyof typeof delivery>(key: K, value: (typeof delivery)[K]) => {
    setSaved(false);
    setDelivery((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Screen>
      <SellerHeader
        title="Sozlamalar"
        subtitle="Do`kon profili va ish vaqti"
        onBack={() => goBack('/seller')}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.statusCard}>
            <View style={styles.statusCardText}>
              <Text style={styles.statusLabel}>DO`KON HOLATI</Text>
              <Text style={styles.statusValue}>
                {store.status === 'active' ? 'Faol — katalogda ko`rinadi' : store.status}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                store.status === 'active' ? styles.statusBadgeOn : styles.statusBadgeOff,
              ]}
            >
              <View
                style={[
                  styles.statusBadgeDot,
                  { backgroundColor: store.status === 'active' ? colors.success : colors.textDim },
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: store.status === 'active' ? colors.success : colors.textMuted },
                ]}
              >
                {store.status === 'active' ? 'Faol' : 'Nofaol'}
              </Text>
            </View>
          </View>

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

          {/* Ish vaqti */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="clock" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Ish vaqti</Text>
            </View>
            <Text style={styles.sectionHint}>
              Yopilish vaqti ochilishdan kichik bo`lsa — yarim tundan o`tadi (masalan 14:00–02:00).
            </Text>

            {DAYS.map(({ day, label }) => {
              const hour = hours[day];
              const closed = hour?.closed ?? false;
              return (
                <View key={day} style={styles.hourRow}>
                  <Text style={styles.dayLabel}>{label}</Text>
                  <TextInput
                    editable={!closed}
                    value={hour?.open ?? '10:00'}
                    onChangeText={(value) => setHour(day, { open: formatWhileTyping(value) })}
                    onBlur={() => setHour(day, { open: normalizeTime(hour?.open ?? '10:00') })}
                    keyboardType="number-pad"
                    maxLength={5}
                    placeholder="10:00"
                    placeholderTextColor={colors.textDim}
                    style={[styles.timeInput, closed && styles.timeInputDisabled]}
                  />
                  <Text style={styles.dash}>—</Text>
                  <TextInput
                    editable={!closed}
                    value={hour?.close ?? '20:00'}
                    onChangeText={(value) => setHour(day, { close: formatWhileTyping(value) })}
                    onBlur={() => setHour(day, { close: normalizeTime(hour?.close ?? '20:00') })}
                    keyboardType="number-pad"
                    maxLength={5}
                    placeholder="20:00"
                    placeholderTextColor={colors.textDim}
                    style={[styles.timeInput, closed && styles.timeInputDisabled]}
                  />
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: closed }}
                    onPress={() => setHour(day, { closed: !closed })}
                    hitSlop={6}
                    style={styles.dayOff}
                  >
                    <View style={[styles.checkbox, closed && styles.checkboxOn]}>
                      {closed ? (
                        <Text style={styles.checkboxMark}>✓</Text>
                      ) : null}
                    </View>
                    <Text style={styles.dayOffLabel}>Dam olish</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Yetkazib berish */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="delivery" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Yetkazib berish</Text>
            </View>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: delivery.enabled }}
              onPress={() => setDeliveryField('enabled', !delivery.enabled)}
              style={styles.toggleRow}
            >
              <View style={[styles.checkbox, delivery.enabled && styles.checkboxOn]}>
                {delivery.enabled ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.toggleLabel}>Yetkazib beramiz</Text>
            </Pressable>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: delivery.pickup }}
              onPress={() => setDeliveryField('pickup', !delivery.pickup)}
              style={styles.toggleRow}
            >
              <View style={[styles.checkbox, delivery.pickup && styles.checkboxOn]}>
                {delivery.pickup ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.toggleLabel}>Do`kondan olib ketish mumkin</Text>
            </Pressable>

            {delivery.enabled ? (
              <View style={styles.deliveryGrid}>
                <View style={styles.deliveryCell}>
                  <Text style={styles.fieldLabel}>RADIUS (KM)</Text>
                  <TextInput
                    value={delivery.radiusKm}
                    onChangeText={(value) =>
                      setDeliveryField('radiusKm', value.replace(/[^0-9.]/g, ''))
                    }
                    keyboardType="decimal-pad"
                    placeholder="15"
                    placeholderTextColor={colors.textDim}
                    style={styles.numericInput}
                  />
                </View>
                <View style={styles.deliveryCell}>
                  <Text style={styles.fieldLabel}>NARXI</Text>
                  <TextInput
                    value={delivery.fee}
                    onChangeText={(value) => setDeliveryField('fee', value)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textDim}
                    style={styles.numericInput}
                  />
                </View>
                <View style={styles.deliveryCell}>
                  <Text style={styles.fieldLabel}>BEPUL CHEGARA</Text>
                  <TextInput
                    value={delivery.freeFrom}
                    onChangeText={(value) => setDeliveryField('freeFrom', value)}
                    keyboardType="decimal-pad"
                    placeholder="yo`q"
                    placeholderTextColor={colors.textDim}
                    style={styles.numericInput}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saved ? <Text style={styles.saved}>Saqlandi</Text> : null}

          <Button title="Saqlash" loading={save.isPending} onPress={() => save.mutate()} />

          {/* ── Mening brendim (@username bilan) — alohida saqlash ── */}
          <View style={styles.brandDivider} />
          <Text style={styles.brandTitle}>MENING BRENDIM</Text>
          <Text style={styles.brandHint}>
            Xaridorlar «Brendlar» bo`limida shu nom, logo va @username bilan ko`radi. Qo`shgan
            mahsulotlaringiz avtomatik shu brendga bog`lanadi.
          </Text>

          <Text style={styles.fieldLabel}>BREND LOGOSI</Text>
          <View style={styles.logoRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Brend logosi"
              onPress={() => void pickBrandLogo()}
              disabled={brandUploading}
              style={styles.logoBox}
            >
              {brandUploading ? (
                <ActivityIndicator color={colors.accent} />
              ) : brandForm.logoUrl ? (
                <Image
                  source={{ uri: brandForm.logoUrl }}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              ) : (
                <Icon name="shop" size={26} color={colors.textDim} />
              )}
            </Pressable>
            <View style={styles.logoActions}>
              <Button
                title={brandForm.logoUrl ? 'Logoni o`zgartirish' : 'Logo tanlash'}
                variant="ghost"
                loading={brandUploading}
                onPress={() => void pickBrandLogo()}
              />
            </View>
          </View>

          <Field label="Brend nomi" value={brandForm.name} onChangeText={setBrand('name')} />
          <Field
            label="Username"
            value={brandForm.username}
            onChangeText={setBrand('username')}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="@chilonzor_moda"
          />
          <Text style={styles.brandHint}>
            3–30 belgi: lotin harfi bilan boshlanadi, faqat harf, raqam, _ va .
          </Text>
          <Field
            label="Brend tavsifi"
            value={brandForm.description}
            onChangeText={setBrand('description')}
            multiline
          />

          {brandError ? <Text style={styles.error}>{brandError}</Text> : null}
          {brandSaved ? <Text style={styles.saved}>Saqlandi — @{brandUsername}</Text> : null}

          <Button
            title={brand.data ? 'Brendni saqlash' : 'Brend yaratish'}
            loading={saveBrand.isPending}
            disabled={!brandValid}
            onPress={() =>
              saveBrand.mutate({
                name: brandForm.name.trim(),
                username: brandUsername,
                description: brandForm.description.trim() || null,
                logoUrl: brandForm.logoUrl,
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

  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusCardText: { flex: 1, gap: 2 },
  statusLabel: { ...text.tiny, color: colors.textDim, letterSpacing: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusBadgeOn: { borderColor: 'rgba(34,197,94,0.35)', backgroundColor: 'rgba(34,197,94,0.1)' },
  statusBadgeOff: { borderColor: colors.border, backgroundColor: colors.surface2 },
  statusBadgeDot: { width: 6, height: 6, borderRadius: radius.pill },
  statusBadgeText: { ...text.tiny },
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

  section: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...text.h3, color: colors.text },
  sectionHint: {
    ...text.small,
    color: colors.textDim,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dayLabel: { ...text.small, color: colors.text, width: 84 },
  timeInput: {
    ...text.bodyMed,
    color: colors.text,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    width: 68,
    textAlign: 'center',
  },
  timeInputDisabled: { opacity: 0.4 },
  dash: { color: colors.textDim, paddingHorizontal: 2 },
  dayOff: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: 'auto' },
  dayOffLabel: { ...text.small, color: colors.textDim },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  toggleLabel: { ...text.bodyMed, color: colors.text },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: colors.text, fontSize: 12, lineHeight: 14, fontWeight: '700' },

  deliveryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  deliveryCell: { flex: 1 },
  numericInput: {
    ...text.bodyMed,
    color: colors.text,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    textAlign: 'center',
  },

  error: { ...text.small, color: colors.danger, marginTop: spacing.md, marginBottom: spacing.sm },
  saved: { ...text.small, color: colors.success, marginTop: spacing.md, marginBottom: spacing.sm },
  brandDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  brandTitle: { ...text.h3, color: colors.text, marginBottom: spacing.xs },
  brandHint: { ...text.small, color: colors.textDim, marginBottom: spacing.sm },
});
