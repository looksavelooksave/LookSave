import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type AdminCategory,
  type CategoryInput,
} from '../api/admin';
import { ApiClientError } from '../api/client';
import { EmptyState, ErrorState, Spinner } from '../components/Spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Kiyim tanada qaysi joyga tushadi (server: categories.slot). */
const SLOTS = ['head', 'face', 'neck', 'top', 'outer', 'bottom', 'feet', 'wrist', 'bag'] as const;
const GENDERS: Array<{ value: string; label: string }> = [
  { value: 'unisex', label: 'Uniseks' },
  { value: 'male', label: 'Erkak' },
  { value: 'female', label: 'Ayol' },
];
const SIZE_TYPES: Array<{ value: string; label: string }> = [
  { value: '', label: "O'lchamsiz" },
  { value: 'clothing', label: 'Kiyim (S–XXL)' },
  { value: 'shoes', label: 'Oyoq (EU)' },
  { value: 'onesize', label: 'Yagona' },
];
const LOCALES: Array<{ key: string; label: string }> = [
  { key: 'uz', label: "O'zbekcha" },
  { key: 'ru', label: 'Русский' },
  { key: 'en', label: 'English' },
  { key: 'ar', label: 'العربية' },
];

const EMPTY: CategoryInput = {
  name: {},
  slug: '',
  icon: '',
  slot: '',
  gender: 'unisex',
  sizeType: '',
  parentId: '',
  sortOrder: 0,
  isActive: true,
};

const selectClass =
  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground';

function toInput(category: AdminCategory): CategoryInput {
  return {
    name: category.name,
    slug: category.slug,
    icon: category.icon ?? '',
    slot: category.slot ?? '',
    gender: category.gender,
    sizeType: category.sizeType ?? '',
    parentId: category.parentId ?? '',
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  };
}

/** Ko'p tildan ko'rsatish uchun bittasini oladi (uz → en → bor tilidan). */
function pickName(name: Record<string, string>): string {
  return name['uz'] ?? name['en'] ?? Object.values(name)[0] ?? '(nomsiz)';
}

function CategoryForm({
  initial,
  roots,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  initial: CategoryInput;
  roots: AdminCategory[];
  busy: boolean;
  error: string | null;
  onSubmit: (input: CategoryInput) => void;
  onCancel: () => void;
}): JSX.Element {
  const [form, setForm] = useState<CategoryInput>(initial);

  const set = <K extends keyof CategoryInput>(key: K, value: CategoryInput[K]): void =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (): void => {
    // Bo'sh matnlarni null/undefined ga aylantiramiz — bazada bo'sh satr qolmasin
    const name: Record<string, string> = {};
    for (const [key, value] of Object.entries(form.name)) {
      if (value.trim()) name[key] = value.trim();
    }
    onSubmit({
      ...form,
      name,
      slug: form.slug?.trim() || undefined,
      icon: form.icon?.trim() || null,
      slot: form.slot || null,
      sizeType: form.sizeType || null,
      parentId: form.parentId || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
        <h2 className="text-lg font-semibold text-foreground">
          {initial.slug ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}
        </h2>

        <div className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            {LOCALES.map((locale) => (
              <label key={locale.key} className="block">
                <span className="label">Nomi · {locale.label}</span>
                <Input
                  className="mt-1"
                  value={form.name[locale.key] ?? ''}
                  onChange={(event) =>
                    set('name', { ...form.name, [locale.key]: event.target.value })
                  }
                  placeholder={locale.key === 'uz' ? 'Masalan: Futbolka' : ''}
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="label">Ota-kategoriya</span>
            <select
              className={`mt-1 ${selectClass}`}
              value={form.parentId ?? ''}
              onChange={(event) => set('parentId', event.target.value)}
            >
              <option value="">— Ildiz (yuqori daraja) —</option>
              {roots
                .filter((root) => root.slug !== initial.slug)
                .map((root) => (
                  <option key={root.id} value={root.id}>
                    {pickName(root.name)}
                  </option>
                ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Slot (kiyintirish joyi)</span>
              <select
                className={`mt-1 ${selectClass}`}
                value={form.slot ?? ''}
                onChange={(event) => set('slot', event.target.value)}
              >
                <option value="">— Yo'q —</option>
                {SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">O'lcham tizimi</span>
              <select
                className={`mt-1 ${selectClass}`}
                value={form.sizeType ?? ''}
                onChange={(event) => set('sizeType', event.target.value)}
              >
                {SIZE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">Jins</span>
              <select
                className={`mt-1 ${selectClass}`}
                value={form.gender}
                onChange={(event) => set('gender', event.target.value)}
              >
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">Tartib raqami</span>
              <Input
                className="mt-1"
                type="number"
                value={String(form.sortOrder)}
                onChange={(event) => set('sortOrder', Number(event.target.value) || 0)}
              />
            </label>
          </div>

          <label className="block">
            <span className="label">Slug (ixtiyoriy — nomdan yasaladi)</span>
            <Input
              className="mt-1"
              value={form.slug ?? ''}
              onChange={(event) => set('slug', event.target.value)}
              placeholder="tshirt"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => set('isActive', event.target.checked)}
            />
            <span className="text-sm text-foreground">Faol (ilovada ko'rinadi)</span>
          </label>
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Bekor
          </Button>
          <Button onClick={submit} disabled={busy || Object.keys(form.name).length === 0}>
            {busy ? 'Saqlanmoqda…' : 'Saqlash'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CategoriesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: getCategories });

  const [editing, setEditing] = useState<{ id?: string; input: CategoryInput } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => setFormError(null), [editing]);

  const save = useMutation({
    mutationFn: (data: { id?: string; input: CategoryInput }) =>
      data.id ? updateCategory(data.id, data.input) : createCategory(data.input),
    onSuccess: () => {
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (err) =>
      setFormError(err instanceof ApiClientError ? err.message : 'Saqlab bo`lmadi'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
    onError: (err) =>
      setListError(err instanceof ApiClientError ? err.message : "O'chirib bo`lmadi"),
  });

  if (categories.isLoading) return <Spinner />;
  if (categories.isError)
    return <ErrorState message="Kategoriyalarni yuklab bo`lmadi" onRetry={() => void categories.refetch()} />;

  const all = categories.data ?? [];
  const roots = all.filter((c) => c.parentId === null);
  const childrenOf = (id: string): AdminCategory[] => all.filter((c) => c.parentId === id);

  const Row = ({ category, child }: { category: AdminCategory; child?: boolean }): JSX.Element => (
    <div
      className={`flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 ${
        child ? 'ml-6' : ''
      } ${category.isActive ? '' : 'opacity-50'}`}
    >
      {child ? <ChevronRight className="h-4 w-4 shrink-0 text-dim" /> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {pickName(category.name)}{' '}
          <span className="text-xs font-normal text-dim">@{category.slug}</span>
        </p>
        <p className="text-xs text-dim">
          {category.slot ? `slot: ${category.slot} · ` : ''}
          {category.sizeType ?? 'o‘lchamsiz'} · {category.productCount} mahsulot
          {category.isActive ? '' : ' · nofaol'}
        </p>
      </div>
      {!category.isActive ? <Badge variant="outline">nofaol</Badge> : null}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Tahrirlash"
        onClick={() => setEditing({ id: category.id, input: toInput(category) })}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="O'chirish"
        disabled={remove.isPending}
        onClick={() => {
          setListError(null);
          remove.mutate(category.id);
        }}
      >
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Kategoriyalar</h1>
          <p className="mt-1 text-sm text-dim">
            Ilovadagi kiyim turkumlari. Qo'shing, tahrirlang yoki nofaol qiling.
          </p>
        </div>
        <Button onClick={() => setEditing({ input: { ...EMPTY, name: {} } })}>
          <Plus className="mr-1 h-4 w-4" /> Yangi kategoriya
        </Button>
      </div>

      {listError ? (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {listError}
        </p>
      ) : null}

      {roots.length === 0 ? (
        <EmptyState title="Kategoriya yo'q" hint="Birinchi kategoriyani qo'shing." />
      ) : (
        <div className="space-y-4">
          {roots.map((root) => (
            <div key={root.id} className="space-y-2">
              <Row category={root} />
              {childrenOf(root.id).map((child) => (
                <Row key={child.id} category={child} child />
              ))}
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <CategoryForm
          initial={editing.input}
          roots={roots}
          busy={save.isPending}
          error={formError}
          onCancel={() => setEditing(null)}
          onSubmit={(input) => save.mutate({ id: editing.id, input })}
        />
      ) : null}
    </div>
  );
}
