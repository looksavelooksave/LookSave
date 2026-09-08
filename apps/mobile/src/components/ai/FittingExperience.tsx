import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  baseForCategory,
  indexRenders,
  nextPending,
  recommendSize,
  renderKey,
  resolveOutfit,
  topReady,
} from '@looksave/validation';

import {
  ANGLE_LABEL,
  ANGLE_ORDER,
  addToCart,
  getAvatar,
  getFullProfile,
  getGarments,
  getRenders,
  requestAvatarAngle,
  requestRender,
  requestRenderBatch,
  type AvatarAngle,
  type Garment,
  type TryonRender,
} from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { AvatarStage } from '../../components/ai/AvatarStage';
import { Icon, type IconName } from '../../components/Icon';
import { SignInRequired } from '../../components/SignInRequired';
import { Button, Screen } from '../../components/ui';

import { useAiFlowStore } from '../../store/aiFlowStore';
import { useAuthStore } from '../../store/authStore';
import { money } from '../../theme/format';
import { colors, radius, spacing, text } from '../../theme/tokens';
import { PhotoSwipe } from './PhotoSwipe';
import { StorePicker } from './StorePicker';
import { goBack } from '../../navigation/back';

/**
 * AI kiyintirish — ekranning butun tanasi.
 *
 * Tuzilishi mijoz bergan maketdan olingan: yuqorida odam va uning yonida
 * boshqaruv, ostida kategoriya tablari, kiyim tasmasi, rang va o'lcham
 * tanlagichlari.
 *
 * ⚠️ NEGA EKRAN EMAS, KOMPONENT. Bir xil kiyintirish IKKI joydan
 * ochiladi: pastdagi «Kiyib ko'rish» tabidan va AI oqimidan
 * (`/ai/fitting`). Tana shu yerda, marshrutlar faqat qobiq.
 *
 * ── UCHTA QOIDA, UCHALASI HAM O'ZGARTIRILGAN ──
 *
 * 1. ⚠️ KIYIM USTIGA KIYIM. Ilgari har kiyintirish ASL suratdan
 *    boshlanardi va ekranda doim BITTA kiyim ko'rinardi: kurtka
 *    tanlansa futbolka yo'qolardi. Endi komplekt qatlam-qatlam
 *    yig'iladi (`src/ai/outfit.ts`), zanjir esa serverga `baseRenderId`
 *    bo'lib boradi.
 *
 * 2. ⚠️ TASMA OLDINDAN TAYYORLANADI. Ilgari so'rov faqat «Kiyintirish»
 *    tugmasi bosilganda ketardi — pul tejash uchun. Endi turkumdagi
 *    hamma kiyim fonda kiyintiriladi va foydalanuvchi tasmani surganda
 *    tayyor suratlarni ko'radi.
 *
 *    BU SARF QARORI: bitta turkumni ochish 30 tagacha kredit turadi.
 *    Chegara `TRYON_DAILY_LIMIT` da va unga yetilganda ekran silliq
 *    to'xtaydi (banner), xato oynasi chiqmaydi.
 *
 * 3. ⚠️ RO'YXAT DO'KON VA O'LCHAM BO'YICHA FILTRLANADI. Ilgari sehrgarda
 *    tanlangan do'kon `aiFlowStore` da yotardi va HECH QAYERDA
 *    ishlatilmasdi; o'lcham esa faqat «sizga M» yozuvi edi. Natijada
 *    foydalanuvchi boshqa do'konning, o'ziga to'g'ri kelmaydigan
 *    kiyimini kiyintirib, keyin uni sotib ololmasdi.
 */

export interface FittingExperienceProps {
  /**
   * Orqaga tugmasi ko'rsatiladimi.
   *
   * Tabda ko'rsatilmaydi — u yerda orqaga qaytadigan joy yo'q, tab
   * qatorining o'zi navigatsiya. Oqimda esa kerak.
   */
  showBack?: boolean;
}

/** Tasmadagi bitta karta + oraliq — `getItemLayout` uchun. */
const STRIP_ITEM = 72 + spacing.sm;

/**
 * Kategoriya tablari — maketdagi beshtasi.
 *
 * ⚠️ SLOT EMAS, KATEGORIYA. Futbolka, xudi va ko'ylak uchalasi ham `top`
 * slotida, lekin foydalanuvchi uchun uch xil narsa.
 *
 * ⚠️ TARTIB — KO'RISH TARTIBI, KIYINISH TARTIBI EMAS. Maketda tablar shu
 * ketma-ketlikda turadi. Kiyinish tartibi esa boshqa (shim eng pastda) va
 * u `src/ai/outfit.ts` dagi `LAYER_ORDER` da — shimni kurtkadan keyin
 * kiyib bo'lmaydi.
 *
 * `slot` o'lcham tavsiyasi uchun kerak: ustki kiyim ko'krakdan, pastki
 * kiyim beldan hisoblanadi.
 */
const TABS: Array<{ category: string; label: string; icon: IconName; slot: string }> = [
  { category: 'tshirt', label: 'Futbolka', icon: 'slotTop', slot: 'top' },
  { category: 'hoodie', label: 'Xudi', icon: 'slotTop', slot: 'top' },
  { category: 'jacket', label: 'Kurtka', icon: 'slotOuter', slot: 'outer' },
  { category: 'shirt', label: "Ko'ylak", icon: 'slotTop', slot: 'top' },
  { category: 'trousers', label: 'Shim', icon: 'slotBottom', slot: 'bottom' },
];

/** Biror natija hali kelmayotgan bo'lsa ro'yxat qayta so'raladi. */
function isWorking(renders: readonly TryonRender[] | undefined): boolean {
  return (renders ?? []).some(
    (render) => render.status === 'pending' || render.status === 'processing',
  );
}

export function FittingExperience({ showBack = false }: FittingExperienceProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const signedIn = useAuthStore((state) => state.status) === 'signedIn';

  const [tab, setTab] = useState('tshirt');
  const [size, setSize] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [angle, setAngle] = useState<AvatarAngle>('front');
  const [notice, setNotice] = useState<string | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  /**
   * O'lcham filtri.
   *
   * ⚠️ O'CHIRISH IMKONI QOLDIRILGAN. Filtr sukut bo'yicha YOQIQ — oqimning
   * ma'nosi «menga mos narsalar» — lekin kichik do'konda u ro'yxatni
   * butunlay bo'shatib qo'yishi mumkin. Bunday holda foydalanuvchi boshi
   * berk ko'chaga tushmasligi kerak: yo filtrni o'chiradi, yo do'konni
   * almashtiradi. Ikkala yo'l ham bo'sh ro'yxat yonida ko'rsatiladi.
   */
  const [onlyMySize, setOnlyMySize] = useState(true);

  /**
   * Ko'rilgan kiyimlar keshi.
   *
   * ⚠️ NEGA KERAK. Komplektda beshta turkumdan kiyim bo'lishi mumkin,
   * ro'yxat esa faqat JORIY turkumni yuklaydi. Komplektning umumiy
   * narxini ko'rsatish va uni savatga qo'shish uchun boshqa
   * turkumlardagi kiyimlarning ma'lumoti ham kerak.
   *
   * Kiyim faqat ro'yxatdan tanlanadi, ya'ni tanlangan payt u albatta
   * yuklangan bo'ladi — shu payt keshga tushadi.
   */
  const [seen, setSeen] = useState<Record<string, Garment>>({});

  /**
   * Foydalanuvchi ATAYLAB yechgan turkumlar.
   *
   * ⚠️ USIZ «YECHISH» ISHLAMASDI. Turkum ochilganda birinchi kiyim
   * o'zi kiyiladi (quyidagi effekt); yechilgan turkum belgilanmasa
   * o'sha effekt uni darhol qaytadan kiydirardi va tugma buzuq
   * ko'rinardi.
   *
   * Belgi turkumga qayta kiyim tanlanganda olib tashlanadi.
   */
  const [dismissed, setDismissed] = useState<string[]>([]);

  const stripRef = useRef<FlatList<Garment>>(null);

  const outfit = useAiFlowStore((state) => state.outfit);
  const wear = useAiFlowStore((state) => state.wear);
  const takeOff = useAiFlowStore((state) => state.takeOff);
  const storeId = useAiFlowStore((state) => state.storeId);
  const storeName = useAiFlowStore((state) => state.storeName);
  const setStore = useAiFlowStore((state) => state.setStore);

  /** Kiyintirish — belgini ham tozalaydi, aks holda effekt uni qaytarardi */
  const putOn = (category: string, variantId: string): void => {
    setDismissed((current) => current.filter((item) => item !== category));
    wear(category, variantId);
    setSize(null);
    setNotice(null);
  };

  const remove = (category: string): void => {
    setDismissed((current) => (current.includes(category) ? current : [...current, category]));
    takeOff(category);
    setSize(null);
    setNotice(null);
  };

  const profile = useQuery({ queryKey: ['profile'], queryFn: getFullProfile, enabled: signedIn });
  const avatar = useQuery({
    queryKey: ['avatar'],
    queryFn: getAvatar,
    enabled: signedIn,
    refetchInterval: (query) =>
      (query.state.data as { anglePending?: string | null } | undefined)?.anglePending
        ? 3000
        : false,
  });

  const measurements = profile.data?.measurements;
  const gender = profile.data?.gender ?? null;

  /*
   * ⚠️ TAYYORLIK QADAMLARDAN OLDIN HISOBLANADI, chunki undan SO'ROVLAR
   * ham bog'liq. Ilgari tekshiruv shartli `return` da, hamma so'rovdan
   * KEYIN turardi: surati yo'q yangi foydalanuvchi uchun ham kiyimlar
   * yuklanardi va tasmani oldindan tayyorlash boshlanardi — server esa
   * har birini «avval avatar yasang» deb rad etardi. Foydalanuvchi
   * buni ko'rmasdi, lekin log xatoga to'lardi.
   *
   * ⚠️ DO'KON HAM SHART: kiyimlar do'konga bog'langan (aks holda
   * ro'yxat butun katalogdan kelib, komplekt bir necha do'kondan
   * yig'ilardi va uni bitta buyurtma qilib bo'lmasdi).
   */
  const hasPhoto = avatar.data?.status === 'ready' || Boolean(profile.data?.bodyPhotoUrl);
  const hasSizes =
    typeof measurements?.height === 'number' && typeof measurements?.weight === 'number';
  const ready = signedIn && hasPhoto && hasSizes && Boolean(storeId);

  const activeTab = TABS.find((item) => item.category === tab) ?? TABS[0];

  /**
   * Joriy turkum uchun tavsiya etilgan o'lcham.
   *
   * ⚠️ TAVSIYA EMAS, FILTR SIFATIDA HAM ISHLATILADI — ro'yxatga faqat
   * shu o'lchami omborda borlari kiradi (`onlyMySize`).
   */
  const fitSize = useMemo(
    () => (measurements ? recommendSize(activeTab?.slot ?? 'top', measurements) : null),
    [measurements, activeTab?.slot],
  );

  const sizeFilter = onlyMySize ? fitSize : null;

  const garments = useQuery({
    queryKey: ['garments', tab, storeId, sizeFilter, gender],
    queryFn: () => getGarments({ category: tab, storeId, size: sizeFilter, gender, limit: 30 }),
    enabled: ready,
  });

  const items = useMemo(() => garments.data ?? [], [garments.data]);

  // Ro'yxatga tushgan har kiyim keshga yoziladi — komplekt jamlanmasi uchun
  useEffect(() => {
    if (items.length === 0) return;
    setSeen((current) => {
      const next = { ...current };
      for (const item of items) next[item.variantId] = item;
      return next;
    });
  }, [items]);

  /*
   * ── Komplekt zanjiri ──
   *
   * `scope: 'all'` — HAR asos ustidagi natija keladi. Aynan shu bilan
   * zanjir tiklanadi: qaysi qatlam qaysining ustida turgani natijalarning
   * o'zidan o'qiladi (`resolveOutfit`).
   */
  const outfitIds = useMemo(() => outfit.map((layer) => layer.variantId), [outfit]);

  const outfitRenders = useQuery({
    queryKey: ['renders', 'outfit', angle, outfitIds.join(',')],
    queryFn: () => getRenders(outfitIds, angle, null, 'all'),
    enabled: ready && outfitIds.length > 0,
    refetchInterval: (query) => (isWorking(query.state.data as TryonRender[]) ? 2500 : false),
  });

  const resolved = useMemo(
    () => resolveOutfit(outfit, indexRenders(outfitRenders.data ?? [])),
    [outfit, outfitRenders.data],
  );

  /** Joriy turkumdagi kiyimlar qaysi surat ustiga kiydiriladi */
  const stripBase = useMemo(() => baseForCategory(resolved, tab), [resolved, tab]);

  const stripIds = useMemo(() => items.map((item) => item.variantId), [items]);

  const stripRenders = useQuery({
    queryKey: ['renders', 'strip', angle, stripBase.baseRenderId, stripIds.join(',')],
    queryFn: () => getRenders(stripIds, angle, stripBase.baseRenderId),
    enabled: ready && stripIds.length > 0 && stripBase.ready,
    refetchInterval: (query) => (isWorking(query.state.data as TryonRender[]) ? 2500 : false),
  });

  /**
   * Ikkala ro'yxat bitta jadvalga qo'shiladi.
   *
   * ⚠️ TARTIB MUHIM: komplekt ro'yxati OXIRIDA. Bitta kiyim ikkalasida
   * ham bo'lishi mumkin (kiyilgan kiyim o'z turkumining tasmasida ham
   * turadi) va komplekt so'rovi yangiroq — u kuzatib turiladi.
   */
  const renderIndex = useMemo(
    () => indexRenders([...(stripRenders.data ?? []), ...(outfitRenders.data ?? [])]),
    [stripRenders.data, outfitRenders.data],
  );

  /* ── So'rovlar ── */

  /**
   * Yuborilgan so'rovlar belgisi.
   *
   * ⚠️ `useRef` — HOLAT EMAS. Bu qiymat faqat «shuni allaqachon
   * so'raganmiz» degan xotira; holatda bo'lsa har yozuv qayta chizishni
   * keltirib chiqarardi. Va u chizishga umuman ta'sir qilmaydi.
   *
   * ⚠️ USIZ PUL SARFLANARDI. Effektlar so'rov natijalari o'zgarganda
   * qayta ishlaydi; belgisiz har kelgan javob yangi navbat yaratardi.
   */
  const asked = useRef(new Set<string>());

  const batch = useMutation({
    mutationFn: (input: { variantIds: string[]; base: string | null }) =>
      requestRenderBatch(input.variantIds, angle, input.base),
    onSuccess: (result) => {
      if (result.limitReached) setLimitReached(true);
      void queryClient.invalidateQueries({ queryKey: ['renders'] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') setLimitReached(true);
      else setNotice(err instanceof ApiError ? err.message : 'Kiyintirib bo`lmadi');
    },
  });

  const single = useMutation({
    mutationFn: (input: { variantId: string; base: string | null }) =>
      requestRender(input.variantId, angle, input.base),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['renders'] }),
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'RATE_LIMITED') setLimitReached(true);
      else setNotice(err instanceof ApiError ? err.message : 'Kiyintirib bo`lmadi');
    },
  });

  /*
   * ── Tasmani oldindan tayyorlash ──
   *
   * ⚠️ FAQAT OLD KO'RINISHDA. Aylantirilgan ko'rinish uchun ham butun
   * tasma yasalsa sarf uch barobar oshardi, foydalanuvchi esa aylantirgan
   * payt odatda BITTA kiyimni ko'rmoqchi bo'ladi — uni komplekt zanjiri
   * o'zi yasaydi.
   */
  useEffect(() => {
    if (!ready || angle !== 'front') return;
    if (!stripBase.ready || stripIds.length === 0) return;
    if (limitReached) return;

    const missing = stripIds.filter(
      (variantId) => !renderIndex.has(renderKey(variantId, stripBase.baseRenderId)),
    );
    if (missing.length === 0) return;

    const key = `batch:${angle}:${stripBase.baseRenderId ?? 'root'}:${missing.join(',')}`;
    if (asked.current.has(key)) return;
    asked.current.add(key);

    /*
     * ⚠️ `batch` BOG'LIQLIKLARDA YO'Q — ATAYIN. U mutatsiya obyekti va
     * har chizishda yangi havola bo'ladi; ro'yxatga qo'shilsa effekt
     * cheksiz takrorlanardi. Ishlatilayotgani esa faqat `mutate`, u
     * o'zgarmaydi.
     */
    batch.mutate({ variantIds: missing, base: stripBase.baseRenderId });
  }, [ready, angle, stripBase.ready, stripBase.baseRenderId, stripIds, renderIndex, limitReached]);

  /*
   * ── Komplekt zanjirini tiklash ──
   *
   * Bir vaqtda faqat BITTA qatlam so'raladi: keyingisining asosi shu
   * natija bo'ladi va uning `id` si hali mavjud emas. Natija kelishi
   * bilan effekt qaytadan ishlaydi va navbatdagisini so'raydi.
   *
   * ⚠️ SHU BILAN PASTKI QATLAM ALMASHGANDA TEPADAGILAR O'ZI TIKLANADI.
   * Foydalanuvchi futbolkani almashtirsa kurtkaning eski surati
   * yaroqsiz bo'ladi (u boshqa asos ustida edi) — `resolveOutfit` uni
   * topa olmaydi va shu yerda qaytadan so'raladi.
   */
  useEffect(() => {
    if (!ready || limitReached) return;

    const pending = nextPending(resolved);
    if (!pending) return;

    const key = `one:${angle}:${renderKey(pending.variantId, pending.baseRenderId)}`;
    if (asked.current.has(key)) return;
    asked.current.add(key);

    // `single` bog'liqliklarda yo'q — yuqoridagi bilan bir xil sabab
    single.mutate({ variantId: pending.variantId, base: pending.baseRenderId });
  }, [ready, angle, resolved, limitReached]);

  /*
   * ── Turkum ochilganda birinchi kiyim kiyiladi ──
   *
   * ⚠️ MAKETNING VA'DASI SHU. Foydalanuvchi turkumni ochganda o'zini
   * ALLAQACHON kiyingan holda ko'rishi kerak — bo'sh sahna va
   * «kiyintirish» tugmasi emas. Keyingi kiyimlar bosilganda almashadi.
   *
   * ⚠️ FAQAT BO'SH TURKUMGA. Foydalanuvchi bu turkumda allaqachon kiyim
   * tanlagan bo'lsa u saqlanadi — aks holda tab almashtirib qaytish
   * tanlovni yo'qotardi.
   */
  useEffect(() => {
    if (!ready || items.length === 0) return;
    if (dismissed.includes(tab)) return;
    if (outfit.some((layer) => layer.category === tab)) return;

    const first = items[0];
    if (first) wear(tab, first.variantId);
  }, [ready, items, outfit, tab, wear, dismissed]);

  // Tab almashganda o'lcham tanlovi tozalanadi — eski o'lcham yangi
  // kiyimda bo'lmasligi mumkin
  useEffect(() => {
    setSize(null);
    setNotice(null);
  }, [tab]);

  const rotate = useMutation({
    mutationFn: requestAvatarAngle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['avatar'] }),
    onError: (err) => setNotice(err instanceof ApiError ? err.message : 'Aylantirib bo`lmadi'),
  });

  const cart = useMutation({
    mutationFn: async (lines: Array<{ variantId: string; chosenSize: string }>) => {
      // Ketma-ket: savat endpointi bitta qator qabul qiladi
      for (const line of lines) await addToCart(line.variantId, line.chosenSize);
      return lines.length;
    },
    onSuccess: (count) => setNotice(`${count} ta mahsulot savatga qo\`shildi`),
    onError: (err) => setNotice(err instanceof ApiError ? err.message : 'Qo`shilmadi'),
  });

  if (!signedIn) {
    return (
      <Screen>
        <SignInRequired hint="Kiyintirish avataringizga bog`langan." />
      </Screen>
    );
  }

  if (profile.isSuccess && avatar.isSuccess && !ready) {
    return <Redirect href="/ai/avatar" />;
  }

  const angles = avatar.data?.angles ?? {};
  const baseImage = angles[angle] ?? avatar.data?.imageUrl ?? profile.data?.bodyPhotoUrl ?? null;
  const baseCutout = angle === 'front' ? (avatar.data?.cutoutUrl ?? null) : null;

  /** Komplektning eng tepa tayyor surati — sahnada shu turadi */
  const worn = topReady(resolved);

  const failed = resolved.find((layer) => layer.render?.status === 'failed');

  /* ── Joriy turkumdagi tanlov ── */
  const wornHere = outfit.find((layer) => layer.category === tab)?.variantId ?? null;
  const current: Garment | undefined =
    items.find((item) => item.variantId === wornHere) ?? items[0];

  /**
   * Sahnada ko'rsatilayotgan kartaning natijasi.
   *
   * ⚠️ INDIKATOR BUTUN ZANJIRGA EMAS, SHUNGA BOG'LIQ. Ilgari «kutish»
   * belgisi zanjirda BIROR qatlam tayyor bo'lmasa chiqardi. Komplekt
   * beshta qatlamdan iborat bo'lgani va har tabga o'tishda yangisi
   * qo'shilgani uchun bu amalda «doim aylanib turadigan indikator»
   * degani edi — foydalanuvchi tayyor suratni ham xira parda ostida
   * ko'rardi.
   *
   * Endi u faqat KO'RINAYOTGAN narsa kutilayotganda chiqadi.
   */
  const shown = current
    ? renderIndex.get(renderKey(current.variantId, stripBase.baseRenderId))
    : undefined;

  /*
   * ⚠️ CHEGARA TUGAGANDA INDIKATOR CHIQMAYDI. Aks holda u abadiy
   * aylanardi: yangi so'rov yuborilmaydi, natija esa hech qachon
   * kelmaydi. Bunday holda foydalanuvchi tepadagi bannerni o'qiydi va
   * kiyimning oddiy suratini ko'radi.
   */
  const currentWorking = Boolean(
    current &&
    !(limitReached && !shown) &&
    (!stripBase.ready || !shown || shown.status === 'pending' || shown.status === 'processing'),
  );

  const deckIndex = Math.max(
    0,
    items.findIndex((item) => item.variantId === current?.variantId),
  );

  /**
   * Joriy turkumning OSTIDAGI komplekt surati.
   *
   * ⚠️ ENG TEPA NATIJA EMAS. Foydalanuvchi futbolkalar tabida turganda
   * unga futbolkalar KURTKASIZ ko'rsatiladi — u aynan futbolkani
   * tanlayapti va kurtka uni bekitib turardi. Shuning uchun zaxira
   * surat ham shu qatlamning asosi bo'lishi kerak; `topReady` olinsa
   * tayyor kartada kurtkasiz, tayyor bo'lmaganida kurtkali surat
   * chiqib, tasma sakrab ketardi.
   */
  const layerBase = stripBase.baseRenderId
    ? (resolved.find((layer) => layer.render?.id === stripBase.baseRenderId)?.render ?? null)
    : null;

  /*
   * Svayp tasmasi — turkumdagi HAR kiyim uchun bitta karta, hammasi
   * shu turkum ostidagi komplekt ustida.
   *
   * ⚠️ TAYYOR BO'LMAGANIDA KOMPLEKTNING O'ZI TURADI, kiyim surati emas.
   * Bo'sh karta qo'yilsa svayp «teshik»ka tushardi; kiyim surati
   * qo'yilsa esa ekran «katalog»ga o'xshab qolardi — bu ekranning
   * ma'nosi esa O'ZINGNI ko'rish.
   */
  const deck = items.map((item) => {
    const render = renderIndex.get(renderKey(item.variantId, stripBase.baseRenderId));

    if (render?.status === 'ready') {
      return { key: item.variantId, url: render.cutoutUrl ?? render.imageUrl };
    }

    return {
      key: item.variantId,
      url: layerBase?.cutoutUrl ?? layerBase?.imageUrl ?? baseCutout ?? baseImage,
    };
  });

  const colorOptions = current ? items.filter((item) => item.productId === current.productId) : [];
  const sizes = current?.sizes ?? [];
  const picked = size ?? (fitSize && sizes.includes(fitSize) ? fitSize : sizes[0]) ?? null;

  /* ── Komplekt jamlanmasi ── */
  const outfitItems = outfit
    .map((layer) => seen[layer.variantId])
    .filter((item): item is Garment => Boolean(item));

  const outfitTotal = outfitItems.reduce((sum, item) => sum + Number(item.price), 0);
  const outfitCurrency = outfitItems[0]?.currency ?? 'UZS';

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        {showBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Orqaga"
            hitSlop={10}
            onPress={() => goBack('/(tabs)')}
            style={styles.headerButton}
          >
            <Icon name="back" size={20} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.headerButton} />
        )}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Kiyintirish</Text>
          {/*
            ⚠️ SARLAVHA OSTIDA DO'KON — VA U BOSILADI. Ilgari bu yerda
            «Kiyimni tanlang» degan yozuv turardi: u hech narsa
            aytmasdi va hech qayerga olib bormasdi. Do'kon esa
            foydalanuvchi ko'rayotgan ro'yxatni belgilaydi va uni
            almashtirish eng ko'p kerak bo'ladigan amal.
          */}
          <Pressable onPress={() => setStoreOpen(true)} hitSlop={8} style={styles.storeChip}>
            <Icon name="stores" size={12} color={colors.accent} />
            <Text style={styles.storeChipText} numberOfLines={1}>
              {storeName ?? "Do'kon tanlang"}
            </Text>
            <Icon name="next" size={12} color={colors.textDim} />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Avatarni almashtirish"
          hitSlop={10}
          onPress={() => router.push('/ai/avatar')}
          style={styles.headerButton}
        >
          <Icon name="camera" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* ── Avatar maydoni ── */}
      <View style={styles.stage}>
        <AvatarStage
          imageUrl={worn?.imageUrl ?? baseImage}
          cutoutUrl={worn?.cutoutUrl ?? baseCutout}
          dimmed={!worn && currentWorking}
          showRings
        >
          <PhotoSwipe
            photos={deck}
            index={deckIndex}
            onIndexChange={(next) => {
              const item = items[next];
              if (!item) return;

              /*
               * ⚠️ SVAYP HAM KIYINTIRADI, faqat ko'rsatmaydi. Aks holda
               * ekranda bir kiyim ko'rinib, komplektda boshqasi turardi —
               * va «Savatga» tugmasi ko'rinmayotgan narsani qo'shardi.
               */
              putOn(tab, item.variantId);

              stripRef.current?.scrollToIndex({
                index: next,
                animated: true,
                viewPosition: 0.5,
              });
            }}
          />
        </AvatarStage>

        <View style={styles.sideControls} pointerEvents="box-none">
          <Control
            icon="rotate"
            label={ANGLE_LABEL[angle]}
            busy={Boolean(avatar.data?.anglePending) || rotate.isPending}
            onPress={() => {
              const next =
                ANGLE_ORDER[(ANGLE_ORDER.indexOf(angle) + 1) % ANGLE_ORDER.length] ?? 'front';
              setAngle(next);
              setNotice(null);

              // Keshda bo'lmasa yasaymiz — bo'lsa bepul ko'rsatiladi
              if (!angles[next]) rotate.mutate(next);
            }}
          />
          <Control
            icon="zoom"
            label={zoomed ? 'Kichraytir' : 'Yaqinlashtir'}
            onPress={() => setZoomed((value) => !value)}
          />
          <Control
            icon="reset"
            label="Yechish"
            onPress={() => {
              /*
               * ⚠️ BUTUN KOMPLEKTNI EMAS, JORIY TURKUMNI. Hammasini
               * yechish tugmasi ham bor edi, lekin u ko'proq tasodifan
               * bosilardi va o'nlab kredit bilan yig'ilgan komplektni
               * bir zumda yo'q qilardi. Turkumni yechish esa qaytarib
               * bo'ladigan amal — kiyim tasmada turibdi.
               */
              remove(tab);
            }}
          />
        </View>

        {/* Kiyilgan qatlamlar — maketdagi ko'rsatkich */}
        {resolved.length > 0 ? (
          <View style={styles.layerRail} pointerEvents="none">
            {resolved.map((layer) => (
              <View
                key={layer.category}
                style={[
                  styles.layerDot,
                  layer.render?.status === 'ready' && styles.layerDotReady,
                  layer.category === tab && styles.layerDotActive,
                ]}
              />
            ))}
          </View>
        ) : null}

        {currentWorking ? (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.overlayText}>AI kiyintirmoqda…</Text>
            <Text style={styles.overlayHint}>
              {stripBase.ready ? 'Har qatlam 10–20 soniya' : 'Avval ostidagi qatlam tayyorlanmoqda'}
            </Text>
          </View>
        ) : null}

        {failed && !currentWorking ? (
          <View style={styles.overlay} pointerEvents="none">
            <Icon name="close" size={26} color={colors.danger} />
            <Text style={styles.overlayText}>Kiyintirib bo`lmadi</Text>
            <Text style={styles.overlayHint} numberOfLines={2}>
              {failed.render?.error ?? 'Boshqa kiyim bilan urinib ko`ring'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Kategoriya tablari ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabsWrap}
      >
        {TABS.map((item) => {
          const active = tab === item.category;
          const dressed = outfit.some((layer) => layer.category === item.category);

          return (
            <Pressable
              key={item.category}
              accessibilityRole="button"
              onPress={() => setTab(item.category)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Icon name={item.icon} size={18} color={active ? colors.accent : colors.textDim} />
              <Text style={[styles.tabText, active && { color: colors.text }]}>{item.label}</Text>
              {/* Kiyilgan turkum belgilanadi — komplekt qayerda yig'ilgani ko'rinsin */}
              {dressed ? <View style={styles.tabDressed} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.bottom} showsVerticalScrollIndicator={false}>
        {limitReached ? (
          <View style={styles.banner}>
            <Icon name="clock" size={14} color={colors.warning} />
            <Text style={styles.bannerText}>
              Kunlik AI chegarasi tugadi. Tayyor suratlar qoladi, yangilari ertaga.
            </Text>
          </View>
        ) : null}

        {/* ── Kiyim tasmasi ── */}
        {garments.isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.stripLoader} />
        ) : items.length === 0 ? (
          /*
            ⚠️ BO'SH RO'YXAT — BOSHI BERK KO'CHA EMAS. Ikkala chiqish
            yo'li ham shu yerda: filtrni bo'shatish yoki do'konni
            almashtirish. Ilgari faqat «kiyim yo'q» yozuvi turardi.
          */
          <View style={styles.emptyBox}>
            <Text style={styles.emptyStrip}>
              {sizeFilter
                ? `${storeName ?? 'Bu do‘kon'}da ${sizeFilter} o‘lchamdagi ${activeTab?.label.toLowerCase()} yo‘q`
                : 'Bu turkumda hozircha kiyim yo`q'}
            </Text>
            <View style={styles.emptyActions}>
              {sizeFilter ? (
                <Button
                  title="Barcha o`lchamlarni ko`rsat"
                  variant="ghost"
                  onPress={() => setOnlyMySize(false)}
                />
              ) : null}
              <Button title="Boshqa do`kon tanlash" onPress={() => setStoreOpen(true)} />
            </View>
          </View>
        ) : (
          <FlatList
            ref={stripRef}
            data={items}
            keyExtractor={(item) => item.variantId}
            getItemLayout={(_data, index) => ({
              length: STRIP_ITEM,
              offset: STRIP_ITEM * index,
              index,
            })}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
            removeClippedSubviews
            renderItem={({ item }) => {
              const selected = item.variantId === current?.variantId;
              const render = renderIndex.get(renderKey(item.variantId, stripBase.baseRenderId));
              const isReady = render?.status === 'ready';
              const busy = render?.status === 'pending' || render?.status === 'processing';

              /*
               * ⚠️ KARTOCHKADA ODAMNING O'ZI — MAKETDAGI ASOSIY FIKR.
               * Har kartochka kiyimning yassi suratini emas, MODELNI
               * o'sha kiyimda ko'rsatadi. Endi bu deyarli hamma
               * kartochkada bor: tasma oldindan tayyorlanadi.
               */
              const preview = isReady ? (render.cutoutUrl ?? render.imageUrl) : item.image;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => {
                    /*
                     * ⚠️ BOSISH = KIYINTIRISH. Ilgari bosish faqat
                     * tanlardi va pastda alohida «Kiyintirish» tugmasi
                     * bor edi — ya'ni natijani ko'rish uchun ikki
                     * bosish kerak edi.
                     */
                    putOn(tab, item.variantId);
                  }}
                  style={[styles.thumbWrap, selected && styles.thumbSelected]}
                >
                  <Image
                    source={{ uri: preview ?? undefined }}
                    style={[styles.thumb, isReady && styles.thumbWorn]}
                    resizeMode={isReady ? 'contain' : 'cover'}
                  />

                  {busy ? (
                    <View style={styles.thumbBusy}>
                      <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                  ) : null}

                  {isReady ? (
                    <View style={styles.readyBadge}>
                      <Icon name="authentic" size={10} color={colors.bg} />
                    </View>
                  ) : null}
                </Pressable>
              );
            }}
          />
        )}

        {current ? (
          <View style={styles.details}>
            <Text style={styles.title} numberOfLines={1}>
              {current.title}
            </Text>
            <Text style={styles.store} numberOfLines={1}>
              {current.store.name}
            </Text>

            {colorOptions.length > 1 ? (
              <>
                <Text style={styles.label}>Rang</Text>
                <View style={styles.colors}>
                  {colorOptions.map((option) => (
                    <Pressable
                      key={option.variantId}
                      accessibilityRole="button"
                      accessibilityLabel={`Rang: ${option.colorHex ?? option.title}`}
                      onPress={() => {
                        putOn(tab, option.variantId);
                      }}
                      style={[
                        styles.color,
                        { backgroundColor: option.colorHex ?? colors.surface2 },
                        option.variantId === current.variantId && styles.colorActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {sizes.length > 0 ? (
              <>
                <View style={styles.sizeHead}>
                  <Text style={styles.label}>
                    O`lcham
                    {fitSize ? <Text style={styles.recommend}> · sizga {fitSize}</Text> : null}
                  </Text>
                  {/*
                    Filtr holati ko'rinib tursin: foydalanuvchi ro'yxat
                    nega qisqa ekanini bilishi kerak
                  */}
                  {fitSize ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setOnlyMySize((value) => !value)}
                      hitSlop={8}
                      style={[styles.filterPill, onlyMySize && styles.filterPillActive]}
                    >
                      <Icon
                        name="filter"
                        size={12}
                        color={onlyMySize ? colors.accent : colors.textDim}
                      />
                      <Text style={[styles.filterText, onlyMySize && { color: colors.accent }]}>
                        Faqat mening o`lchamim
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.sizes}>
                  {sizes.map((item) => (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      onPress={() => setSize(item)}
                      style={[styles.size, picked === item && styles.sizeActive]}
                    >
                      <Text style={[styles.sizeText, picked === item && { color: colors.text }]}>
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.soldOut}>Bu mahsulot omborda tugagan</Text>
            )}

            {notice ? <Text style={styles.notice}>{notice}</Text> : null}

            {/*
              ── Komplekt ──

              ⚠️ ILGARI BU YERDA «Uslub» QATORI TURARDI. U tanlovni
              filtrlamasdi va faqat `aiFlowStore` ga yozardi — ya'ni
              ekranda hech narsani o'zgartirmaydigan beshta tugma.
              Uning o'rnida endi komplektning o'zi: nima kiyilgan,
              qancha turadi va bir bosishda savatga.
            */}
            {outfitItems.length > 0 ? (
              <View style={styles.outfitCard}>
                <View style={styles.outfitHead}>
                  <Text style={styles.outfitTitle}>Komplekt · {outfitItems.length} ta</Text>
                  <Text style={styles.outfitTotal}>
                    {money(String(outfitTotal), outfitCurrency)}
                  </Text>
                </View>

                <View style={styles.outfitRow}>
                  {resolved.map((layer) => {
                    const item = seen[layer.variantId];
                    if (!item) return null;

                    return (
                      <Pressable
                        key={layer.category}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.title} — yechish`}
                        onPress={() => remove(layer.category)}
                        style={styles.outfitItem}
                      >
                        <Image source={{ uri: item.image }} style={styles.outfitThumb} />
                        <View style={styles.outfitRemove}>
                          <Icon name="close" size={9} color={colors.text} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Button
                title={
                  picked ? `Savatga · ${money(current.price, current.currency)}` : 'O`lcham tanlang'
                }
                disabled={!picked || cart.isPending}
                loading={cart.isPending}
                onPress={() =>
                  picked && cart.mutate([{ variantId: current.variantId, chosenSize: picked }])
                }
              />

              {/*
                Butun komplektni savatga — bir bosishda.

                ⚠️ FAQAT BIRDAN KO'P BO'LSA. Bitta kiyimda u yuqoridagi
                tugmani takrorlaydi va foydalanuvchi qaysi biri nima
                qilishini o'ylab qolardi.

                ⚠️ HAR MAHSULOTGA O'ZINING TAVSIYA O'LCHAMI. Ustki va
                pastki kiyimning o'lchami har xil hisoblanadi (ko'krak /
                bel) — birini ikkinchisiga qo'llasak, shim noto'g'ri
                o'lchamda savatga tushardi.
              */}
              {outfitItems.length > 1 ? (
                <Button
                  title={`Butun komplektni savatga · ${money(String(outfitTotal), outfitCurrency)}`}
                  variant="ghost"
                  disabled={cart.isPending}
                  onPress={() => {
                    const lines = outfitItems
                      .map((item) => {
                        const fit = measurements ? recommendSize(item.slot, measurements) : null;
                        const chosenSize =
                          fit && item.sizes.includes(fit) ? fit : (item.sizes[0] ?? null);
                        return chosenSize ? { variantId: item.variantId, chosenSize } : null;
                      })
                      .filter((line): line is { variantId: string; chosenSize: string } =>
                        Boolean(line),
                      );

                    if (lines.length === 0) {
                      setNotice('Komplektdagi mahsulotlar omborda tugagan');
                      return;
                    }

                    cart.mutate(lines);
                  }}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <StorePicker
        visible={storeOpen}
        onClose={() => setStoreOpen(false)}
        selectedId={storeId}
        size={sizeFilter}
        gender={gender}
        onSelect={(store) => {
          setStore(store.id, store.name);
          setLimitReached(false);
          setNotice(null);
          /*
           * ⚠️ BELGILAR TOZALANADI. Ular «shu asos ustida shu kiyimni
           * allaqachon so'radik» degani; do'kon almashsa kiyimlar ham,
           * asoslar ham boshqa bo'ladi va eski belgilar yangi so'rovlarni
           * to'sib qo'yardi.
           */
          asked.current.clear();
        }}
      />
    </Screen>
  );
}

/** Avatar yonidagi dumaloq tugma — maketdagi uslubda. */
function Control({
  icon,
  label,
  onPress,
  danger = false,
  busy = false,
  boxed = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  /** Ish ketayotganda tugma bloklanadi — takroriy bosish kredit yeydi */
  busy?: boolean;
  /** To'rtburchak ramka — maketdagi «Remove Clothing» uslubi */
  boxed?: boolean;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={busy}
      style={styles.control}
    >
      <View
        style={[
          styles.controlIcon,
          boxed && styles.controlBoxed,
          danger && styles.controlDanger,
          busy && styles.controlBusy,
        ]}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Icon name={icon} size={16} color={danger ? colors.danger : colors.text} />
        )}
      </View>
      <Text style={[styles.controlLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { ...text.h3, color: colors.text },

  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 200,
  },
  storeChipText: { ...text.tiny, color: colors.textMuted, flexShrink: 1 },

  /*
   * ⚠️ BALANDLIK ULUSH BILAN, NISBAT BILAN EMAS. `aspectRatio: 3/4` da
   * sahna ekranning 56% ini egallab, pastdagi tanlov qatorlarini yeb
   * qo'yardi. Maketda sahna ekranning uchdan biri, qolgani tanlov uchun.
   */
  stage: {
    height: '44%',
    margin: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { flex: 1 },
  dimmed: { opacity: 0.35 },

  /* Chapdagi tik qator — maketdagi Rotate / Zoom / Reset */
  sideControls: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.lg,
    gap: spacing.lg,
  },
  control: { alignItems: 'center', gap: 2 },
  controlIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10, 10, 15, 0.72)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBoxed: { borderRadius: radius.md, width: 46, height: 46 },
  controlDanger: { borderColor: colors.danger, backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  controlBusy: { borderColor: colors.borderAccent },
  controlLabel: { ...text.tiny, color: colors.textMuted },

  /*
   * O'ngdagi qatlam ko'rsatkichi — nechta kiyim kiyilgani.
   *
   * ⚠️ RAQAM EMAS, NUQTA. Komplektda ko'pi bilan beshta qatlam bo'ladi
   * va ularni sanashdan ko'ra ko'rish tez: to'lgan nuqta — tayyor
   * qatlam, bo'shi — kelayotgani.
   */
  layerRail: {
    position: 'absolute',
    right: spacing.sm,
    top: '40%',
    gap: spacing.xs,
  },
  layerDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  layerDotReady: { backgroundColor: colors.accent, borderColor: colors.accent },
  layerDotActive: { width: 8, height: 18 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  overlayText: { ...text.bodyMed, color: colors.text, textAlign: 'center' },
  overlayHint: { ...text.tiny, color: colors.textDim, textAlign: 'center' },

  tabsWrap: { flexGrow: 0 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm },
  tab: {
    minWidth: 76,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: { borderColor: colors.borderAccent, backgroundColor: colors.primarySoft },
  tabText: { ...text.tiny, color: colors.textDim },
  tabDressed: {
    position: 'absolute',
    top: 6,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },

  bottom: { paddingBottom: spacing.xl },
  stripLoader: { marginVertical: spacing.lg },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
  },
  bannerText: { ...text.tiny, color: colors.textMuted, flex: 1 },

  emptyBox: { padding: spacing.lg, gap: spacing.md },
  emptyStrip: { ...text.small, color: colors.textDim, textAlign: 'center' },
  emptyActions: { gap: spacing.sm },

  strip: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  thumbWrap: {
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbSelected: { borderColor: colors.accent },
  thumb: { width: 72, height: 92, backgroundColor: colors.surface2 },
  thumbWorn: { backgroundColor: colors.bg },
  thumbBusy: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.55)',
  },
  readyBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  details: { paddingHorizontal: spacing.md, gap: spacing.xs },
  title: { ...text.h3, color: colors.text },
  store: { ...text.tiny, color: colors.textDim },

  label: { ...text.label, color: colors.textDim, marginTop: spacing.md },
  recommend: { ...text.tiny, color: colors.accent },

  sizeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: { borderColor: colors.borderAccent, backgroundColor: colors.primarySoft },
  filterText: { ...text.tiny, color: colors.textDim },

  colors: { flexDirection: 'row', gap: spacing.sm },
  color: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  colorActive: { borderColor: colors.accent, borderWidth: 3 },

  sizes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  size: {
    minWidth: 52,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sizeActive: { borderColor: colors.borderAccent, backgroundColor: colors.primarySoft },
  sizeText: { ...text.bodyMed, color: colors.textMuted },

  outfitCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  outfitHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  outfitTitle: { ...text.label, color: colors.textMuted },
  outfitTotal: { ...text.bodyMed, color: colors.accent },
  outfitRow: { flexDirection: 'row', gap: spacing.sm },
  outfitItem: { position: 'relative' },
  outfitThumb: {
    width: 44,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  outfitRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  soldOut: { ...text.small, color: colors.warning, marginTop: spacing.sm },
  notice: { ...text.small, color: colors.accent, marginTop: spacing.sm },
  actions: { marginTop: spacing.md, gap: spacing.sm },
});
