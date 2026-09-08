import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  baseForCategory,
  clearLayer,
  indexRenders,
  nextPending,
  renderKey,
  resolveOutfit,
  setLayer,
  topReady,
  type OutfitLayer,
} from '@looksave/validation';

import type { AvatarAngle, Garment, TryonRender } from '@/api/endpoints';
import type { TryonState } from '@/routes/try-on.state';

/**
 * Kiyintirish sahifasining butun mantiqi.
 *
 * ⚠️ NEGA HOOK, KOMPONENT EMAS. Bu yerda o'nga yaqin bog'liq holat bor
 * (turkum, burchak, komplekt, do'kon, chegara, so'ralganlar belgisi) va
 * ular orasidagi qoidalar sahifaning JSX'i bilan aralashib ketsa, har
 * o'zgarishda ikkalasini birga o'qishga to'g'ri kelardi.
 *
 * ⚠️ MOBIL ILOVADAGI `FittingExperience.tsx` BILAN BIR XIL QOIDALAR.
 * Umumiy mantiq (`resolveOutfit`, `recommendSize`) `@looksave/validation`
 * da — ikki tomon ajralib ketmasligi uchun. Bu yerda faqat brauzerga xos
 * qism: `fetch`, polling va `localStorage`.
 *
 * ⚠️ REACT QUERY ISHLATILMAYDI. Paket bog'liqlikda bor, lekin saytda
 * hech qayerda ulanmagan (`root.tsx` da provayder yo'q). Bitta sahifa
 * uchun butun ilovaga provayder qo'shish — alohida qaror; oddiy
 * `fetch` + interval bu yerda yetarli.
 */

/** Tanlangan do'kon brauzerda saqlanadi — sahifa har ochilganda so'ralmasin */
const STORE_KEY = 'looksave.tryon.store';

/** Natija kutilayotganda holat shu oraliqda qayta so'raladi */
const POLL_MS = 2500;

export interface ChosenStore {
  id: string;
  name: string;
}

function readStore(): ChosenStore | null {
  /*
   * ⚠️ SSR'DA `localStorage` YO'Q va `try/catch` shart: brauzerda ham u
   * o'chirilgan bo'lishi mumkin (maxfiylik rejimi, korporativ siyosat).
   * Bunday holda do'kon shunchaki har safar so'raladi.
   */
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;

    const saved = JSON.parse(raw) as { id?: unknown; name?: unknown };
    return typeof saved.id === 'string' && typeof saved.name === 'string'
      ? { id: saved.id, name: saved.name }
      : null;
  } catch {
    return null;
  }
}

function writeStore(store: ChosenStore | null): void {
  try {
    if (store) window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    else window.localStorage.removeItem(STORE_KEY);
  } catch {
    // Saqlanmasa do'kon keyingi safar qaytadan so'raladi — ekran buzilmaydi
  }
}

interface ActBody {
  op: string;
  [key: string]: unknown;
}

export function useTryon(locale: string) {
  const [tab, setTab] = useState('tshirt');
  const [angle, setAngle] = useState<AvatarAngle>('front');
  const [outfit, setOutfit] = useState<OutfitLayer[]>([]);
  const [store, setStoreState] = useState<ChosenStore | null>(null);
  const [onlyMySize, setOnlyMySize] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [limitReached, setLimitReached] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [state, setState] = useState<TryonState | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * ⚠️ DO'KON BIRINCHI CHIZISHDA O'QILMAYDI. Server `localStorage` ni
   * ko'rmaydi va agar uni boshlang'ich holatga qo'ysak, serverning
   * chizgani bilan brauzerniki mos kelmay hidratsiya xatosi chiqardi.
   */
  useEffect(() => setStoreState(readStore()), []);

  const setStore = useCallback((next: ChosenStore | null) => {
    writeStore(next);
    setLimitReached(false);
    setNotice(null);
    /*
     * ⚠️ DO'KON ALMASHSA KOMPLEKT TOZALANADI. Kiyimlar do'konga
     * bog'langan: eski do'konning futbolkasi yangi ro'yxatda yo'q va
     * uni savatga qo'shib bo'lmaydi.
     */
    setOutfit([]);
    setDismissed([]);
    setStoreState(next);
  }, []);

  /**
   * Yuborilgan so'rovlar belgisi.
   *
   * ⚠️ USIZ PUL SARFLANARDI. Effektlar holat har yangilanganda qayta
   * ishlaydi; belgisiz har kelgan javob yangi navbat yaratardi.
   */
  const asked = useRef(new Set<string>());

  /** Eskirgan javoblarni tashlash uchun — so'rovlar ketma-ket kelmasligi mumkin */
  const requestSeq = useRef(0);

  const outfitParam = useMemo(
    () => outfit.map((layer) => `${layer.category}:${layer.variantId}`).join(','),
    [outfit],
  );

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;

    const params = new URLSearchParams({ category: tab, angle, fit: onlyMySize ? '1' : '0' });
    if (store) params.set('storeId', store.id);
    if (outfitParam) params.set('outfit', outfitParam);

    try {
      const response = await fetch(`/${locale}/try-on/state?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const payload = (await response.json()) as TryonState;

      // Kechikkan javob yangisini bosib ketmasin
      if (seq === requestSeq.current) setState(payload);
    } catch {
      if (seq === requestSeq.current) {
        setNotice('Tarmoq bilan bog`lanib bo`lmadi');
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [locale, tab, angle, onlyMySize, store, outfitParam]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Natijalar jadvali — tasma va komplekt bir joyda qidiriladi */
  const renderIndex = useMemo(
    () => indexRenders([...(state?.stripRenders ?? []), ...(state?.outfitRenders ?? [])]),
    [state?.stripRenders, state?.outfitRenders],
  );

  const resolved = useMemo(
    () => resolveOutfit(outfit, indexRenders(state?.outfitRenders ?? [])),
    [outfit, state?.outfitRenders],
  );

  /*
   * ⚠️ ASOSNI SERVER BERADI, LEKIN U ESKIRGAN BO'LISHI MUMKIN: komplekt
   * mijozda o'zgargan, javob esa hali kelmagan. Shuning uchun asos shu
   * yerda ham qaytadan hisoblanadi — bir xil modul bilan, ya'ni natija
   * ham bir xil bo'ladi.
   */
  const stripBase = useMemo(() => baseForCategory(resolved, tab), [resolved, tab]);

  const items = useMemo(() => state?.garments ?? [], [state?.garments]);

  /** Natija kutilayotgan bo'lsa holat qayta so'raladi */
  const pending = useMemo(
    () =>
      [...(state?.stripRenders ?? []), ...(state?.outfitRenders ?? [])].some(
        (render) => render.status === 'pending' || render.status === 'processing',
      ) || state?.avatar?.status === 'processing',
    [state],
  );

  useEffect(() => {
    if (!pending) return;

    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [pending, refresh]);

  const act = useCallback(
    async (body: ActBody): Promise<{ data?: unknown; error?: string; code?: string }> => {
      const response = await fetch(`/${locale}/try-on/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });

      return (await response.json()) as { data?: unknown; error?: string; code?: string };
    },
    [locale],
  );

  /*
   * ── Tasmani oldindan tayyorlash ──
   *
   * ⚠️ FAQAT OLD KO'RINISHDA. Aylantirilgan ko'rinish uchun ham butun
   * tasma yasalsa sarf uch barobar oshardi; aylantirgan foydalanuvchi
   * esa odatda bitta kiyimni ko'rmoqchi bo'ladi va uni komplekt zanjiri
   * o'zi yasaydi.
   */
  useEffect(() => {
    if (!state?.ready || angle !== 'front' || limitReached) return;
    if (!stripBase.ready || items.length === 0) return;

    const missing = items
      .map((item) => item.variantId)
      .filter((variantId) => !renderIndex.has(renderKey(variantId, stripBase.baseRenderId)));

    if (missing.length === 0) return;

    const key = `batch:${angle}:${stripBase.baseRenderId ?? 'root'}:${missing.join(',')}`;
    if (asked.current.has(key)) return;
    asked.current.add(key);

    void act({
      op: 'batch',
      variantIds: missing,
      angle,
      baseRenderId: stripBase.baseRenderId,
    }).then((result) => {
      if (result.code === 'RATE_LIMITED') setLimitReached(true);
      else if ((result.data as { limitReached?: boolean } | undefined)?.limitReached) {
        setLimitReached(true);
      }
      void refresh();
    });
  }, [state?.ready, angle, limitReached, stripBase, items, renderIndex, act, refresh]);

  /*
   * ── Komplekt zanjirini tiklash ──
   *
   * Bir vaqtda faqat BITTA qatlam so'raladi: keyingisining asosi shu
   * natija bo'ladi va uning `id` si hali mavjud emas.
   *
   * ⚠️ SHU BILAN PASTKI QATLAM ALMASHGANDA TEPADAGILAR O'ZI TIKLANADI:
   * eski surat boshqa asos ustida edi, `resolveOutfit` uni topa olmaydi
   * va u shu yerda qaytadan so'raladi.
   */
  useEffect(() => {
    if (!state?.ready || limitReached) return;

    const next = nextPending(resolved);
    if (!next) return;

    const key = `one:${angle}:${renderKey(next.variantId, next.baseRenderId)}`;
    if (asked.current.has(key)) return;
    asked.current.add(key);

    void act({
      op: 'render',
      variantId: next.variantId,
      angle,
      baseRenderId: next.baseRenderId,
    }).then((result) => {
      if (result.code === 'RATE_LIMITED') setLimitReached(true);
      void refresh();
    });
  }, [state?.ready, limitReached, resolved, angle, act, refresh]);

  const wear = useCallback((category: string, variantId: string) => {
    setDismissed((current) => current.filter((item) => item !== category));
    setOutfit((current) => setLayer(current, category, variantId));
    setNotice(null);
  }, []);

  const takeOff = useCallback((category: string) => {
    /*
     * ⚠️ BELGI SHART. Turkum ochilganda birinchi kiyim o'zi kiyiladi;
     * yechilgani belgilanmasa o'sha qoida uni darhol qaytarardi va
     * tugma buzuq ko'rinardi.
     */
    setDismissed((current) => (current.includes(category) ? current : [...current, category]));
    setOutfit((current) => clearLayer(current, category));
    setNotice(null);
  }, []);

  /*
   * ── Turkum ochilganda birinchi kiyim kiyiladi ──
   *
   * ⚠️ MAKETNING VA'DASI SHU: foydalanuvchi turkumni ochganda o'zini
   * ALLAQACHON kiyingan holda ko'rishi kerak, bo'sh sahna emas.
   */
  useEffect(() => {
    if (!state?.ready || items.length === 0) return;
    if (dismissed.includes(tab)) return;
    if (outfit.some((layer) => layer.category === tab)) return;

    const first = items[0];
    if (first) wear(tab, first.variantId);
  }, [state?.ready, items, dismissed, outfit, tab, wear]);

  /* ── Ko'rilgan kiyimlar keshi — komplekt jamlanmasi uchun ── */
  const [seen, setSeen] = useState<Record<string, Garment>>({});

  useEffect(() => {
    if (items.length === 0) return;
    setSeen((current) => {
      const next = { ...current };
      for (const item of items) next[item.variantId] = item;
      return next;
    });
  }, [items]);

  /* ── Ko'rsatiladigan qiymatlar ── */

  const wornHere = outfit.find((layer) => layer.category === tab)?.variantId ?? null;
  const current = items.find((item) => item.variantId === wornHere) ?? items[0];

  const shown: TryonRender | undefined = current
    ? renderIndex.get(renderKey(current.variantId, stripBase.baseRenderId))
    : undefined;

  /*
   * ⚠️ CHEGARA TUGAGANDA INDIKATOR CHIQMAYDI — aks holda u abadiy
   * aylanardi: yangi so'rov yuborilmaydi, natija ham kelmaydi.
   */
  const rendering = Boolean(
    current &&
    !(limitReached && !shown) &&
    (!stripBase.ready || !shown || shown.status === 'pending' || shown.status === 'processing'),
  );

  const failed = resolved.find((layer) => layer.render?.status === 'failed')?.render ?? null;

  /** Komplektning eng tepa tayyor surati */
  const worn = topReady(resolved);

  /**
   * Joriy turkum OSTIDAGI komplekt surati.
   *
   * ⚠️ ENG TEPA NATIJA EMAS. Futbolkalar tabida turgan foydalanuvchiga
   * ular KURTKASIZ ko'rsatiladi — u aynan futbolkani tanlayapti va
   * kurtka uni bekitib turardi.
   */
  const layerBase = stripBase.baseRenderId
    ? (resolved.find((layer) => layer.render?.id === stripBase.baseRenderId)?.render ?? null)
    : null;

  const outfitItems = outfit
    .map((layer) => seen[layer.variantId])
    .filter((item): item is Garment => Boolean(item));

  return {
    // holat
    state,
    loading,
    busy,
    notice,
    limitReached,
    setNotice,

    // tanlovlar
    tab,
    setTab,
    angle,
    setAngle,
    onlyMySize,
    setOnlyMySize,
    store,
    setStore,

    // komplekt
    outfit,
    resolved,
    outfitItems,
    wear,
    takeOff,

    // ko'rsatish
    items,
    current,
    shown,
    worn,
    layerBase,
    stripBase,
    renderIndex,
    rendering,
    failed,

    // amallar
    act,
    refresh,
    setBusy,
    setLimitReached,
  };
}

export type TryonController = ReturnType<typeof useTryon>;
