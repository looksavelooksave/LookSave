import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  storeName: string;
  current: string | null;
  busy: boolean;
  /** Server xatosi (masalan, username band) — modal ichida ko'rsatiladi */
  error: string | null;
  onCancel: () => void;
  onSubmit: (username: string) => void;
}

/**
 * Do'kon egasiga username berish. Sotuvchi u bilan store panelga kiradi va
 * xaridorlar do'konni @username bilan ko'radi; keyin o'zi o'zgartira oladi.
 *
 * ⚠️ Xato MODAL ICHIDA qoladi va modal yopilmaydi: band username'da admin
 * yozganini yo'qotmasdan boshqasini sinab ko'rishi kerak.
 */
export function UsernameModal({
  storeName,
  current,
  busy,
  error,
  onCancel,
  onSubmit,
}: Props): JSX.Element {
  const [value, setValue] = useState(current ?? '');

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const normalized = value.trim().replace(/^@/, '').toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-title"
    >
      <form
        className="card w-full max-w-md p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(normalized);
        }}
      >
        <h2 id="username-title" className="text-lg font-semibold text-foreground">
          Username
        </h2>
        <p className="mt-1 text-sm text-dim">
          {storeName} egasi panelga shu nom bilan kiradi. Xaridorlar do'konni @username bilan
          ko'radi.
        </p>

        <label className="mt-4 block">
          <span className="label">Username</span>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-dim">
              @
            </span>
            <Input
              className="pl-7"
              value={value}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={31}
              placeholder="chilonzor_moda"
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <span className="mt-1.5 block text-xs text-dim">
            3–30 belgi: lotin harfi bilan boshlanadi, faqat harf, raqam, _ va .
          </span>
        </label>

        {error ? (
          <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>
            Bekor
          </Button>
          <Button
            type="submit"
            disabled={busy || normalized.length < 3 || normalized === (current ?? '')}
          >
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
        </div>
      </form>
    </div>
  );
}
