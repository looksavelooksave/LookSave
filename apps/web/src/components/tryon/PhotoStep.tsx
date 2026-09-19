import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Card, Icon } from '@looksave/ui-web';

import type { TryonController } from './useTryon';

/**
 * Yuz skaneri — oqimning birinchi qadami.
 *
 * ⚠️ TO'LIQ BO'YLI SURAT ASOSIY YO'L — VA BU O'ZGARTIRILDI.
 *
 * Ilgari selfi asosiy edi: u qulayroq, chunki to'liq bo'yli surat uchun
 * joy, oyna va ko'pincha boshqa odamning yordami kerak. Qulaylik esa
 * konversiyani ushlab turadi.
 *
 * Lekin natija buni oqlamadi. Selfi berilganda kiyintirish YASALGAN
 * avatarga tushadi, ya'ni zanjir ikki generatsiyadan iborat bo'ladi:
 *
 *   selfi → [AI] avatar → [AI] kiyintirish
 *
 * Yuz har qadamda siljiydi va foydalanuvchi kadrda o'zini tanimaydi —
 * butun oqimning ma'nosi esa aynan O'ZINI ko'rishda. Haqiqiy surat bilan
 * zanjir bir qadam qisqaradi (`api/tryon/render.ts` — `loadSources`
 * haqiqiy suratni birinchi qo'yadi).
 *
 * ⚠️ SKANER OLIB TASHLANMADI, IKKINCHI YO'LGA O'TDI. U ikki narsa
 * beradi: yuz havolasi (kiyintirishda o'xshashlikni mustahkamlaydi) va
 * YON/ORQA ko'rinish — burchak avatarlari faqat yuz suratidan yasaladi
 * (`api/tryon/avatar.ts` — `requestAngle`). Shuning uchun tanlov ekranda
 * ochiq aytiladi: qaysi biri nima beradi.
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

/**
 * API qabul qiladigan turlar (`presignSchema`). Ro'yxatdan tashqarisi
 * `image/jpeg` ga keltiriladi — kadr baribir shu turda olinadi.
 */
const SUPPORTED = ['image/webp', 'image/jpeg', 'image/png'];

const TIPS = ['Tekis yorug‘lik', 'To‘g‘ridan-to‘g‘ri qarang', 'Yelka ham kadrga tushsin'];

/**
 * To'liq bo'yli surat uchun yo'riqnoma.
 *
 * ⚠️ HAR BANDI NATIJAGA TA'SIR QILADI, bezak emas. Model pozani va fonni
 * asl suratdan ko'chiradi (`integrations/openai.ts` — «Keep the same
 * pose, lighting and background»), ya'ni kadr qanday bo'lsa natija ham
 * shunday chiqadi.
 */
const UPLOAD_TIPS = [
  'Butun gavda ko‘rinsin — boshdan oyoqqacha',
  'Tik turing, qo‘llar yonda, to‘g‘ridan-to‘g‘ri qarang',
  'Fon sodda, yorug‘lik tekis bo‘lsin',
  'Tor kiyimda oling — keng kiyim gavda shaklini yashiradi',
];

/**
 * Kadr nisbati — 4:5, portret.
 *
 * ⚠️ YELKA UCHUN. Ilgari kadr kvadrat edi va yo'riqnoma doirasi butun
 * maydonni egallardi: odam yuzini shu doiraga to'ldirib, yelkasi
 * kadrdan tushib qolardi. Avatar gavdasi esa yelka kengligidan
 * boshlanadi.
 *
 * ⚠️ QIYMAT BITTA JOYDA TURISHI SHART. Ko'rinadigan ramka, yo'riqnoma
 * silueti va SAQLANADIGAN kadr — uchalasi bir xil nisbatda. Bittasini
 * unutish yelkani kesib tashlashning eng oson yo'li: odam siluetga
 * to'g'ri turadi, `capture` esa boshqa joydan qirqadi.
 */
const FRAME_W = 4;
const FRAME_H = 5;

export function PhotoStep({
  controller,
  onDone,
  onCancel,
}: {
  controller: TryonController;
  /**
   * Surat saqlangandan keyin chaqiriladi.
   *
   * ⚠️ QAYTA OLISH UCHUN KERAK. Sehrgar bosqichlari serverdagi
   * `needs.photo` bilan boshqariladi; surat bor bo'lsa u `false` va
   * bu ekran o'z-o'zidan ochilmaydi. Qayta olishda ekranni chaqiruvchi
   * MAJBURAN ochadi, ya'ni yopishni ham o'zi bilishi kerak.
   */
  onDone?: () => void;
  /** Qayta olishdan voz kechish. Berilsa — «Bekor qilish» tugmasi chiqadi. */
  onCancel?: () => void;
}): JSX.Element {
  const { act, refresh, state } = controller;

  const [consented, setConsented] = useState(false);
  /*
   * Qaysi yo'l tanlangani. `choose` — ikki yo'lni taqqoslash ekrani,
   * `camera` — yuz skaneri. Sukut `choose`: asosiy amal surat yuklash,
   * va u kamerani umuman so'ramaydi.
   */
  const [mode, setMode] = useState<'choose' | 'camera'>('choose');
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

  /*
   * ⚠️ OQIM SHU YERDA ULANADI, `startCamera` DA EMAS.
   *
   * `<video>` faqat `cameraOn === true` bo'lganda chiziladi. `startCamera`
   * ichida `setCameraOn(true)` dan keyingi SATRDA `video.current` hamon
   * `null` bo'ladi — React qayta chizishga ulgurmagan. U yerdagi
   * `if (video.current)` esa buni jimgina yutardi: ruxsat berilgan,
   * kamera indikatori yongan, tugma «Skanerlash» ga o'zgargan, lekin
   * `srcObject` hech qachon o'rnatilmagani uchun kadr QORA qolardi.
   *
   * Effekt qayta chizishdan KEYIN ishlaydi, ya'ni element mavjud.
   */
  useEffect(() => {
    const element = video.current;
    if (!cameraOn || !element || !stream.current) return;

    element.srcObject = stream.current;

    // `play()` uzilishi mumkin (masalan komponent darrov yopilsa) —
    // ushlanmagan rad etish konsolni ifloslantirmasin
    element.play().catch(() => {
      setError('Kamera tasvirini ko`rsatib bo`lmadi');
    });
  }, [cameraOn]);

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
        /*
         * ⚠️ PORTRET SO'RALADI (kadr 4:5). Kvadrat so'ralganda ko'p
         * kamera eng yaqin 4:3 ni beradi va balandlik yetmay, yelka
         * uchun joy qolmaydi.
         */
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1350 } },
      });

      // Oqim quyidagi `useEffect` da ulanadi — bu yerda `<video>` hali yo'q
      stream.current = media;
      setCameraOn(true);
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
    /*
     * ⚠️ `fileName` API'DA MAJBURIY (`presignSchema`). Ilgari u
     * yuborilmasdi va har skanerlash 422 bilan tugardi — ekranda esa
     * faqat «Ma`lumotlar to`liq emas» chiqardi, sababi ko'rinmasdi.
     *
     * Qiymatning o'zi R2 kalitiga TUSHMAYDI (kalit — UUID); u faqat
     * kengaytmani aniqlashga kerak, shuning uchun turdan yasaymiz.
     */
    const type = SUPPORTED.includes(blob.type) ? blob.type : 'image/jpeg';
    const fileName = `${purpose}.${type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'}`;

    const signed = await act({ op: 'presign', purpose, contentType: type, fileName });
    const data = signed.data as
      { uploadUrl: string; publicUrl: string; headers: Record<string, string> } | undefined;

    if (!data) throw new Error(signed.error ?? 'Yuklash havolasi olinmadi');

    /*
     * ⚠️ `fetch` BU YERDA JAVOBSIZ OTIB KETISHI MUMKIN — HTTP holati
     * umuman bo'lmaydi, ya'ni quyidagi `put.ok` gacha yetib ham
     * borilmaydi. Amalda sabab deyarli har doim bitta: R2 bucketida
     * CORS sozlanmagan va brauzerning preflight so'rovi rad etilgan
     * (`403 CORS not configured for this bucket`).
     *
     * ⚠️ XOM XABARNI KO'RSATIB BO'LMAYDI. Brauzerlar buni har xil
     * ataydi — Safari «Load failed», Chrome «Failed to fetch» — va
     * ikkalasi ham foydalanuvchiga hech narsa aytmaydi. Oddiy
     * so'rovlarda buni `api/client.ts` allaqachon qiladi
     * (`ApiError('NETWORK', ...)`); bu yo'l esa undan chetlab o'tadi,
     * chunki fayl to'g'ridan-to'g'ri R2 ga ketadi.
     */
    let put: Response;
    try {
      put = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: data.headers,
        body: blob,
      });
    } catch {
      throw new Error('Suratni saqlab bo`lmadi — ulanishni tekshiring va qayta urining');
    }

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
       * ⚠️ QIRQILADI, cho'zilmaydi. Video oqimi qurilmaga qarab 4:3
       * yoki 16:9 bo'ladi; to'g'ridan-to'g'ri chizilsa yuz yon
       * tomonlardan yassilanardi.
       *
       * ⚠️ QIRQIM EKRANDAGI RAMKA BILAN BIR XIL (`FRAME_W:FRAME_H`).
       * Oldin bu yer kvadratga qirqardi — odam siluetga yelkasi bilan
       * to'g'ri tursa ham, saqlangan kadrda yelka kesilib qolardi.
       */
      const vw = element.videoWidth;
      const vh = element.videoHeight;
      if (!vw || !vh) throw new Error('Kadr olinmadi');

      let cropW = vw;
      let cropH = Math.round((vw * FRAME_H) / FRAME_W);
      if (cropH > vh) {
        cropH = vh;
        cropW = Math.round((vh * FRAME_W) / FRAME_H);
      }

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Kadr olinmadi');

      context.drawImage(
        element,
        Math.round((vw - cropW) / 2),
        Math.round((vh - cropH) / 2),
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      );
      if (!blob) throw new Error('Kadr olinmadi');

      const url = await upload(blob, 'face');
      const saved = await act({ op: 'face', url });
      if (saved.error) throw new Error(saved.error);

      /*
       * ⚠️ AVATAR FAQAT O'LCHAMLAR BO'LGANDA SO'RALADI.
       *
       * Generatsiya kredit sarflaydi va server bo'y bilan vaznni talab
       * qiladi. Ilgari u shartsiz chaqirilardi: yangi foydalanuvchida
       * o'lchamlar hali yo'q edi, so'rov 422 bilan qaytardi va javob
       * TEKSHIRILMAGANI uchun xato jimgina yo'qolardi.
       *
       * O'lchamlar yo'q bo'lsa hech narsa qilinmaydi — sehrgar «sizes»
       * bosqichiga o'tadi va avatarni o'sha yer boshlaydi.
       */
      if (state && !state.needs.sizes) {
        const started = await act({ op: 'avatar' });
        if (started.error) throw new Error(started.error);
      }

      stopCamera();
      await refresh();
      onDone?.();
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
      onDone?.();
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
          <h2 className="mt-2 text-h2">Suratingiz</h2>
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

  /*
   * ⚠️ FAYL TANLAGICH IKKALA EKRANDA HAM KERAK. U yashirin, lekin
   * `fileInput.current` mavjud bo'lishi shart — aks holda «Yuklash»
   * tugmasi jimgina hech narsa qilmasdi.
   */
  const filePicker = (
    <input
      ref={fileInput}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void pickFile(file);
        event.target.value = '';
      }}
    />
  );

  /*
   * TANLOV EKRANI.
   *
   * ⚠️ IKKALA YO'L HAM QOLADI, LEKIN TENG EMAS. To'liq bo'yli surat —
   * asosiy tugma, chunki u yuzni eng aniq beradi. Skaner ikkinchi, lekin
   * YASHIRILMAYDI: burchak ko'rinishlari faqat undan chiqadi.
   *
   * ⚠️ HAR YO'LNING NARXI OCHIQ YOZILGAN. Ilgari ikkinchi tugmada
   * shunchaki «To'liq bo'yli suratimni yuklayman» derdi va foydalanuvchi
   * nima yutishini bilmasdi — deyarli hech kim bosmasdi.
   */
  if (mode === 'choose') {
    return (
      <Card className="flex flex-col gap-5 p-6 sm:p-8">
        <div>
          <p className="eyebrow">1-qadam</p>
          <h2 className="mt-2 text-h2">To‘liq bo‘yli suratingizni yuklang</h2>
          <p className="mt-2 text-small text-muted-foreground">
            AI kiyimni aynan shu suratga kiydiradi — yuzingiz va gavdangiz o‘zgarmaydi.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {UPLOAD_TIPS.map((tip) => (
            <li key={tip} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primarySoft text-brand">
                <Icon name="authentic" size={16} />
              </span>
              <span className="text-small text-muted-foreground">{tip}</span>
            </li>
          ))}
        </ul>

        {error ? <p className="text-small text-danger">{error}</p> : null}

        {filePicker}

        <div className="flex flex-col gap-2">
          <Button onClick={() => fileInput.current?.click()} disabled={working}>
            {working ? 'Yuklanmoqda…' : 'Suratimni tanlayman'}
          </Button>

          {/*
            ⚠️ SKANER — IKKINCHI YO'L, LEKIN KERAKLI. Uning nimaga
            kerakligi tugmaning ostida aytiladi: usiz yon va orqa
            ko'rinish umuman bo'lmaydi.
          */}
          <Button variant="ghost" onClick={() => setMode('camera')} disabled={working}>
            Suratim yo‘q — yuzimni skaner qilaman
          </Button>
          <p className="text-center text-tiny text-muted-foreground">
            Skaner yon va orqa ko‘rinishni ham ochadi, lekin yuz AI tomonidan qaytadan chiziladi —
            o‘xshashlik biroz pasayadi.
          </p>

          {onCancel ? (
            <Button variant="ghost" onClick={onCancel} disabled={working}>
              Bekor qilish
            </Button>
          ) : null}
        </div>

        <p className="text-tiny text-muted-foreground">
          Surat kiyintirish uchun tashqi AI xizmatiga yuboriladi va serverimizda saqlanadi.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8">
      <div>
        <p className="eyebrow">1-qadam</p>
        <h2 className="mt-2 text-h2">Yuzingizni skaner qiling</h2>
      </div>

      <div
        className="relative mx-auto w-full max-w-sm overflow-hidden rounded-card border border-border bg-[#050509]"
        style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
      >
        {cameraOn ? (
          <>
            {/*
              ⚠️ `scale-x-[-1]` — OYNA AKSIDEK. Kameradan kelgan tasvir
              teskari va foydalanuvchi o'zini notanish ko'radi; saqlangan
              kadr esa `canvas` orqali olinadi va u aks etmaydi.
            */}
            <video ref={video} playsInline muted className="size-full scale-x-[-1] object-cover" />

            {/*
              ⚠️ SILUET — DOIRA EMAS. Doira «yuzni shu yerga to'ldiring»
              deb o'qiladi va odam yaqinlashadi. Bosh + yelka konturi esa
              qancha uzoqlikda turishni o'zi ko'rsatadi: avatar gavdasi
              yelka kengligidan boshlanadi, ya'ni u kadrda bo'lishi shart.
            */}
            <svg
              aria-hidden="true"
              viewBox="0 0 400 500"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 size-full"
              fill="none"
              stroke="hsl(var(--primary) / 0.7)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            >
              <ellipse cx="200" cy="168" rx="84" ry="104" />
              <path d="M58 500c0-88 60-140 142-140s142 52 142 140" strokeLinecap="round" />
            </svg>
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
          ⚠️ ORQAGA QAYTISH KAMERANI O'CHIRADI. Aks holda foydalanuvchi
          tanlov ekraniga qaytadi, brauzer yorlig'ida esa kamera
          indikatori yonib turaveradi — bu kuzatuvdek ko'rinadi.
        */}
        <Button
          variant="ghost"
          onClick={() => {
            stopCamera();
            setError(null);
            setMode('choose');
          }}
          disabled={working}
        >
          Orqaga — suratimni yuklayman
        </Button>

        {/*
          ⚠️ FAQAT QAYTA OLISHDA. Birinchi o'tishda chiqish yo'li yo'q —
          surat bo'lmasa kiyintirish umuman ishlamaydi va «bekor qilish»
          odamni bo'sh ekranga olib chiqardi.
        */}
        {onCancel ? (
          <Button
            variant="ghost"
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            disabled={working}
          >
            Bekor qilish
          </Button>
        ) : null}
      </div>

      <p className="text-tiny text-muted-foreground">
        Surat kiyintirish uchun tashqi AI xizmatiga yuboriladi va serverimizda saqlanadi.
      </p>
    </Card>
  );
}
