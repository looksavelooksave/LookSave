import { isLocale } from '@/i18n/locale';

import type { Route } from './+types/support';

/**
 * Yordam markazi — App Store Connect uchun MAJBURIY sahifa (Support URL).
 *
 * ⚠️ NEGA KERAK. App Store submission'da har ilova qat'iyan
 * «Support URL» so'raydi: ochilganda foydalanuvchi kim bilan bog'lanish
 * va qanday muammoni qanday hal qilishni ko'ra oladigan sahifa. Uning
 * yo'qligi tekshirish (App Review) da rad javob (Guideline 1.5) beradi.
 *
 * ⚠️ HISOB O'CHIRISH BANDI ALOHIDA. Bu ham App Store shartida
 * (Guideline 5.1.1(v), 2022-yildan majburiy): agar ilova hisob yaratsa,
 * uni bevosita ilovaning o'zidan o'chirish yo'li KO'RSATILISHI kerak.
 * Foydalanuvchi ilovada, biz esa shu yerda uning qadamlarini takrorlab
 * beramiz — Review guruhi ekranni ochib topa oladi.
 */

const SUPPORT_EMAIL = 'support@looksave.app';
const TELEGRAM_HANDLE = '@looksave';
const TELEGRAM_URL = 'https://t.me/looksave';

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'Yordam — LookSave' },
    {
      name: 'description',
      content:
        "LookSave bilan bog'lanish, tez-tez so'raladigan savollar va hisobni o'chirish yo'li.",
    },
  ];
}

export function loader({ params }: Route.LoaderArgs) {
  return { locale: isLocale(params.locale) ? params.locale : 'en' };
}

export default function Support(): JSX.Element {
  return (
    <article className="shell max-w-3xl py-12">
      <p className="eyebrow">Yordam</p>
      <h1 className="mt-4 text-h1 font-bold">Yordam markazi</h1>
      <p className="mt-3 text-small text-dim">
        Savol yoki muammo bo'lsa yozing — 24 soat ichida javob beramiz.
      </p>

      <div className="mt-10 flex flex-col gap-8 text-body leading-[1.7] text-muted-foreground">
        <section>
          <h2 className="text-h2 font-semibold text-foreground">Biz bilan bog'lanish</h2>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              Elektron pochta:{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-foreground underline underline-offset-4 hover:text-brand"
              >
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li>
              Telegram:{' '}
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-foreground underline underline-offset-4 hover:text-brand"
              >
                {TELEGRAM_HANDLE}
              </a>
            </li>
            <li>Ish vaqti: har kuni, 09:00 – 21:00 (Toshkent vaqti).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-h2 font-semibold text-foreground">Tez-tez so'raladigan savollar</h2>

          <div className="mt-4 flex flex-col gap-6">
            <div>
              <h3 className="text-body font-semibold text-foreground">
                AI kiyintirish qanday ishlaydi?
              </h3>
              <p className="mt-1.5">
                Bir marta yuz suratingizni yuklaysiz — biz avataringizni yasaymiz. Keyin har qanday
                kiyimni bosib, o'zingizda old, yon va orqadan ko'rasiz. Surat qurilmangizdan
                serverga, u yerdan esa kiyintirish provayderiga uzatiladi (batafsil{' '}
                <a
                  href="privacy"
                  className="text-foreground underline underline-offset-4 hover:text-brand"
                >
                  maxfiylik siyosati
                </a>
                da).
              </p>
            </div>

            <div>
              <h3 className="text-body font-semibold text-foreground">O'lcham qanday tanlanadi?</h3>
              <p className="mt-1.5">
                Bo'y, vazn va tanlagan razmerlaringiz asosida har turkumda mos o'lcham taklif
                qilinadi. «Faqat mening o'lchamim» filtri esa faqat sizga tayyor variantlarni
                ko'rsatadi.
              </p>
            </div>

            <div>
              <h3 className="text-body font-semibold text-foreground">
                Buyurtma qaytarilsa nima qilinadi?
              </h3>
              <p className="mt-1.5">
                Qaytarish va almashtirish shartlari sotuvchi do'kon siyosatiga bo'ysunadi. LookSave
                nizoda vositachi bo'ladi: yozing, biz do'kon bilan bog'lanamiz.
              </p>
            </div>

            <div>
              <h3 className="text-body font-semibold text-foreground">
                Kiyintirish sekin kelayapti yoki xato chiqdi
              </h3>
              <p className="mt-1.5">
                AI generatsiyasi odatda 10–20 soniya oladi (birinchi qatlam biroz uzoqroq).
                «Yangilash» tugmasini bosing yoki ilovani qayta oching. Qayta yiqilsa, muammoni
                yuborsangiz — biz o'sha kiyim/burchak bilan tekshirib chiqamiz.
              </p>
            </div>

            <div>
              <h3 className="text-body font-semibold text-foreground">
                Kunlik AI chegarasi tugadi
              </h3>
              <p className="mt-1.5">
                Kuniga foydalanuvchiga tegishli miqdorda kiyintirish beriladi (chegara —
                foydalanuvchini AI xarajatlaridan asrash uchun). Tayyor suratlar joyida qoladi;
                yangi kiyintirish ertaga qayta ochiladi.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-h2 font-semibold text-foreground">Hisobni o'chirish</h2>
          <p className="mt-3">
            Hisobingizni ilovaning o'zidan bir necha bosishda o'chirishingiz mumkin. Ma'lumot butunlay
            olib tashlanadi — avatar, suratlar, buyurtma tarixi va manzillar.
          </p>
          <ol className="mt-4 flex list-decimal flex-col gap-2 ps-6">
            <li>Ilovaning pastki panelidagi «Profil» ni oching.</li>
            <li>Sahifa oxiridagi «Hisobni o'chirish» tugmasini bosing.</li>
            <li>Amalni tasdiqlang — hisob va bog'liq ma'lumot 24 soat ichida o'chiriladi.</li>
          </ol>
          <p className="mt-4">
            Ilovaga kira olmayotgan bo'lsangiz,{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Hisobni o'chirish")}`}
              className="text-foreground underline underline-offset-4 hover:text-brand"
            >
              {SUPPORT_EMAIL}
            </a>{' '}
            ga hisobingizga bog'langan telefon raqamidan yozing — biz tekshirib o'chiramiz.
          </p>
        </section>

        <section>
          <h2 className="text-h2 font-semibold text-foreground">Do'konlar uchun</h2>
          <p className="mt-3">
            Do'kon ochish, mahsulot yuklash yoki sotuvchi kabineti bo'yicha savol —{' '}
            <a
              href="https://store.looksave.app"
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline underline-offset-4 hover:text-brand"
            >
              store.looksave.app
            </a>{' '}
            ga o'ting yoki{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Do'kon")}`}
              className="text-foreground underline underline-offset-4 hover:text-brand"
            >
              {SUPPORT_EMAIL}
            </a>{' '}
            ga xat yuboring.
          </p>
        </section>
      </div>
    </article>
  );
}
