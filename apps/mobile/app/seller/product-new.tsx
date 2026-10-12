import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { GARMENT_STYLES, type GarmentStyle } from '@looksave/validation';

import {
  createStoreProduct,
  getCategories,
  prepareGarmentImage,
  uploadStoreImage,
  type Category,
} from '../../src/api/endpoints';
import { explainError } from '../../src/api/explainError';
import { Icon } from '../../src/components/Icon';
import { SellerHeader } from '../../src/components/SellerHeader';
import { Button, Field, Screen } from '../../src/components/ui';
import { useI18n, type Dictionary } from '../../src/i18n';
import { colors, radius, spacing, text } from '../../src/theme/tokens';
import { goBack } from '../../src/navigation/back';

/**
 * Yangi mahsulot.
 *
 * ⚠️ IKKI XIL SAQLASH BOR VA ULAR BOSHQACHA TEKSHIRILADI:
 *
 *   `draft`   — qoralama. Rasm soni tekshirilmaydi, katalogda ko'rinmaydi.
 *               Sotuvchi ishni bo'lib-bo'lib qilishi mumkin.
 *   `pending` — moderatsiyaga yuboriladi. Server KAMIDA 3 RASM talab
 *               qiladi va bu talab shu yerda ham tekshiriladi, aks holda
 *               foydalanuvchi formani to'ldirib bo'lib xato olardi.
 *
 * ⚠️ O'LCHAMLAR OLDINDAN BERILGAN. Har o'lchamni qo'lda yozdirish uzoq va
 * xatoga moyil; sotuvchi faqat kerakligini belgilaydi va qoldiq kiritadi.
 */

/** Kiyim uchun standart o'lchamlar — eng ko'p ishlatiladigani. */
const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const GENDERS: Array<'male' | 'female' | 'unisex'> = ['male', 'female', 'unisex'];

/** Daraxtdagi barcha kategoriyalarni yassi ro'yxatga aylantiradi. */
function flatten(list: Category[]): Category[] {
  return list.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

/**
 * Rasm uyachalari — tartib `GARMENT_ANGLE_ORDER` bilan AYNAN bir xil
 * bo'lishi shart (`packages/validation/src/store-products.ts`).
 * Kiyintirish burchakni shu indeks bo'yicha topadi.
 */
const IMAGE_SLOT_KEYS = ['slotFront', 'slotBack', 'slotSide'] as const satisfies ReadonlyArray<
  keyof Dictionary['seller']
>;

/** Slug bazada, ko'rinadigan nom i18n (`t.seller`) dan */
const STYLE_LABEL: Record<GarmentStyle, keyof Dictionary['seller']> = {
  casual: 'styleCasual',
  sport: 'styleSport',
  streetwear: 'styleStreetwear',
  classic: 'styleClassic',
  minimal: 'styleMinimal',
};

export default function NewProduct(): JSX.Element {
  /*
   * ⚠️ Ildiz Stack bu bo'limda sarlavha chizmaydi (`headerShown: false`),
   * shuning uchun status paneli ostidagi bo'shliq QO'LDA qo'yiladi.
   * Aks holda sarlavha soat va batareya ustiga chiqib ketadi.
   */
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useI18n((state) => state.t);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unisex'>('unisex');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [style, setStyle] = useState<GarmentStyle | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const options = flatten(categories.data ?? []).filter((item) => item.slot !== null);

  const create = useMutation({
    mutationFn: createStoreProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['store', 'products'] });
      router.replace('/seller/products');
    },
    onError: (err) => setError(explainError(err, t)),
  });

  /** Suratni AYNAN o'z o'rniga qo'yadi (bo'sh oraliq qoldirmaydi). */
  const putAt = (slot: number, url: string): void =>
    setImages((current) => {
      const next = [...current];
      next[slot] = url;
      // Oraliqda bo'sh o'rin qolmasin: sxema `z.string().url()` kutadi
      return next.filter((item): item is string => Boolean(item));
    });

  /*
   * ⚠️ UYACHA INDEKSI UZATILADI — massiv oxiriga qo'shilmaydi.
   *
   * `images` tartibi MA'NOGA EGA: [0] old, [1] orqa, [2] yon
   * (`packages/validation` — `GARMENT_ANGLE_ORDER`). Kiyintirish burchak
   * bo'yicha shu tartibdan o'qiydi, shuning uchun surat qaysi uyachaga
   * tanlangan bo'lsa, o'sha o'ringa tushishi kerak.
   */
  const pickImage = async (slot: number): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.photo.permissionTitle, t.seller.imgPermBody);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const url = await uploadStoreImage(result.assets[0].uri);

      /*
       * ⚠️ FON OLIB TASHLANADI, LEKIN MAJBURAN EMAS.
       *
       * AI kiyintirish natijasi to'g'ridan-to'g'ri kiyim suratiga bog'liq:
       * ilgich, maneken yoki tartibsiz fon bo'lsa model ularni ham kiyimning
       * qismi deb qabul qiladi va natija buziladi.
       *
       * Lekin tanlovni DO'KONCHI qiladi — ba'zan asl surat yaxshiroq
       * chiqadi (masalan kiyim oq bo'lsa va fon bilan qo'shilib ketsa).
       * Avtomatik almashtirsak, u nima o'zgarganini bilmay qolardi.
       */
      let finalUrl = url;
      try {
        const prepared = await prepareGarmentImage(url);

        if (prepared.warning) {
          Alert.alert(t.seller.imgWarnTitle, prepared.warning, [
            { text: t.seller.addAnyway, onPress: () => putAt(slot, url) },
            { text: t.common.cancel, style: 'cancel' },
          ]);
          return;
        }

        finalUrl = await new Promise<string>((resolve) => {
          Alert.alert(t.seller.bgRemovedTitle, t.seller.bgRemovedBody, [
            { text: t.seller.cleaned, onPress: () => resolve(prepared.cleanedUrl) },
            { text: t.seller.original, onPress: () => resolve(url) },
          ]);
        });
      } catch {
        // Ishlov bermasa asl surat qoladi — yuklash bekor qilinmaydi
      }

      putAt(slot, finalUrl);
    } catch {
      Alert.alert(t.seller.uploadFailedTitle, t.seller.imgUploadFailedBody);
    } finally {
      setUploading(false);
    }
  };

  const toggleSize = (size: string): void =>
    setSizes((current) => {
      const next = { ...current };
      if (size in next) delete next[size];
      else next[size] = '1';
      return next;
    });

  const submit = (status: 'draft' | 'pending'): void => {
    setError(null);

    if (title.trim().length < 2) return setError(t.seller.errTitle);
    if (!categoryId) return setError(t.seller.errCategory);
    if (!/^\d+(\.\d{1,2})?$/.test(price.trim())) return setError(t.seller.errPrice);

    const chosen = Object.entries(sizes);
    if (chosen.length === 0) return setError(t.seller.errSize);

    // Serverdagi qoida — moderatsiyaga kamida 3 rasm
    if (status === 'pending' && images.length < 3) {
      return setError(t.seller.err3Images);
    }

    create.mutate({
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      categoryId,
      gender,
      /*
       * ⚠️ USLUB `tags` GA TUSHADI, alohida ustunga emas.
       *
       * Massiv allaqachon bor va erkin — do'kon o'z belgilarini ham
       * qo'shishi mumkin. Kiyintirishdagi uslub filtri kesishma bilan
       * ishlaydi, shuning uchun qo'shimcha belgilar unga xalaqit bermaydi.
       */
      tags: style ? [style] : [],
      basePrice: Number(price).toFixed(2),
      images,
      status,
      variants: [
        {
          sizes: chosen.map(([size, stock]) => ({
            size,
            stock: Math.max(0, Number.parseInt(stock, 10) || 0),
          })),
        },
      ],
    });
  };

  return (
    <Screen>
      <SellerHeader
        title={t.seller.newTitle}
        subtitle={t.seller.newSubtitle}
        onBack={() => goBack('/seller/products')}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Rasmlar */}
          <Text style={styles.label}>{t.seller.imagesLabel}</Text>
          <Text style={styles.hint}>{t.seller.imagesHint}</Text>
          {/*
            ⚠️ UCHTA BELGILANGAN UYACHA, umumiy gallereya EMAS.

            Ilgari oddiy massiv edi: sotuvchi uchta rasm qo'yardi, lekin
            qaysi biri qaysi tomon ekani noma'lum qolardi. Natijada odam
            yon tomonga burilganda modelga baribir OLD surat berilardi va
            u yon ko'rinishni o'zidan o'ylab topardi.

            Tartib `GARMENT_ANGLE_ORDER` bilan bir xil: old, orqa, yon.
          */}
          <View style={styles.images}>
            {IMAGE_SLOT_KEYS.map((slotKey, index) => {
              const url = images[index];
              const slotLabel = t.seller[slotKey];
              return (
                <View key={slotKey} style={styles.imageWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={slotLabel}
                    onPress={() => void pickImage(index)}
                    disabled={uploading}
                    style={styles.imageAdd}
                  >
                    {url ? (
                      <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
                    ) : (
                      <Icon
                        name="camera"
                        size={22}
                        color={uploading ? colors.textDim : colors.accent}
                      />
                    )}
                  </Pressable>

                  {url ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={slotLabel}
                      onPress={() => setImages((current) => current.filter((_, i) => i !== index))}
                      style={styles.imageRemove}
                    >
                      <Icon name="close" size={12} color={colors.text} />
                    </Pressable>
                  ) : null}

                  <Text style={styles.slotLabel}>{slotLabel}</Text>
                </View>
              );
            })}
          </View>

          <Field
            label={t.seller.nameLabel}
            value={title}
            onChangeText={setTitle}
            placeholder={t.seller.phProductName}
          />
          <Field
            label={t.seller.priceField}
            value={price}
            onChangeText={(value) => setPrice(value.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="150000"
          />

          {/* Kategoriya */}
          <Text style={styles.label}>{t.seller.categoryLabel}</Text>
          <View style={styles.chips}>
            {options.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => setCategoryId(item.id)}
                style={[styles.chip, categoryId === item.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, categoryId === item.id && { color: colors.text }]}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Jins */}
          <Text style={styles.label}>{t.seller.genderLabel}</Text>
          <View style={styles.chips}>
            {GENDERS.map((key) => {
              const label =
                key === 'male' ? t.avatar.male : key === 'female' ? t.avatar.female : t.seller.unisex;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => setGender(key)}
                  style={[styles.chip, gender === key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, gender === key && { color: colors.text }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Uslub */}
          <Text style={styles.label}>{t.ai.styleLabel}</Text>
          <Text style={styles.hint}>{t.seller.styleHint}</Text>
          <View style={styles.chips}>
            {GARMENT_STYLES.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                // Qayta bosilsa bekor bo'ladi — uslub majburiy emas
                onPress={() => setStyle((current) => (current === item ? null : item))}
                style={[styles.chip, style === item && styles.chipActive]}
              >
                <Text style={[styles.chipText, style === item && { color: colors.text }]}>
                  {t.seller[STYLE_LABEL[item]]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* O'lchamlar */}
          <Text style={styles.label}>{t.seller.sizesLabel}</Text>
          <View style={styles.chips}>
            {SIZE_PRESETS.map((size) => (
              <Pressable
                key={size}
                accessibilityRole="button"
                onPress={() => toggleSize(size)}
                style={[styles.chip, size in sizes && styles.chipActive]}
              >
                <Text style={[styles.chipText, size in sizes && { color: colors.text }]}>
                  {size}
                </Text>
              </Pressable>
            ))}
          </View>

          {Object.keys(sizes).length > 0 ? (
            <View style={styles.stockList}>
              {Object.keys(sizes).map((size) => (
                <View key={size} style={styles.stockRow}>
                  <Text style={styles.stockSize}>{size}</Text>
                  <Field
                    value={sizes[size] ?? ''}
                    onChangeText={(value) =>
                      setSizes((current) => ({ ...current, [size]: value.replace(/[^0-9]/g, '') }))
                    }
                    keyboardType="number-pad"
                    placeholder={t.seller.phPcs}
                  />
                </View>
              ))}
            </View>
          ) : null}

          <Field
            label={t.seller.descLabel}
            value={description}
            onChangeText={setDescription}
            placeholder={t.seller.phDescDetail}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button
              title={t.seller.submitReview}
              onPress={() => submit('pending')}
              loading={create.isPending}
            />
            <Button
              title={t.seller.saveDraft}
              variant="ghost"
              onPress={() => submit('draft')}
              disabled={create.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xs },

  label: { ...text.label, color: colors.textDim, marginTop: spacing.md },
  hint: { ...text.tiny, color: colors.textDim, marginBottom: spacing.xs },

  images: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  imageWrap: { position: 'relative', alignItems: 'center', gap: spacing.xs },
  slotLabel: { ...text.tiny, color: colors.textMuted },
  image: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.surface2 },
  imageRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageAdd: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.borderAccent, backgroundColor: colors.primarySoft },
  chipText: { ...text.small, color: colors.textMuted },

  stockList: { gap: 0, marginBottom: spacing.sm },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stockSize: { ...text.bodyMed, color: colors.text, width: 44 },

  error: { ...text.small, color: colors.danger, marginBottom: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
