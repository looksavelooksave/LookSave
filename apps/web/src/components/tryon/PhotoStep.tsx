import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Card, Icon } from '@looksave/ui-web';

import type { TryonController } from './useTryon';

/**
 * Yuz skaneri — oqimning birinchi qadami.
 *
 * ⚠️ NEGA YUZ, TO'LIQ BO'YLI SURAT EMAS. To'liq bo'yli surat uchun joy,
 * oyna va ko'pincha boshqa odamning yordami kerak — ko'p foydalanuvchi
 * shu yerda to'xtaydi. Selfi esa hammaga qulay: qolgan gavdani AI
 * o'lchovlardan yasaydi. To'liq surat yuklash yo'li ham qoldirilgan,
 * lekin ikkinchi darajada.
 *
 * ⚠️ ROZILIK KAMERA RUXSATIDAN ALOHIDA VA UNDAN OLDIN. Brauzer so'rovi
 * «kameraga kirishga ruxsatmi?» deb so'raydi — «suratni tashqi xizmatga
 * yuborishga rozimisiz?» deb emas. Ikkinchisiga texnik ruxsat javob
 * bermaydi.
 *
 * ⚠️ SURAT SSR SERVERIDAN O'TMAYDI. Brauzer imzolangan havolani BFF dan
 * oladi va faylni to'g'ridan-to'g'ri R2 ga `PUT` qiladi (09-integrations
 * §4.2). Aks holda har surat SSR jarayonining xotirasidan o'tardi.
 */

const CONSENT: Array<{ title: string; hint: string }> = [
  {
    title: 'Nima uchun kerak',
    hint: 'AI kiyimni aynan sizning yuzingiz va gavdangizga kiydiradi.',
  },
  {
    title: 'Qayerga boradi',
    hint: 'Surat tashqi AI xizmatiga yuboriladi va serverimizda saqlanadi.',
  },
  {
    title: 'Qanday o‘chiriladi',
    hint: 'Profil sahifasidan istalgan vaqtda o‘chirishingiz mumkin.',
  },
];

const TIPS = ['Tekis yorug‘lik', 'To‘g‘ridan-to‘g‘ri qarang', 'Yuzni ramka ichiga joylang'];

export function PhotoStep({ controller }: { controller: TryonController }): JSX.Element {
  const { act, refresh, state } = controller;

  const [consented, setConsented] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /*
   * ⚠️ OQIM ALBATTA TO'XTATILADI. Aks holda komponent yo'qolgandan keyin
   * ham kamera yonib turadi — brauzer yorlig'ida indikator qoladi va
   * foydalanuvchi buni kuzatuv deb tushunadi.
   */
  const stopCamera = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async (): Promise<void> => {
    setError(null);

    /*
     * ⚠️ `getUserMedia` FAQAT XAVFSIZ KONTEKSTDA ishlaydi (HTTPS yoki
     * localhost). Sayt HTTP orqali ochilsa `navigator.mediaDevices`
     * umuman mavjud bo'lmaydi — shuning uchun tekshiruv `try` dan
     * oldin va xabar aniq.
     */
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Bu brauzerda kamera ishlamaydi — surat yuklashdan foydalaning');
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1024 }, height: { ideal: 1024 } },
      });

      stream.current = media;
      setCameraOn(true);

      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
    } catch {
      setError('Kameraga ruxsat berilmadi — surat yuklashdan foydalanishingiz mumkin');
    }
  };

  /**
   * Faylni R2 ga yuklab, manzilini qaytaradi.
   *
   * ⚠️ IKKI QADAM, IKKALASI HAM ZARUR: imzo BFF dan (token faqat
   * serverda), yuklash esa to'g'ridan-to'g'ri R2 ga.
   */
  const upload = async (blob: Blob, purpose: 'face' | 'body'): Promise<string> => {
    const signed = await act({ op: 'presign', purpose, contentType: blob.type || 'image/jpeg' });
    const data = signed.data as
      { uploadUrl: string; publicUrl: string; headers: Record<string, string> } | undefined;

    if (!data) throw new Error(signed.error ?? 'Yuklash havolasi olinmadi');

    const put = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: data.headers,
      body: blob,
    });

    if (!put.ok) throw new Error(`Surat yuklanmadi (HTTP ${put.status})`);
    return data.publicUrl;
  };

  const capture = async (): Promise<void> => {
    const element = video.current;
    if (!element) return;

    setWorking(true);
    setError(null);

    try {
      /*
       * ⚠️ KVADRATGA QIRQILADI, cho'zilmaydi. Video oqimi qurilmaga
       * qarab 4:3 yoki 16:9 bo'ladi; to'g'ridan-to'g'ri chizilsa yuz
       * yon tomonlardan yassilanardi.
       */
      const side = Math.min(element.videoWidth, element.videoHeight);
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Kadr olinmadi');

      context.drawImage(
        element,
        (element.videoWidth - side) / 2,
        (element.videoHeight - side) / 2,
        side,
        side,
        0,
        0,
        side,
        side,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      );
      if (!blob) throw new Error('Kadr olinmadi');

      const url = await upload(blob, 'face');
      const saved = await act({ op: 'face', url });
      if (saved.error) throw new Error(saved.error);

      /*
       * ⚠️ AVATAR SHU YERDA BOSHLANADI, skanerda emas. Generatsiya
       * kredit sarflaydi va u faqat surat HAQIQATAN saqlangandan keyin
       * boshlanishi kerak.
       */
      await act({ op: 'avatar' });

      stopCamera();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Skanerlash bajarilmadi');
    } finally {
      setWorking(false);
    }
  };

  const pickFile = async (file: File): Promise<void> => {
    setWorking(true);
    setError(null);

    try {
      const url = await upload(file, 'body');
      const saved = await act({ op: 'bodyPhoto', url });
      if (saved.error) throw new Error(saved.error);

      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Surat yuklanmadi');
    } finally {
      setWorking(false);
    }
  };

  /*
   * Avatar yasalmoqda — skaner tugagan, natija esa hali yo'q. Bu holat
   * alohida ko'rsatiladi: aks holda foydalanuvchi «skanerni yana bosay»
   * deb o'ylab, ikkinchi kreditni sarflardi.
   */
  if (state?.avatar?.status === 'processing') {
    return (
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div>
          <p className="text-h3">Avataringiz tayyorlanmoqda</p>
          <p className="mt-1 text-small text-muted-foreground">
            Odatda 20–40 soniya. Sahifani yopmasangiz ham bo‘ladi — natija o‘zi paydo bo‘ladi.
          </p>
        </div>
      </Card>
    );
  }

  if (!consented) {
    return (
      <Card className="flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <p className="eyebrow">1-qadam</p>
          <h2 className="mt-2 text-h2">Yuz skaneri</h2>
          <p className="mt-2 text-small text-muted-foreground">
            Davom etishdan oldin surat bilan nima bo‘lishini o‘qing.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {CONSENT.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primarySoft text-brand">
                <Icon name="authentic" size={16} />
              </span>
              <span>
                <span className="block text-bodyMed">{item.title}</span>
                <span className="block text-tiny text-muted-foreground">{item.hint}</span>
              </span>
            </li>
          ))}
        </ul>

        <Button onClick={() => setConsented(true)}>Roziman, davom etamiz</Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8">
      <div>
        <p className="eyebrow">1-qadam</p>
        <h2 className="mt-2 text-h2">Yuzingizni skaner qiling</h2>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-card border border-border bg-[#050509]">
        {cameraOn ? (
          <>
            {/*
              ⚠️ `scale-x-[-1]` — OYNA AKSIDEK. Kameradan kelgan tasvir
              teskari va foydalanuvchi o'zini notanish ko'radi; saqlangan
              kadr esa `canvas` orqali olinadi va u aks etmaydi.
            */}
            <video ref={video} playsInline muted className="size-full scale-x-[-1] object-cover" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[12%] rounded-full border-2 border-primary/70"
            />
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Icon name="camera" size={32} />
            <p className="text-small">Kamera o‘chiq</p>
          </div>
        )}
      </div>

      <ul className="flex flex-wrap justify-center gap-2">
        {TIPS.map((tip) => (
          <li
            key={tip}
            className="rounded-full border border-border px-3 py-1 text-tiny text-muted-foreground"
          >
            {tip}
          </li>
        ))}
      </ul>

      {error ? <p className="text-small text-danger">{error}</p> : null}

      <div className="flex flex-col gap-2">
        {cameraOn ? (
          <Button onClick={() => void capture()} disabled={working}>
            {working ? 'Saqlanmoqda…' : 'Skanerlash'}
          </Button>
        ) : (
          <Button onClick={() => void startCamera()} disabled={working}>
            Kamerani yoqish
          </Button>
        )}

        {/*
          To'liq bo'yli surat — ikkinchi yo'l.

          ⚠️ U YUZ SKANERIDAN YAXSHIROQ NATIJA BERADI (AI zanjiri bir
          qadam qisqaradi), lekin ko'proq kuch talab qiladi. Shuning
          uchun taklif qilinadi, majburlanmaydi.
        */}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void pickFile(file);
            event.target.value = '';
          }}
        />
        <Button variant="ghost" onClick={() => fileInput.current?.click()} disabled={working}>
          To‘liq bo‘yli suratimni yuklayman
        </Button>
      </div>

      <p className="text-tiny text-muted-foreground">
        Surat kiyintirish uchun tashqi AI xizmatiga yuboriladi va serverimizda saqlanadi.
      </p>
    </Card>
  );
}
