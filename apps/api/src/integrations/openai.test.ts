import { describe, expect, it } from 'vitest';

import {
  buildAvatarRequestPrompt,
  buildImageOptions,
  buildPrompt,
  describeNetworkError,
  garmentKindForSlot,
  generationFingerprint,
} from './openai';

/**
 * OpenAI kiyintirish sinovlari.
 *
 * ⚠️ NEGA PROMPT SINALADI. `gpt-image-1` — umumiy rasm generatori: erkin
 * qo'yilsa u odamning yuzini ham qayta chizadi va foydalanuvchi kadrda
 * O'ZINI EMAS, boshqa odamni ko'radi. Buni to'sadigan yagona narsa —
 * promptdagi cheklovlar. Ular kod ko'rinishida emas, matn ichida, ya'ni
 * tasodifan o'chirilsa hech qayerda xato chiqmaydi: na tip tekshiruvi,
 * na lint sezadi. Sinov o'sha jim yo'qotishni ushlaydi.
 */

describe('slot -> kiyim turi', () => {
  it('ustki kiyimlar `tops` ga tushadi', () => {
    expect(garmentKindForSlot('top')).toBe('tops');
    expect(garmentKindForSlot('outer')).toBe('tops');
  });

  it('pastki kiyim `bottoms`, ko`ylak `one-pieces`', () => {
    expect(garmentKindForSlot('bottom')).toBe('bottoms');
    expect(garmentKindForSlot('dress')).toBe('one-pieces');
  });

  it('noma`lum slot modelga o`zi hal qilishga qoldiriladi', () => {
    expect(garmentKindForSlot('shoes')).toBe('auto');
    expect(garmentKindForSlot('')).toBe('auto');
  });
});

describe('prompt cheklovlari', () => {
  const prompt = buildPrompt('tops');

  it('yuz va tanani o`zgartirishni taqiqlaydi', () => {
    expect(prompt).toMatch(/face/i);
    expect(prompt).toMatch(/unchanged/i);
    expect(prompt).toMatch(/body proportions/i);
  });

  it('poza, yorug`lik va fonni saqlashni talab qiladi', () => {
    expect(prompt).toMatch(/same pose, lighting and background/i);
  });

  it('kiyimni aniq takrorlashni talab qiladi', () => {
    /*
     * Bu jumla eng muhimi: usiz model kiyimni «shunga o'xshash» qilib
     * qayta chizadi va foydalanuvchi buyurtma qilgan mahsulot bilan
     * ko'rgani mos kelmaydi.
     */
    expect(prompt).toMatch(/colour, pattern and shape as accurately as possible/i);
  });

  it('bosma manbasi berilganda uni AYNAN takrorlashni talab qiladi', () => {
    /*
     * Uchta jumla ham kerak: model bosmani «qayta chizishga» moyil va
     * bittasi yetmasligi o'lchandi. Biri o'chirilsa ikonkalar joyi
     * almashib ketadi — ekranda esa bu «shunchaki boshqacha» bo'lib
     * ko'rinadi, xato sifatida emas.
     */
    const withPrint = buildPrompt('tops', { print: true });
    expect(withPrint).toMatch(/copy that artwork EXACTLY/i);
    expect(withPrint).toMatch(/do not redraw/i);
    expect(withPrint).toMatch(/do not rearrange/i);
  });

  it('rasm raqamlari biriktirilganlarga qarab suriladi', () => {
    /*
     * ⚠️ ENG NOZIK JOY. Prompt rasmlarni «third/fourth» deb ataydi va bu
     * `image[]` tartibiga mos kelishi shart. Yuz bo'lmasa bosma
     * UCHINCHI bo'lib qoladi — raqam qotirib qo'yilsa model noto'g'ri
     * rasmga qarardi va buni ekranda payqash deyarli imkonsiz.
     */
    const onlyPrint = buildPrompt('tops', { print: true });
    expect(onlyPrint).toMatch(/third image is a close-up of the exact artwork/i);

    const both = buildPrompt('tops', { face: true, print: true });
    expect(both).toMatch(/third image is a close-up reference of the same person/i);
    expect(both).toMatch(/fourth image is a close-up of the exact artwork/i);
  });

  it('kiyim turini kadrdagi joyiga bog`laydi', () => {
    expect(buildPrompt('tops')).toMatch(/upper-body/i);
    expect(buildPrompt('bottoms')).toMatch(/lower-body/i);
    expect(buildPrompt('one-pieces')).toMatch(/full-body/i);
  });
});

describe('qatlam ko`rsatmasi', () => {
  /*
   * ⚠️ BU JUMLALAR YO'QOLSA QATLAM JIM BUZILADI. Model «kiyintir» ni
   * ALMASHTIRISH deb tushunadi: kurtka qo'yilganda ostidagi futbolkani
   * o'chirib yuboradi va ekranda yana bitta kiyim qoladi. Kod tomondan
   * hammasi to'g'ri ishlayotgandek ko'rinadi — zanjir bog'lanadi, surat
   * keladi — faqat surat noto'g'ri.
   */
  const layered = buildPrompt('tops', { layer: true });

  it('yangi kiyim USTIGA qo`yilishini aytadi', () => {
    expect(layered).toMatch(/already dressed/i);
    expect(layered).toMatch(/on top of/i);
  });

  it('ostidagi kiyim ko`rinib turishini talab qiladi', () => {
    expect(layered).toMatch(/stay visible/i);
  });

  it('mavjud kiyimni olib tashlashni taqiqlaydi', () => {
    expect(layered).toMatch(/do not remove/i);
  });

  it('qatlamsiz chaqiruvda bu jumlalar YO`Q — birinchi kiyim asl suratga tushadi', () => {
    const plain = buildPrompt('tops');
    expect(plain).not.toMatch(/already dressed/i);
    expect(plain).not.toMatch(/on top of/i);
  });
});

describe('chiqish sozlamalari', () => {
  /*
   * ⚠️ BU SINOVLAR PROMPT SINOVLARI BILAN BIR XIL SABABGA EGA. Bu
   * qiymatlar so'rov tanasidagi oddiy satrlar: biri tushib qolsa na tip
   * tekshiruvi, na lint sezadi — chaqiruv baribir 200 qaytaradi, faqat
   * natijadagi yuz boshqa odamniki bo'ladi.
   */
  const sunburst = buildImageOptions('gpt-image-2.5-sunburst');

  it('natija shaffof PNG bo`ladi — R2 yorlig`i .png/image/png', () => {
    /*
     * `storeResult` va `storeAvatar` natijani `.png` kaliti va
     * `image/png` sarlavhasi bilan yozadi. `background: transparent`
     * faqat png/webp bilan ishlaydi — orqa fon bo'lmaydi.
     */
    expect(sunburst.output_format).toBe('png');
    expect(sunburst.background).toBe('transparent');
  });

  it('tik kadr 16 ga bo`linadi va nisbati 1:3–3:1 ichida', () => {
    /*
     * ⚠️ 2.5 NING QAT'IY TALABI. Ikkala tomon 16 ga bo'linmasa yoki
     * nisbat chegaradan chiqsa so'rov 400 bilan qaytadi — ya'ni
     * kiyintirish umuman ishlamay qoladi. Qiymat qo'lda o'zgartirilishi
     * mumkin, shuning uchun shart sinovda.
     */
    const [width = 0, height = 0] = (sunburst.size ?? '').split('x').map(Number);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(width % 16).toBe(0);
    expect(height % 16).toBe(0);
    expect(width / height).toBeGreaterThanOrEqual(1 / 3);
    expect(width / height).toBeLessThanOrEqual(3);
  });

  it('sifat va son o`zgarmaydi', () => {
    expect(sunburst.quality).toBe('high');
    expect(sunburst.n).toBe('1');
  });
});

describe('kirish aniqligi — model oilasiga qarab', () => {
  /*
   * ⚠️ ENG QIMMAT XATO SHU YERDA BO'LARDI. `input_fidelity` ni 2.5 ga
   * yuborsak so'rov 400 bilan qaytadi — kiyintirish butunlay ishlamaydi.
   * `gpt-image-1` ga yubormasak esa so'rov O'TADI, lekin yuz boshqa
   * odamniki bo'lib qaytadi — bu jimroq va shuning uchun yomonroq.
   */
  it('2.5 da SO`RALMAYDI — kirish allaqachon yuqori aniqlikda', () => {
    expect(buildImageOptions('gpt-image-2.5-sunburst').input_fidelity).toBeUndefined();
    expect(buildImageOptions('gpt-image-2.5-flare').input_fidelity).toBeUndefined();
    expect(buildImageOptions('gpt-image-2').input_fidelity).toBeUndefined();
  });

  it('`gpt-image-1` va `1.5` da SO`RALADI — ularda sukut `low`', () => {
    expect(buildImageOptions('gpt-image-1').input_fidelity).toBe('high');
    expect(buildImageOptions('gpt-image-1.5').input_fidelity).toBe('high');
  });

  it('sanali snapshot ham tanildi', () => {
    expect(buildImageOptions('gpt-image-1.5-2026-01-30').input_fidelity).toBe('high');
    expect(buildImageOptions('gpt-image-2.5-sunburst-2026-09-08').input_fidelity).toBeUndefined();
  });

  it('`gpt-image-1-mini` ISTISNO — nomi o`xshash, parametri yo`q', () => {
    /*
     * Prefiks bo'yicha tekshirsak u o'tib ketardi va har chaqiruv 400
     * bilan qaytardi. Shuning uchun ro'yxat aniq.
     */
    expect(buildImageOptions('gpt-image-1-mini').input_fidelity).toBeUndefined();
  });
});

describe('yuz havolasi ko`rsatmasi', () => {
  /*
   * ⚠️ ZANJIR DEGRADATSIYASI JIM MUAMMO. Saytda kiyintirish ko'pincha
   * YASALGAN avatarga tushadi, qatlamda esa oldingi natijaga — ya'ni
   * birinchi rasmdagi yuz allaqachon taxmin. Bu jumla modelga
   * zanjirdagi yagona haqiqiy suratga ishonishni aytadi.
   */
  it('haqiqiy shaxsni havoladan tiklashni talab qiladi', () => {
    const withFace = buildPrompt('tops', { face: true });
    expect(withFace).toMatch(/restore the true identity/i);
    expect(withFace).toMatch(/not a lookalike/i);
  });

  it('yuz havolasi bo`lmasa bu jumla YO`Q — tiklash uchun manba yo`q', () => {
    expect(buildPrompt('tops')).not.toMatch(/restore the true identity/i);
  });
});

describe('generatsiya retsepti — kesh kaliti', () => {
  /*
   * ⚠️ BU YERDA IKKI TOMONLAMA XATO BOR VA IKKALASI HAM QIMMAT.
   *
   * Retsept o'zgarmasa — model almashtirilgani bilan kesh eski natijani
   * qaytaraveradi va yangi model UMUMAN chaqirilmaydi. Tashqaridan bu
   * «o'zgarish ishlamadi» bo'lib ko'rinadi.
   *
   * Retsept beqaror bo'lsa — har so'rov kesh promaxi bo'ladi va HAR
   * KO'RISH qaytadan to'lanadi. Ikkinchisi jimroq va shuning uchun
   * xavfliroq: hech narsa buzilmaydi, faqat hisob o'sadi.
   */
  it('bir xil model — bir xil retsept (kesh promaxi bo`lmaydi)', () => {
    expect(generationFingerprint('gpt-image-2.5-sunburst')).toBe(
      generationFingerprint('gpt-image-2.5-sunburst'),
    );
  });

  it('model almashsa retsept ham almashadi — kesh bekor bo`ladi', () => {
    expect(generationFingerprint('gpt-image-2.5-sunburst')).not.toBe(
      generationFingerprint('gpt-image-1'),
    );
  });

  it('kirish aniqligidagi farq retseptga tushadi', () => {
    /*
     * `gpt-image-1` ga `input_fidelity=high` qo'shiladi, 2.5 ga yo'q.
     * Ya'ni farq faqat nomda emas, so'rov tanasida ham — va natija
     * boshqacha chiqadi, demak kesh ajralishi SHART.
     */
    expect(generationFingerprint('gpt-image-1')).toMatch(/input_fidelity=high/);
    expect(generationFingerprint('gpt-image-2.5-sunburst')).not.toMatch(/input_fidelity/);
  });

  it('maydonlar saralangan — tartibi o`zgarsa kesh kuyib ketmasin', () => {
    /*
     * `buildImageOptions` ichidagi maydonlarning joyini almashtirish —
     * bezak tahriri. Saralanmasa u butun keshni jimgina bekor qilardi
     * va hamma narsa qaytadan to'lanardi.
     */
    const [model, ...options] = generationFingerprint('gpt-image-1').split('|');
    expect(model).toBe('gpt-image-1');
    expect(options).toEqual([...options].sort());
  });
});

describe('tarmoq xatosini o`qiladigan qilish', () => {
  /*
   * ⚠️ NEGA SINALADI. Node'ning `fetch` i HAR QANDAY tarmoq nosozligini
   * bir xil `TypeError: fetch failed` bilan qaytaradi — aniq sabab
   * `cause` ichida qoladi. O'sha bo'sh matn bazaga yozilib, ekranda
   * foydalanuvchiga ko'rsatilardi: «fetch failed». Ulanish uzilgani,
   * kalit noto'g'risi va surat yo'qligi bir xil ko'rinardi.
   */
  it('haqiqiy sababni `cause` dan chiqaradi', () => {
    const err = new TypeError('fetch failed', {
      cause: new Error('Connect Timeout Error (attempted address: r2.dev:443, timeout: 10000ms)'),
    });

    expect(describeNetworkError(err)).toMatch(/Connect Timeout Error/);
    expect(describeNetworkError(err)).not.toBe('fetch failed');
  });

  it('chegara tugashini alohida aytadi', () => {
    const timeout = new Error('The operation was aborted');
    timeout.name = 'TimeoutError';
    expect(describeNetworkError(timeout)).toBe('vaqt tugadi');
  });

  it('`cause` bo`lmasa xatoning o`z matnini beradi', () => {
    expect(describeNetworkError(new Error('ECONNRESET'))).toBe('ECONNRESET');
  });

  it('Error bo`lmagan qiymatni ham eplaydi', () => {
    expect(describeNetworkError('nimadir')).toBe('nimadir');
  });
});

describe('avatar prompti — burchak ziddiyatlari', () => {
  /*
   * ⚠️ BU XATO JIM TURGAN VA HAR BURCHAK UCHUN PUL OLGAN.
   *
   * `generateAvatar` o'z matnida «standing straight, FACING THE CAMERA»
   * deb qotirib qo'ygan edi, `buildAvatarPrompt` esa o'sha so'rovga
   * «Turned away from the camera, back view» ni qo'shardi. Model
   * birinchisini tanlardi: «orqa» avatar OLDINDAN chiqardi, «yon» esa
   * atigi 15 daraja burilardi.
   *
   * Tashqaridan hammasi to'g'ri ko'rinardi — so'rov 200 qaytardi, surat
   * keldi, bazaga yozildi. Faqat surat noto'g'ri edi.
   */
  const body = {
    front: 'Facing the camera directly, front view.',
    side: 'Turned 90 degrees to the left, full side profile view.',
    back: 'Turned away from the camera, back view, face not visible.',
  };

  it('orqa ko`rinishda «facing the camera» BO`LMAYDI', () => {
    expect(buildAvatarRequestPrompt(body.back, 'back')).not.toMatch(/facing the camera/i);
  });

  it('yon ko`rinishda ham BO`LMAYDI', () => {
    expect(buildAvatarRequestPrompt(body.side, 'side')).not.toMatch(/facing the camera/i);
  });

  it('orqa ko`rinishda yuzni saqlash TALAB QILINMAYDI', () => {
    /*
     * Orqadan turgan odamning yuzi ko'rinmaydi. «Keep the face exactly»
     * modelni yuzni ko'rsatishga undaydi va u odamni kameraga qaratadi.
     */
    const back = buildAvatarRequestPrompt(body.back, 'back');
    expect(back).not.toMatch(/face.*EXACTLY/i);
    expect(back).toMatch(/face is NOT visible/i);
  });

  it('old ko`rinishda yuz qulflanadi', () => {
    expect(buildAvatarRequestPrompt(body.front, 'front')).toMatch(/face.*EXACTLY/i);
  });

  it('kiyim va fon ko`rsatmasi TAKRORLANMAYDI', () => {
    /*
     * Ikkalasi ham `buildAvatarPrompt` dan keladi. `generateAvatar` o'zi
     * ham aytganda so'rovda bir xil jumla ikki marta turardi — bu kirish
     * tokenini yeydi va modelga qo'sh signal beradi.
     */
    const full = buildAvatarRequestPrompt(
      'Wearing a plain light grey t-shirt and plain light grey trousers. Plain light grey seamless studio background, soft even lighting.',
      'front',
    );
    expect((full.match(/light grey t-shirt/gi) ?? []).length).toBe(1);
    expect((full.match(/studio background/gi) ?? []).length).toBe(1);
  });
});
