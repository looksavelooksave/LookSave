import { describe, expect, it } from 'vitest';

import { buildAvatarPrompt, missingForAvatar } from './avatar-prompt';

/**
 * Tavsif sinovlari.
 *
 * ⚠️ NEGA MUHIM: `model-create` da o'lcham boshqaruvi yo'q — bo'y, gavda
 * va poza FAQAT shu matn orqali beriladi. Tavsifdagi xato to'g'ridan-to'g'ri
 * yaroqsiz avatarga aylanadi va u pul turadi.
 */

describe('avatar tavsifi', () => {
  it('bo`y va jinsni tavsifga kiritadi', () => {
    const prompt = buildAvatarPrompt('male', { height: 180, weight: 78 });
    expect(prompt).toContain('180 cm tall');
    expect(prompt).toContain('man');
  });

  /*
   * ⚠️ ILGARI BU TEST TESKARISINI TALAB QILARDI: ayolga `leggings`,
   * erkakka `shorts`. Ular olib tashlandi, chunki OpenAI so'rovni
   * `safety_violations=[sexual]` bilan rad etardi — so'rovda tirik
   * odamning yuz surati bor va tanaga urg'u beruvchi so'zlar rad etish
   * ehtimolini oshiradi.
   */
  it('ikkala jinsga ham bir xil, tanani yopadigan kiyim beradi', () => {
    const female = buildAvatarPrompt('female', { height: 165, weight: 58 });
    const male = buildAvatarPrompt('male', { height: 165, weight: 58 });

    for (const prompt of [female, male]) {
      expect(prompt).toContain('trousers');
      expect(prompt).not.toContain('fitted');
      expect(prompt).not.toContain('leggings');
      expect(prompt).not.toContain('shorts');
    }
  });

  it('jins ko`rsatilmasa neytral so`z ishlatiladi', () => {
    expect(buildAvatarPrompt(null, { height: 170, weight: 65 })).toContain('person');
  });

  /*
   * Uchta talab kiyintirish modeli uchun majburiy. Ular tushib qolsa
   * natija yaroqsiz bo'ladi, lekin buni faqat qurilmada ko'rish mumkin —
   * shuning uchun sinov bilan qulflanadi.
   */
  it('to`liq gavda talabini yo`qotmaydi', () => {
    const prompt = buildAvatarPrompt('male', { height: 175, weight: 70 });
    expect(prompt).toContain('head to feet');
    expect(prompt).toContain('nothing is cropped');
  });

  /*
   * ⚠️ POZA 2026-09-23 DA O'ZGARDI: 45 daraja burilish o'rniga deyarli
   * to'g'ri turish. Sabab — yonboshlagan gavdada kiyimning OLD tomoni
   * (naqsh, yoqa, tugmalar) qiyshiq ko'rinardi, mijoz esa mahsulotni
   * aynan oldindan ko'rishi kerak.
   */
  it('asosiy avatarni chapga uch-chorak, ikkala qo`li cho`ntakda pozada yasaydi', () => {
    const prompt = buildAvatarPrompt('female', { height: 168, weight: 60 });
    expect(prompt).toContain('turned about 40 degrees to the LEFT');
    expect(prompt).toContain('three-quarter pose');
    expect(prompt).toContain('FACE turns directly toward the camera');
    expect(prompt).toContain('Both hands rest casually inside the trouser pockets');
    expect(prompt).toContain('feet are shoulder-width apart');
    expect(prompt).toContain('body axis upright');

    /* Eski yo'riq qaytib kelmasin — u yangisi bilan to'g'ridan-to'g'ri ziddiyatda */
    expect(prompt).not.toContain('do not make the body face straight forward');
  });

  it('yon va orqa rakurslarda qo`llarni gavdadan ajratib turadi', () => {
    for (const angle of ['side', 'back'] as const) {
      expect(buildAvatarPrompt('male', { height: 175, weight: 70 }, angle)).toContain(
        'arms relaxed at the sides and slightly away from the body',
      );
    }
  });

  it('shaffof fon talabini yo`qotmaydi', () => {
    expect(buildAvatarPrompt('male', { height: 175, weight: 70 })).toContain(
      'isolated on a transparent background',
    );
  });

  it('gavda tuzilishi vaznga qarab o`zgaradi', () => {
    const slim = buildAvatarPrompt('male', { height: 185, weight: 60 });
    const heavy = buildAvatarPrompt('male', { height: 165, weight: 95 });
    expect(slim).toContain('slim');
    expect(heavy).toContain('heavy-set');
  });

  it('o`lchovlar to`liq bo`lsa gavda shakli qo`shiladi', () => {
    const prompt = buildAvatarPrompt('female', {
      height: 168,
      weight: 58,
      chest: 88,
      waist: 66,
      hips: 98,
    });
    expect(prompt).toContain('fuller hips');
  });

  /*
   * To'liq bo'lmagan o'lchovda shakl UMUMAN aytilmaydi: taxminiy tavsif
   * noto'g'ri gavda yasaydi va foydalanuvchi o'zini tanimaydi.
   */
  it('o`lchovlar chala bo`lsa shakl aytilmaydi', () => {
    const prompt = buildAvatarPrompt('female', { height: 168, weight: 58, chest: 88 });
    expect(prompt).not.toContain('hips');
    expect(prompt).not.toContain('broad shoulders');
  });

  it('vazn yo`q bo`lsa ham tavsif tuziladi', () => {
    expect(buildAvatarPrompt('male', { height: 180 })).toContain('average build');
  });
});

describe('yetishmayotgan o`lchov', () => {
  it('bo`y yo`qligini aytadi', () => {
    expect(missingForAvatar({})).toBe("bo'y");
  });

  it('vazn yo`qligini aytadi', () => {
    expect(missingForAvatar({ height: 180 })).toBe('vazn');
  });

  it('ikkalasi bor bo`lsa null', () => {
    expect(missingForAvatar({ height: 180, weight: 75 })).toBeNull();
  });
});
