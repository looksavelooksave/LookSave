import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTryonStores, type TryonStore } from '../../api/endpoints';
import { useLocationStore } from '../../store/locationStore';
import { colors, fonts, radius, spacing, text } from '../../theme/tokens';
import { Icon } from '../Icon';

/**
 * Do'kon tanlagich — kiyintirish ekranining pastida.
 *
 * ⚠️ NEGA KERAK. Do'kon sehrgarning bir qadamida tanlanadi va undan
 * keyin O'ZGARMASDI: tanlangan do'konda mos o'lchamdagi kiyim
 * bo'lmasa foydalanuvchi boshi berk ko'chaga tushardi — «bu turkumda
 * kiyim yo'q» yozuvi va chiqish yo'li yo'q. Sehrgarni qaytadan ochish
 * yagona chora edi, u esa yuz skanerini ham qayta so'rardi.
 *
 * ⚠️ RO'YXAT AYNAN SHU EKRAN KO'RSATADIGANINI SANAYDI. `/tryon/stores`
 * do'konlarni AI kiyintira oladigan kiyimlar bo'yicha sanaydi va
 * o'lcham filtrini ham hisobga oladi — ya'ni «12 ta kiyim» yozuvi
 * foydalanuvchi ichkariga kirganda ko'radigan son bilan bir xil.
 * `/stores/nearby` esa 3D modellarni sanaydi va bu yerda yolg'on
 * ko'rsatkich bo'lardi.
 */

export interface StorePickerProps {
  visible: boolean;
  onClose: () => void;
  selectedId: string | null;
  onSelect: (store: TryonStore) => void;
  /** Faqat shu o'lchami borlarini sanash — foydalanuvchining o'lchami */
  size?: string | null;
  gender?: string | null;
}

export function StorePicker({
  visible,
  onClose,
  selectedId,
  onSelect,
  size = null,
  gender = null,
}: StorePickerProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const coords = useLocationStore((state) => state.coords);

  const stores = useQuery({
    queryKey: ['tryon', 'stores', coords.lat, coords.lng, gender, size],
    queryFn: () => getTryonStores({ lat: coords.lat, lng: coords.lng, gender, size }),
    // Panel yopiq turganda so'rov yubormaymiz — u ochilishi bilan keladi
    enabled: visible,
  });

  const list = stores.data ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Ortdagi qoraytirish — bosilsa panel yopiladi */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Yopish" />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.grabber} />

        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.title}>Do‘konni almashtirish</Text>
            <Text style={styles.hint}>
              {size
                ? `Faqat ${size} o‘lchami omborda bor do‘konlar`
                : 'Kiyimlar va buyurtma tanlangan do‘kondan bo‘ladi'}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Icon name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {stores.isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : list.length === 0 ? (
          <Text style={styles.empty}>
            {size
              ? `Hech bir do‘konda ${size} o‘lchamidagi kiyim topilmadi.`
              : 'Hozircha AI kiyintira oladigan do‘kon yo‘q.'}
          </Text>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {list.map((store) => {
              const selected = store.id === selectedId;

              return (
                <Pressable
                  key={store.id}
                  accessibilityRole="button"
                  accessibilityLabel={store.name}
                  onPress={() => {
                    onSelect(store);
                    onClose();
                  }}
                  style={[styles.row, selected && styles.rowActive]}
                >
                  <View style={styles.logo}>
                    {store.logo ? (
                      <Image source={{ uri: store.logo }} style={styles.logoImage} />
                    ) : (
                      <Icon name="stores" size={18} color={colors.accent} />
                    )}
                  </View>

                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {store.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {store.garmentCount} ta kiyim
                      {store.distanceM === null
                        ? ''
                        : ` · ${(store.distanceM / 1000).toFixed(1)} km`}
                    </Text>
                  </View>

                  {selected ? <Icon name="authentic" size={18} color={colors.success} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },

  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    /*
     * ⚠️ BALANDLIK CHEGARALANGAN, `flex` EMAS. Panel kontenti bo'yicha
     * o'sadi (ikkita do'kon bo'lsa kichkina qoladi), lekin ekranning
     * uchdan ikkisidan oshmaydi — aks holda uzun ro'yxat butun ekranni
     * egallab, ortidagi avatar ko'rinmay qolardi.
     */
    maxHeight: '68%',
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.md,
  },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headText: { flex: 1 },
  title: { ...text.h3, color: colors.text },
  hint: { ...text.tiny, color: colors.textDim, marginTop: 2 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  loader: { marginVertical: spacing.xl },
  empty: {
    ...text.small,
    color: colors.textDim,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },

  list: { marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.borderAccent, backgroundColor: colors.primarySoft },

  logo: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: { width: '100%', height: '100%' },

  rowText: { flex: 1 },
  name: { ...text.bodyMed, color: colors.text, fontFamily: fonts.semibold },
  meta: { ...text.tiny, color: colors.textDim },
});
