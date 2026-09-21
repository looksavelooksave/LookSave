import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, PackageCheck, ShoppingCart, Store, TriangleAlert, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getOverview } from '../api/admin';
import { ErrorState, Spinner } from '../components/Spinner';

function Stat({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Store;
}): JSX.Element {
  return (
    <div className="card group p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/20 bg-primary/10 text-brand transition group-hover:scale-105">
          <Icon className="h-6 w-6" />
        </span>
      </div>
      {hint ? <p className="mt-3 text-xs text-dim">{hint}</p> : null}
    </div>
  );
}

export function OverviewPage(): JSX.Element {
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: getOverview });

  if (overview.isLoading) return <Spinner />;
  if (overview.isError || !overview.data) {
    return (
      <ErrorState message="Ma'lumotni yuklab bo'lmadi" onRetry={() => void overview.refetch()} />
    );
  }

  const data = overview.data;

  const attention: Array<{ text: string; to: string }> = [
    ...(data.stores.pending > 0
      ? [{ text: `${data.stores.pending} ta do'kon tasdiqlanmagan`, to: '/stores' }]
      : []),
    ...(data.moderation.productsPending > 0
      ? [{ text: `${data.moderation.productsPending} ta mahsulot moderatsiyada`, to: '/products' }]
      : []),
    ...(data.attention.globalBlocks > 0
      ? [{ text: `${data.attention.globalBlocks} ta raqam global blokda`, to: '/moderation' }]
      : []),
    ...(data.attention.restrictedUsers > 0
      ? [
          {
            text: `${data.attention.restrictedUsers} ta foydalanuvchi cheklangan`,
            to: '/moderation',
          },
        ]
      : []),
    ...(data.attention.silentStores > 0
      ? [
          {
            text: `${data.attention.silentStores} ta do'kon 24 soatdan beri javob bermayapti`,
            to: '/stores',
          },
        ]
      : []),
  ];

  return (
    <div className="page-shell space-y-7">
      <div>
        <h1 className="page-title">Umumiy holat</h1>
        <p className="page-copy">Platformadagi asosiy ko‘rsatkichlar va tezkor nazorat markazi.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Store}
          label="Do'konlar"
          value={String(data.stores.active)}
          hint={
            data.stores.pending > 0 ? `+${data.stores.pending} kutilmoqda` : 'hammasi ko\u2018rildi'
          }
        />
        <Stat
          icon={Users}
          label="Foydalanuvchilar"
          value={String(data.users.total)}
          hint={`+${data.users.newThisWeek} bu hafta`}
        />
        <Stat icon={ShoppingCart} label="Buyurtmalar" value={String(data.ordersThisWeek)} hint="bu hafta" />
        <Stat
          icon={PackageCheck}
          label="Moderatsiya"
          value={String(data.moderation.productsPending)}
          hint="tekshiruvdagi mahsulotlar"
        />
      </div>

      <section className="card overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning"><TriangleAlert className="h-5 w-5" /></span>
          <div><h2 className="font-semibold text-foreground">Diqqat talab qiladi</h2><p className="text-xs text-dim">Muhim vazifalar va tekshiruvlar</p></div>
        </div>
        {attention.length === 0 ? (
          <p className="px-6 py-8 text-sm text-dim">
            Hozircha hammasi joyida. Yangi do'kon yoki mahsulot kelganda shu yerda ko'rinadi.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {attention.map((item) => (
              <li key={item.text}>
                <Link
                  to={item.to}
                  className="group flex items-center gap-3 px-6 py-4 text-sm text-foreground transition hover:bg-surface2"
                >
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  {item.text}
                  <ArrowUpRight className="ml-auto h-4 w-4 text-dim transition group-hover:text-brand" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
