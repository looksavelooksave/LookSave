import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { applyForStore, type StoreApplicationInput } from '../../src/api/endpoints';
import { refreshSession } from '../../src/api/client';
import { explainError } from '../../src/api/explainError';
import { SellerHeader } from '../../src/components/SellerHeader';
import { SignInRequired } from '../../src/components/SignInRequired';
import { Button, Field, Screen } from '../../src/components/ui';
import { useI18n } from '../../src/i18n';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { colors, radius, spacing, text } from '../../src/theme/tokens';
import { goBack } from '../../src/navigation/back';

/**
 * Do'kon arizasi — sotuvchi bo'lish.
 *
 * ⚠️ TASDIQLASH KUTILMAYDI. Ariza yuborilishi bilan foydalanuvchi
 * `store_owner` bo'ladi va panelga kira oladi. Do'kon esa `pending`
 * holatda qoladi, ya'ni katalogda KO'RINMAYDI. Shu bilan sotuvchi
 * kutish paytida mahsulotlarini tayyorlab qo'yadi va tasdiqlangan
 * kuni do'kon to'liq tayyor ishga tushadi.
 *
 * ⚠️ JOYLASHUV XARITADAN EMAS, QURILMADAN olinadi. Ariza bosqichida
 * xarita tanlagichi ortiqcha: manzil matn bilan yoziladi va aniq nuqta
 * keyinchalik panelda to'g'rilanadi. Xarita qo'shilsa ariza uzayadi va
 * ko'p sotuvchi shu yerda to'xtaydi.
 *
 * Kuniga 3 tadan ko'p ariza yuborib bo'lmaydi — server cheklaydi.
 */

interface FormState {
  name: string;
  description: string;
  phone: string;
  address: string;
  landmark: string;
  city: string;
}

const EMPTY: FormState = {
  name: '',
  description: '',
  phone: '+998',
  address: '',
  landmark: '',
  city: '',
};

export default function StoreApply(): JSX.Element {
  /*
   * ⚠️ Ildiz Stack bu bo'limda sarlavha chizmaydi (`headerShown: false`),
   * shuning uchun status paneli ostidagi bo'shliq QO'LDA qo'yiladi.
   * Aks holda sarlavha soat va batareya ustiga chiqib ketadi.
   */
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useI18n((state) => state.t);
  const signedIn = useAuthStore((state) => state.status) === 'signedIn';
  const refreshUser = useAuthStore((state) => state.restore);
  const coords = useLocationStore((state) => state.coords);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const apply = useMutation({
    mutationFn: (input: StoreApplicationInput) => applyForStore(input),
    onSuccess: async () => {
      /*
       * ⚠️ TARTIB MUHIM: avval TOKEN, keyin profil.
       *
       * Rol va do'kon ro'yxati access token ichida yozilgan. Ariza
       * qabul qilingach bazada `store_owner` bo'ladi, lekin qo'ldagi
       * token hali `customer` deb turadi va panel so'rovlari 403
       * qaytaradi. Buni sinovda tekshirdim: ariza 200, dashboard 403.
       *
       * Tokenni yangilagach yangi rol ham, `storeIds` ham keladi.
       */
      await refreshSession();
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.replace('/seller');
    },
    onError: (err) => {
      setError(explainError(err, t));
    },
  });

  if (!signedIn) {
    return (
      <Screen>
        <SignInRequired hint={t.seller.applySignInHint} />
      </Screen>
    );
  }

  const set = (key: keyof FormState) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (): void => {
    setError(null);

    // Serverdagi sxemaga mos eng kam talablar — xatoni so'rovsiz ushlaymiz
    if (form.name.trim().length < 2) return setError(t.seller.errName);
    if (!/^\+998\d{9}$/.test(form.phone.trim())) return setError(t.seller.errPhone);
    if (form.address.trim().length < 5) return setError(t.seller.errAddress);
    if (form.city.trim().length < 2) return setError(t.seller.errCity);

    apply.mutate({
      name: form.name.trim(),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      phone: form.phone.trim(),
      address: form.address.trim(),
      ...(form.landmark.trim() ? { landmark: form.landmark.trim() } : {}),
      city: form.city.trim(),
      country: 'UZ',
      location: coords,
      currency: 'UZS',
      deliveryEnabled: true,
      pickupEnabled: true,
    });
  };

  return (
    <Screen>
      <SellerHeader
        title={t.seller.applyTitle}
        subtitle={t.seller.applySubtitle}
        onBack={() => goBack('/profile')}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>{t.seller.applyLead}</Text>

          <View style={styles.form}>
            <Field
              label={t.seller.fieldName}
              value={form.name}
              onChangeText={set('name')}
              placeholder={t.seller.phName}
              autoCapitalize="words"
            />
            <Field
              label={t.auth.phone}
              value={form.phone}
              onChangeText={set('phone')}
              keyboardType="phone-pad"
              placeholder={t.seller.phPhone}
            />
            <Field
              label={t.seller.fieldCity}
              value={form.city}
              onChangeText={set('city')}
              placeholder={t.seller.phCity}
              autoCapitalize="words"
            />
            <Field
              label={t.checkout.address}
              value={form.address}
              onChangeText={set('address')}
              placeholder={t.seller.phAddress}
            />
            <Field
              label={t.checkout.landmark}
              value={form.landmark}
              onChangeText={set('landmark')}
              placeholder={t.seller.phLandmark}
            />
            <Field
              label={t.seller.fieldDescription}
              value={form.description}
              onChangeText={set('description')}
              placeholder={t.seller.phDescription}
              multiline
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.note}>
            <Text style={styles.noteText}>{t.seller.applyNote}</Text>
          </View>

          <Button title={t.seller.applySubmit} onPress={submit} loading={apply.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },

  lead: { ...text.small, color: colors.textMuted, marginBottom: spacing.md },

  form: { gap: 0 },

  error: { ...text.small, color: colors.danger, marginBottom: spacing.sm },

  note: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noteText: { ...text.tiny, color: colors.textDim, lineHeight: 18 },
});
