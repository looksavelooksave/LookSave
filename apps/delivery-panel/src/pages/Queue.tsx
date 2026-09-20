import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ApiClientError } from '../api/client';
import {
  acceptDelivery,
  advanceDelivery,
  assignCourier,
  listDeliveries,
  type Delivery,
  type DeliveryFilter,
  type DeliveryStatus,
} from '../api/deliveries';
import { EmptyState, Spinner } from '../components/Spinner';
import { useAuth } from '../hooks/useAuth';
import { useTaskAlerts } from '../hooks/useTaskAlerts';
import { money, phone as fmtPhone, timeAgo } from '../lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Yetkazib berish navbati — dostavka firmasi paneli.
 *
 * Operatorning bir buyurtma uchun qadamlari:
 *   1. Qabul qilish (boshqa operator ko'rsa ham olmaydi)
 *   2. Kuryer/taksi ism-telefonini yozish
 *   3. «Oldi» → «Yetkazildi» (buyurtma yopiladi)
 * Uddalay olmasa — sabab bilan «Uddalay olmadi».
 *
 * ⚠️ NAVBAT O'ZI YANGILANADI (5 soniyada). Yangi buyurtma kelsa —
 * sarlavhadagi son va (yoqilgan bo'lsa) ovoz + bildirishnoma xabar beradi.
 */

const TABS: Array<{ value: DeliveryFilter; label: string }> = [
  { value: 'active', label: 'Navbat' },
  { value: 'done', label: 'Tarix' },
];

const STATUS: Record<DeliveryStatus, { text: string; cls: string }> = {
  pending: { text: 'Yangi', cls: 'bg-warning/15 text-warning' },
  accepted: { text: 'Qabul qilindi', cls: 'bg-primary/15 text-brand' },
  assigned: { text: 'Kuryer biriktirildi', cls: 'bg-primary/15 text-brand' },
  picked_up: { text: 'Yo`lda', cls: 'bg-primary/15 text-brand' },
  delivered: { text: 'Yetkazildi', cls: 'bg-success/15 text-success' },
  failed: { text: 'Uddalanmadi', cls: 'bg-danger/15 text-danger' },
};

function errorText(err: unknown): string {
  return err instanceof ApiClientError ? err.message : 'Xatolik yuz berdi';
}

function addressText(order: Delivery['order']): string {
  return order.address?.text ?? 'Manzil ko`rsatilmagan';
}

export function QueuePage(): JSX.Element {
  const { user, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<DeliveryFilter>('active');
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 6000);
    return () => window.clearTimeout(id);
  }, [flash]);

  const list = useQuery({
    queryKey: ['deliveries', tab],
    queryFn: () => listDeliveries(tab),
    refetchInterval: tab === 'active' ? 5000 : false,
  });

  /*
   * ⚠️ SIGNAL UCHUN ALOHIDA, DOIMIY SO'ROV. Tab «Tarix»da bo'lsa ham yangi
   * buyurtma sezilishi kerak — bu so'rov fon oynada ham 5 soniyada yangilanadi.
   */
  const activeWatch = useQuery({
    queryKey: ['deliveries', 'watch'],
    queryFn: () => listDeliveries('active'),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
  const pending = useMemo(
    () => (activeWatch.data ?? []).filter((d) => d.status === 'pending'),
    [activeWatch.data],
  );
  const alerts = useTaskAlerts(pending);

  useEffect(() => {
    document.title = pending.length > 0 ? `(${pending.length}) Dostavka` : 'Dostavka';
  }, [pending.length]);

  const items = useMemo(() => list.data ?? [], [list.data]);
  const selectedId = params.get('d');
  const selected = items.find((d) => d.id === selectedId) ?? null;
  const selectedMissing = Boolean(selectedId) && list.isSuccess && !selected;

  function select(id: string | null): void {
    setParams(id ? { d: id } : {}, { replace: true });
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold uppercase tracking-wordmark text-brand">
            LookSave
          </span>
          <span className="text-sm text-dim">Dostavka</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={alerts.toggle}
            aria-pressed={alerts.enabled}
            title={alerts.enabled ? 'Ovozli xabar yoniq' : 'Ovozli xabarni yoqish (bir marta bosing)'}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              alerts.enabled
                ? 'border-brand/40 bg-primary/10 text-brand'
                : 'border-border text-dim hover:text-foreground'
            }`}
          >
            <span aria-hidden>{alerts.enabled ? '🔔' : '🔕'}</span>
            {alerts.enabled ? 'Xabar yoniq' : 'Xabarni yoqish'}
          </button>
          <span className="text-dim">{user?.fullName}</span>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Chiqish
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="border-b md:border-b-0 md:border-r">
          <nav className="flex gap-1 border-b px-3 py-2" aria-label="Holat">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                aria-pressed={tab === item.value}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  tab === item.value
                    ? 'bg-surface2 font-semibold text-foreground'
                    : 'text-dim hover:text-foreground'
                }`}
              >
                {item.label}
                {item.value === 'active' && pending.length > 0 ? (
                  <span className="ml-2 rounded-full bg-warning/15 px-1.5 text-xs font-semibold text-warning">
                    {pending.length}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          {list.isLoading ? <Spinner /> : null}
          {list.isError ? (
            <p className="m-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {errorText(list.error)}
            </p>
          ) : null}
          {list.isSuccess && items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={tab === 'active' ? 'Navbat bo`sh' : 'Tarix bo`sh'}
                hint={
                  tab === 'active'
                    ? 'Do`kon buyurtmani tayyor qilsa shu yerda paydo bo`ladi.'
                    : undefined
                }
              />
            </div>
          ) : null}

          <ul className="divide-y">
            {items.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => select(d.id)}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-surface2 ${
                    selected?.id === d.id ? 'bg-surface2' : ''
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{d.order.number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[d.status].cls}`}>
                      {STATUS[d.status].text}
                    </span>
                  </span>
                  <span className="truncate text-xs text-dim">{d.order.storeName}</span>
                  <span className="truncate text-xs text-dim">{addressText(d.order)}</span>
                  <span className="text-[11px] text-dim">{timeAgo(d.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="min-w-0 space-y-4 p-6">
          {flash ? (
            <p role="status" className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              {flash}
            </p>
          ) : null}
          {selected ? (
            <DeliveryDetail
              key={selected.id}
              delivery={selected}
              onFlash={setFlash}
            />
          ) : selectedMissing ? (
            <EmptyState title="Bu buyurtma bu ro`yxatda yo`q" hint="U allaqachon yopilgan bo`lishi mumkin." />
          ) : (
            <EmptyState title="Buyurtmani tanlang" hint="Chapdagi ro`yxatdan birini oching." />
          )}
        </main>
      </div>
    </div>
  );
}

function DeliveryDetail({
  delivery,
  onFlash,
}: {
  delivery: Delivery;
  onFlash: (msg: string) => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [courierName, setCourierName] = useState(delivery.courierName ?? '');
  const [courierPhone, setCourierPhone] = useState(delivery.courierPhone ?? '');
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState('');

  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['deliveries'] });
  const onError = (err: unknown): void => {
    setNotice(errorText(err));
    void refresh();
  };

  const accept = useMutation({
    mutationFn: () => acceptDelivery(delivery.id),
    onSuccess: () => {
      setNotice(null);
      void refresh();
    },
    onError,
  });
  const assign = useMutation({
    mutationFn: () => assignCourier(delivery.id, courierName.trim(), courierPhone.trim()),
    onSuccess: () => {
      setNotice(null);
      void refresh();
    },
    onError,
  });
  const advance = useMutation({
    mutationFn: (to: 'picked_up' | 'delivered' | 'failed') =>
      advanceDelivery(delivery.id, to, to === 'failed' ? reason.trim() : undefined),
    onSuccess: async (_data, to) => {
      await refresh();
      if (to === 'delivered') onFlash(`${delivery.order.number} yetkazildi`);
      if (to === 'failed') onFlash(`${delivery.order.number} yopildi`);
    },
    onError,
  });

  const o = delivery.order;
  const hasCoords = o.address?.lat !== undefined && o.address?.lng !== undefined;
  const mapUrl = hasCoords
    ? `https://yandex.uz/maps/?pt=${o.address!.lng},${o.address!.lat}&z=17&l=map`
    : null;
  const busy = accept.isPending || assign.isPending || advance.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{o.number}</h1>
          <p className="mt-1 text-sm text-dim">
            {timeAgo(delivery.createdAt)} · {o.storeName}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[delivery.status].cls}`}>
          {STATUS[delivery.status].text}
        </span>
      </div>

      {notice ? (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Manzil + mijoz */}
        <section className="card space-y-3 p-5">
          <h2 className="label">Yetkazish manzili</h2>
          <p className="text-sm text-foreground">{addressText(o)}</p>
          {o.address?.landmark ? (
            <p className="text-xs text-dim">Mo`ljal: {o.address.landmark}</p>
          ) : null}
          {mapUrl ? (
            <a href={mapUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand hover:underline">
              Xaritada ochish
            </a>
          ) : null}
          <div className="border-t pt-3 text-sm">
            <p className="font-medium text-foreground">{o.contactName}</p>
            <a href={`tel:${o.contactPhone}`} className="text-brand hover:underline">
              {fmtPhone(o.contactPhone)}
            </a>
          </div>
          {o.note ? <p className="text-xs text-dim">Izoh: {o.note}</p> : null}
        </section>

        {/* Do'kon (olib ketish) */}
        <section className="card space-y-3 p-5">
          <h2 className="label">Do`kondan olish</h2>
          <p className="text-sm font-medium text-foreground">{o.storeName}</p>
          {o.storePhone ? (
            <a href={`tel:${o.storePhone}`} className="text-sm text-brand hover:underline">
              {fmtPhone(o.storePhone)}
            </a>
          ) : null}
          {o.storeLocation.lat !== null && o.storeLocation.lng !== null ? (
            <a
              href={`https://yandex.uz/maps/?pt=${o.storeLocation.lng},${o.storeLocation.lat}&z=17&l=map`}
              target="_blank"
              rel="noreferrer"
              className="block text-sm font-medium text-brand hover:underline"
            >
              Do`kon xaritada
            </a>
          ) : null}
          <div className="border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-dim">To`lov</span>
              <span className="text-foreground">
                {o.paymentMethod === 'cash' ? 'Naqd' : o.paymentMethod}
                {o.paymentStatus === 'paid' ? ' · to`langan' : ' · to`lanmagan'}
              </span>
            </div>
            <div className="mt-1 flex justify-between font-semibold">
              <span className="text-dim">Jami</span>
              <span className="text-foreground">{money(o.total, o.currency)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Buyurtma tarkibi */}
      <section className="card space-y-3 p-5">
        <h2 className="label">Buyurtma ({o.items.length})</h2>
        <ul className="divide-y">
          {o.items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 py-2">
              {item.image ? (
                <img src={item.image} alt="" className="h-12 w-12 shrink-0 rounded bg-surface2 object-cover" />
              ) : (
                <span className="h-12 w-12 shrink-0 rounded bg-surface2" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{item.title ?? 'Mahsulot'}</span>
                <span className="block text-xs text-dim">
                  {item.size} · {item.qty} dona{item.brand ? ` · ${item.brand}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Kuryer biriktirish — qabul qilingandan keyin */}
      {delivery.status !== 'pending' && delivery.status !== 'delivered' && delivery.status !== 'failed' ? (
        <section className="card space-y-3 p-5">
          <h2 className="label">Kuryer / taksi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Ism" value={courierName} onChange={(e) => setCourierName(e.target.value)} />
            <Input placeholder="Telefon" value={courierPhone} onChange={(e) => setCourierPhone(e.target.value)} />
          </div>
          <Button
            variant="outline"
            disabled={courierName.trim().length < 2 || courierPhone.trim().length < 5 || busy}
            onClick={() => assign.mutate()}
          >
            {delivery.courierName ? 'Kuryerni yangilash' : 'Kuryerni biriktirish'}
          </Button>
        </section>
      ) : null}

      {/* Amallar */}
      <div className="flex flex-wrap items-center gap-3">
        {delivery.status === 'pending' ? (
          <Button disabled={busy} onClick={() => accept.mutate()}>
            {accept.isPending ? 'Olinmoqda…' : 'Qabul qilaman'}
          </Button>
        ) : null}

        {delivery.status === 'assigned' ? (
          <Button disabled={busy} onClick={() => advance.mutate('picked_up')}>
            Kuryer oldi
          </Button>
        ) : null}

        {delivery.status === 'picked_up' ? (
          <Button disabled={busy} onClick={() => advance.mutate('delivered')}>
            Yetkazildi
          </Button>
        ) : null}

        {delivery.status !== 'delivered' && delivery.status !== 'failed' ? (
          <Button variant="ghost" onClick={() => setFailing((v) => !v)}>
            Uddalay olmayman
          </Button>
        ) : null}

        {delivery.status === 'delivered' ? (
          <p className="text-sm text-success">
            Yetkazildi{delivery.deliveredAt ? ` · ${timeAgo(delivery.deliveredAt)}` : ''}
          </p>
        ) : null}
        {delivery.status === 'failed' ? (
          <p className="text-sm text-danger">Uddalanmadi: {delivery.failReason}</p>
        ) : null}
      </div>

      {failing && delivery.status !== 'delivered' && delivery.status !== 'failed' ? (
        <section className="card space-y-3 p-5">
          <label className="block">
            <span className="label">Sabab</span>
            <Textarea
              className="mt-2"
              rows={3}
              maxLength={300}
              value={reason}
              placeholder="Masalan: mijoz javob bermadi"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button variant="destructive" disabled={reason.trim().length < 3 || busy} onClick={() => advance.mutate('failed')}>
            Yopish
          </Button>
        </section>
      ) : null}
    </div>
  );
}
