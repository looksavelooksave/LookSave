import { useCallback, useEffect, useState } from 'react';

import { Button, Card, Icon } from '@looksave/ui-web';

import type { TryonStore } from '@/api/endpoints';

import type { ChosenStore, TryonController } from './useTryon';

/**
 * Do'kon tanlagich — sozlashning uchinchi qadami VA keyinchalik
 * almashtirgich.
 *
 * ⚠️ BIR KOMPONENT, IKKI VAZIFA — ATAYIN. Sozlashda u karta bo'lib
 * ochiladi, kiyintirish paytida esa panel bo'lib chiqadi. Ro'yxatning
 * o'zi, tartibi va yozuvlari bir xil: ikki nusxa bo'lsa biriga
 * qo'shilgan tuzatish ikkinchisiga tushmasdi.
 *
 * ⚠️ RO'YXAT AYNAN SHU EKRAN KO'RSATADIGANINI SANAYDI. `/tryon/stores`
 * do'konlarni AI kiyintira oladigan kiyimlar bo'yicha sanaydi va
 * o'lcham filtrini ham hisobga oladi — ya'ni «12 ta kiyim» yozuvi
 * foydalanuvchi ichkariga kirganda ko'radigan son bilan bir xil.
 * Do'konlar sahifasidagi ro'yxat esa 3D modellarni sanaydi va bu yerda
 * yolg'on ko'rsatkich bo'lardi.
 */

export interface StorePickerProps {
  controller: TryonController;
  locale: string;
  /** Panel ko'rinishida — sozlash qadamida karta bo'lib chiziladi */
  asPanel?: boolean;
  onClose?: () => void;
}

export function StorePicker({
  controller,
  locale,
  asPanel = false,
  onClose,
}: StorePickerProps): JSX.Element {
  const { state, store, setStore, onlyMySize } = controller;

  const [stores, setStores] = useState<TryonStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const size = onlyMySize ? (state?.fitSize ?? null) : null;
  const gender = state?.profile?.gender ?? null;

  const load = useCallback(
    async (coords: { lat: number; lng: number } | null) => {
      const params = new URLSearchParams();
      if (coords) {
        params.set('lat', String(coords.lat));
        params.set('lng', String(coords.lng));
      }
      if (gender) params.set('gender', gender);
      if (size) params.set('size', size);

      try {
        const response = await fetch(`/${locale}/try-on/stores?${params.toString()}`, {
          headers: { Accept: 'application/json' },
        });
        const payload = (await response.json()) as { stores: TryonStore[]; error: string | null };

        setStores(payload.stores);
        setError(payload.error);
      } catch {
        setError('Do‘konlar yuklanmadi');
      } finally {
        setLoading(false);
      }
    },
    [locale, gender, size],
  );

  /*
   * ⚠️ JOYLASHUV SO'RALADI, LEKIN KUTILMAYDI. Ruxsat oynasi ochiq
   * turganda ro'yxat bo'sh qolsa, foydalanuvchi «yuklanmadi» deb
   * o'ylardi. Shuning uchun avval koordinatasiz yuklaymiz; ruxsat
   * berilsa ro'yxat masofa bo'yicha qayta tartiblanadi.
   */
  useEffect(() => {
    void load(null);

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => void load({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {
        // Rad etilsa masofasiz ro'yxat qoladi — bu to'liq ishlaydigan holat
      },
      { timeout: 8000, maximumAge: 300_000 },
    );
  }, [load]);

  const pick = (next: ChosenStore): void => {
    setStore(next);
    onClose?.();
  };

  const list = (
    <>
      {loading ? (
        <div className="flex justify-center py-10">
          <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : stores.length === 0 ? (
        <div className="flex flex-col gap-3 py-8 text-center">
          <p className="text-small text-muted-foreground">
            {size
              ? `Hech bir do‘konda ${size} o‘lchamidagi kiyim topilmadi.`
              : 'Hozircha AI kiyintira oladigan do‘kon yo‘q.'}
          </p>
          {size ? (
            <Button variant="ghost" onClick={() => controller.setOnlyMySize(false)}>
              Barcha o‘lchamlarni ko‘rsat
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {stores.map((item) => {
            const selected = item.id === store?.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => pick({ id: item.id, name: item.name })}
                  className={[
                    'flex w-full items-center gap-3 rounded-md border p-3 text-start transition-colors',
                    selected
                      ? 'border-borderAccent bg-primarySoft'
                      : 'border-border bg-surface hover:border-borderStrong',
                  ].join(' ')}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface2 text-brand">
                    {item.logo ? (
                      <img src={item.logo} alt="" className="size-full object-cover" />
                    ) : (
                      <Icon name="shop" size={18} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-bodyMed">{item.name}</span>
                    <span className="block text-tiny text-muted-foreground">
                      {item.garmentCount} ta kiyim
                      {item.distanceM === null ? '' : ` · ${(item.distanceM / 1000).toFixed(1)} km`}
                    </span>
                  </span>

                  {selected ? <Icon name="authentic" size={18} className="text-success" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className="mt-3 text-small text-danger">{error}</p> : null}
    </>
  );

  if (asPanel) {
    return (
      /*
       * ⚠️ RADIX `Sheet` EMAS, ODDIY QATLAM. Sheet fokusni qamab oladi
       * va sahifaning qolgan qismini `aria-hidden` qiladi — bu yerda
       * esa panel ortidagi avatar KO'RINIB TURISHI kerak: foydalanuvchi
       * do'konni almashtirayotganda o'zining hozirgi komplektini
       * ko'radi.
       */
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <button
          type="button"
          aria-label="Yopish"
          onClick={onClose}
          className="absolute inset-0 bg-black/60"
        />

        <div className="relative max-h-[70vh] w-full overflow-y-auto rounded-t-card border border-borderStrong bg-panel p-5 sm:max-w-lg sm:rounded-card">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-h3">Do‘konni almashtirish</h3>
              <p className="mt-1 text-tiny text-muted-foreground">
                {size
                  ? `Faqat ${size} o‘lchami omborda bor do‘konlar`
                  : 'Kiyimlar va buyurtma tanlangan do‘kondan bo‘ladi'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Yopish"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {list}
        </div>
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8">
      <div>
        <p className="eyebrow">3-qadam</p>
        <h2 className="mt-2 text-h2">Qaysi do‘kondan kiyinasiz?</h2>
        <p className="mt-2 text-small text-muted-foreground">
          Kiyimlar va buyurtma shu do‘kondan bo‘ladi. Keyinroq almashtirsa bo‘ladi.
        </p>
      </div>

      {list}
    </Card>
  );
}
