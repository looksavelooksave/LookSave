import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { IconBadge, type Tone } from './IconBadge';

export type { Tone as StatTone };

/**
 * Raqamli plitka — ikonka, yorliq, katta qiymat va izoh.
 *
 * ⚠️ `chart` MAJBURIY EMAS VA ATAYLAB: kunlik qator faqat buyurtmalar
 * uchun mavjud (`Analytics['daily']`). Ko'rish va kiyib ko'rish bo'yicha
 * server faqat YIG'INDI beradi, ya'ni ularga sparkline chizish uchun
 * ma'lumot to'qib chiqarish kerak bo'lardi.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'violet',
  alert = false,
  chart,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  /** Qiymat e'tibor talab qiladi (javobsiz buyurtma, tugagan zaxira). */
  alert?: boolean;
  /** Yorliq ostidagi mayda grafik. */
  chart?: ReactNode;
}): JSX.Element {
  return (
    <div className="metric-card flex min-h-[118px] items-start gap-3 p-5">
      <IconBadge icon={Icon} tone={tone} />

      <div className="relative z-10 min-w-0 flex-1">
        <p className="label">{label}</p>
        {/*
          ⚠️ `truncate` EMAS, `break-words`. Plitkada pul summasi ham
          turadi («12 400 000 so'm») va u uchta ustunli katakka sig'maydi
          — kesilsa raqamning oxiri, ya'ni eng muhim qismi yo'qoladi.
          Ikkinchi qatorga o'tgani yaxshiroq.
        */}
        <p
          className={`mt-2 break-words text-3xl font-bold leading-none tabular-nums ${
            alert ? 'text-warning' : 'text-foreground'
          }`}
        >
          {value}
        </p>
        {hint ? <p className="mt-2 text-sm text-dim">{hint}</p> : null}
        {chart ? <div className="mt-2">{chart}</div> : null}
      </div>
    </div>
  );
}
