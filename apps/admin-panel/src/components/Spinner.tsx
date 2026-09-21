import { Button } from '@/components/ui/button';
import { Inbox } from 'lucide-react';
export function Spinner({ label = 'Yuklanmoqda' }: { label?: string }): JSX.Element {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-dim">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-borderStrong border-t-primary"
      />
      {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }): JSX.Element {
  return (
    <div className="empty-premium card flex min-h-[300px] flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="mb-2 flex h-20 w-20 items-center justify-center rounded-3xl border border-brand/20 bg-primary/10 text-brand shadow-[0_16px_40px_rgba(124,58,237,.16)]">
        <Inbox className="h-9 w-9" strokeWidth={1.6} />
      </span>
      <p className="text-xl font-bold text-foreground">{title}</p>
      {hint ? <p className="max-w-md text-sm leading-6 text-dim">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry ? (
        <Button variant="outline" type="button" onClick={onRetry}>
          Qayta urinish
        </Button>
      ) : null}
    </div>
  );
}
