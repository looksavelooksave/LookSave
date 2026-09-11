import { useState } from 'react';

import { Button, Card, Field } from '@looksave/ui-web';

import type { TryonController } from './useTryon';

/**
 * O'lchovlar — oqimning ikkinchi qadami.
 *
 * ⚠️ FAQAT YETISHMAGANDA CHIQADI. Foydalanuvchi o'lchovlarini bir marta
 * kiritgan bo'lsa (profil sahifasida yoki ilovada) bu qadam umuman
 * ko'rsatilmaydi — server `needs.sizes` bilan aytadi.
 *
 * ⚠️ TO'RTTASI SHART, BESHINCHISI IXTIYORIY. Bo'y va vazn gavda shaklini
 * beradi; KO'KRAK VA BEL esa kiyim o'lchamini (`recommendSize`) — ularsiz
 * «menga mos o'lchamdagi kiyimlar» filtri jimgina o'chib qoladi va
 * ro'yxat oddiy katalogga aylanadi. Son (`hips`) faqat aniqlik uchun.
 *
 * ⚠️ CHEGARALAR `packages/validation` DAGI `measurementsSchema` BILAN
 * BIR XIL. Bu yerda «yumshatib» qo'yilsa server 422 qaytaradi va xato
 * maydon ostida emas, tepada chiqadi.
 */

interface SizeField {
  key: 'height' | 'weight' | 'chest' | 'waist' | 'hips';
  label: string;
  hint: string;
  unit: string;
  min: number;
  max: number;
  required: boolean;
}

const FIELDS: SizeField[] = [
  {
    key: 'height',
    label: "Bo'y",
    hint: '120–220',
    unit: 'sm',
    min: 120,
    max: 220,
    required: true,
  },
  {
    key: 'weight',
    label: 'Vazn',
    hint: '30–200',
    unit: 'kg',
    min: 30,
    max: 200,
    required: true,
  },
  {
    key: 'chest',
    label: "Ko'krak · eng keng joyi",
    hint: '50–180',
    unit: 'sm',
    min: 50,
    max: 180,
    required: true,
  },
  {
    key: 'waist',
    label: 'Bel · eng ingichka joyi',
    hint: '40–180',
    unit: 'sm',
    min: 40,
    max: 180,
    required: true,
  },
  {
    key: 'hips',
    label: 'Son · eng keng joyi',
    hint: '50–180',
    unit: 'sm',
    min: 50,
    max: 180,
    required: false,
  },
];

export function SizesStep({ controller }: { controller: TryonController }): JSX.Element {
  const { act, refresh, state } = controller;

  const saved = state?.profile?.measurements ?? {};

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of FIELDS) {
      const value = saved[field.key];
      if (typeof value === 'number') initial[field.key] = String(value);
    }
    return initial;
  });

  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const submit = async (): Promise<void> => {
    const input: Record<string, number> = {};

    for (const field of FIELDS) {
      const raw = (values[field.key] ?? '').trim();

      if (raw === '') {
        if (field.required) {
          setError(`${field.label} kiritilishi shart`);
          return;
        }
        continue;
      }

      const value = Number(raw.replace(',', '.'));
      if (!Number.isFinite(value) || value < field.min || value > field.max) {
        setError(`${field.label}: ${field.hint} oralig‘ida bo‘lishi kerak`);
        return;
      }

      input[field.key] = value;
    }

    setWorking(true);
    setError(null);

    try {
      const result = await act({ op: 'measurements', values: input });
      if (result.error) {
        setError(result.error);
        return;
      }

      /*
       * ⚠️ AVATAR SHU YERDA BOSHLANADI — surat bosqichida emas.
       *
       * Server avatar uchun yuz suratini HAM, bo'y bilan vaznni HAM
       * talab qiladi. Sehrgar tartibida surat oldin keladi, ya'ni o'sha
       * paytda o'lchamlar hali yo'q va so'rov 422 berardi. Endi ikkala
       * shart bajarilgan yagona nuqta shu yer.
       *
       * Yuz surati yo'q bo'lsa tegilmaydi: foydalanuvchi o'lchamlarni
       * profilidan oldinroq kiritgan bo'lishi mumkin.
       */
      if (state?.profile?.faceTextureUrl) {
        const started = await act({ op: 'avatar' });
        if (started.error) {
          setError(started.error);
          return;
        }
      }

      await refresh();
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8">
      <div>
        <p className="eyebrow">2-qadam</p>
        <h2 className="mt-2 text-h2">O‘lchovlaringiz</h2>
        <p className="mt-2 text-small text-muted-foreground">
          Ko‘krak va bel bo‘yicha sizga mos o‘lchamdagi kiyimlar tanlanadi — ro‘yxatda faqat omborda
          bor razmerlar ko‘rinadi.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Field
            key={field.key}
            label={`${field.label}${field.required ? '' : ' · ixtiyoriy'}`}
            placeholder={`${field.hint} ${field.unit}`}
            inputMode="decimal"
            value={values[field.key] ?? ''}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.key]: event.target.value }))
            }
          />
        ))}
      </div>

      {error ? <p className="text-small text-danger">{error}</p> : null}

      <Button onClick={() => void submit()} disabled={working}>
        {working ? 'Saqlanmoqda…' : 'Saqlash va davom etish'}
      </Button>
    </Card>
  );
}
