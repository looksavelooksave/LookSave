import { describe, expect, it } from 'vitest';

import {
  baseForCategory,
  clearLayer,
  indexRenders,
  layerRank,
  nextPending,
  resolveOutfit,
  setLayer,
  sortOutfit,
  topReady,
  type LayerRender,
} from '@looksave/validation';

/**
 * ⚠️ SINOV SHU YERDA, MODUL ESA `@looksave/validation` DA.
 *
 * Modul ikkala ilovaga ham kerak bo'lgani uchun paketga ko'chirildi,
 * paketda esa sinov yugurtirgichi yo'q. Sinovni ilovada qoldirish uni
 * TIRIK saqlaydi: `npm run test` uni baribir ishga tushiradi. Paketga
 * vitest qo'shish to'g'riroq bo'lardi, lekin bu alohida ish.
 */

/** Qisqa yordamchi — testlar natijaning faqat uch maydonini ishlatadi. */
function render(
  id: string,
  variantId: string,
  baseRenderId: string | null,
  status: LayerRender['status'] = 'ready',
): LayerRender {
  return { id, variantId, baseRenderId, status };
}

describe('layerRank', () => {
  it('kiyinish tartibini beradi — shim eng pastda, kurtka eng tepada', () => {
    expect(layerRank('trousers')).toBeLessThan(layerRank('tshirt'));
    expect(layerRank('tshirt')).toBeLessThan(layerRank('shirt'));
    expect(layerRank('shirt')).toBeLessThan(layerRank('hoodie'));
    expect(layerRank('hoodie')).toBeLessThan(layerRank('jacket'));
  });

  it('noma`lum turkum eng tepaga tushadi', () => {
    expect(layerRank('palto')).toBeGreaterThan(layerRank('jacket'));
  });
});

describe('sortOutfit', () => {
  it('tanlash tartibidan qat`i nazar kiyinish tartibiga soladi', () => {
    const outfit = sortOutfit([
      { category: 'jacket', variantId: 'j' },
      { category: 'trousers', variantId: 'p' },
      { category: 'tshirt', variantId: 't' },
    ]);

    expect(outfit.map((layer) => layer.category)).toEqual(['trousers', 'tshirt', 'jacket']);
  });
});

describe('setLayer', () => {
  it('bir turkumda faqat bitta kiyim qoladi', () => {
    let outfit = setLayer([], 'tshirt', 't1');
    outfit = setLayer(outfit, 'tshirt', 't2');

    expect(outfit).toEqual([{ category: 'tshirt', variantId: 't2' }]);
  });

  it('pastki qatlam almashtirilsa tepadagi RO`YXATDA QOLADI', () => {
    // Foydalanuvchi futbolkani almashtirgani uchun kurtkasini yo'qotmasligi
    // kerak — faqat kurtkaning surati eskiradi
    let outfit = setLayer([], 'tshirt', 't1');
    outfit = setLayer(outfit, 'jacket', 'j1');
    outfit = setLayer(outfit, 'tshirt', 't2');

    expect(outfit).toEqual([
      { category: 'tshirt', variantId: 't2' },
      { category: 'jacket', variantId: 'j1' },
    ]);
  });
});

describe('clearLayer', () => {
  it('faqat o`sha turkumni olib tashlaydi', () => {
    const outfit = clearLayer(
      [
        { category: 'tshirt', variantId: 't1' },
        { category: 'jacket', variantId: 'j1' },
      ],
      'tshirt',
    );

    expect(outfit).toEqual([{ category: 'jacket', variantId: 'j1' }]);
  });
});

describe('resolveOutfit', () => {
  it('zanjirni pastdan tepaga bog`laydi', () => {
    const renders = indexRenders([
      render('r1', 't1', null),
      render('r2', 'j1', 'r1'), // kurtka futbolka ustiga
    ]);

    const resolved = resolveOutfit(
      [
        { category: 'tshirt', variantId: 't1' },
        { category: 'jacket', variantId: 'j1' },
      ],
      renders,
    );

    expect(resolved[0]?.baseRenderId).toBeNull();
    expect(resolved[0]?.render?.id).toBe('r1');
    expect(resolved[1]?.baseRenderId).toBe('r1');
    expect(resolved[1]?.render?.id).toBe('r2');
  });

  it('boshqa asos ustidagi natijani O`ZINIKI deb olmaydi', () => {
    // Kurtka YALANG'OCH gavdaga kiydirilgan; komplektda esa futbolka bor.
    // Bu natija yaramaydi — aks holda futbolka ekrandan yo'qolardi.
    const renders = indexRenders([render('r1', 't1', null), render('r9', 'j1', null)]);

    const resolved = resolveOutfit(
      [
        { category: 'tshirt', variantId: 't1' },
        { category: 'jacket', variantId: 'j1' },
      ],
      renders,
    );

    expect(resolved[1]?.render).toBeUndefined();
  });

  it('asos tayyor bo`lmasa tepadagilar bloklanadi', () => {
    const renders = indexRenders([render('r1', 't1', null, 'processing')]);

    const resolved = resolveOutfit(
      [
        { category: 'tshirt', variantId: 't1' },
        { category: 'jacket', variantId: 'j1' },
      ],
      renders,
    );

    expect(resolved[0]?.blocked).toBe(false);
    expect(resolved[1]?.blocked).toBe(true);
  });
});

describe('baseForCategory', () => {
  const resolved = resolveOutfit(
    [
      { category: 'trousers', variantId: 'p1' },
      { category: 'tshirt', variantId: 't1' },
    ],
    indexRenders([render('rp', 'p1', null), render('rt', 't1', 'rp')]),
  );

  it('o`zidan pastdagi eng tepa natijani beradi', () => {
    expect(baseForCategory(resolved, 'jacket')).toEqual({ baseRenderId: 'rt', ready: true });
  });

  it('o`zi va o`zidan tepadagilarni hisobga olmaydi', () => {
    // Futbolka uchun asos — shim, futbolkaning o'zi emas
    expect(baseForCategory(resolved, 'tshirt')).toEqual({ baseRenderId: 'rp', ready: true });
  });

  it('eng pastki qatlam uchun asos yo`q — asl surat', () => {
    expect(baseForCategory(resolved, 'trousers')).toEqual({ baseRenderId: null, ready: true });
  });

  it('ostidagi qatlam tayyor bo`lmasa `ready: false` — hech narsa so`ralmaydi', () => {
    const pending = resolveOutfit(
      [{ category: 'trousers', variantId: 'p1' }],
      indexRenders([render('rp', 'p1', null, 'processing')]),
    );

    expect(baseForCategory(pending, 'jacket')).toEqual({ baseRenderId: null, ready: false });
  });
});

describe('topReady', () => {
  it('eng TEPA tayyor suratni beradi', () => {
    const resolved = resolveOutfit(
      [
        { category: 'tshirt', variantId: 't1' },
        { category: 'jacket', variantId: 'j1' },
      ],
      indexRenders([render('r1', 't1', null), render('r2', 'j1', 'r1')]),
    );

    expect(topReady(resolved)?.id).toBe('r2');
  });

  it('tepadagisi kelmagan bo`lsa ostidagi ko`rsatiladi — bo`sh ekran emas', () => {
    const resolved = resolveOutfit(
      [
        { category: 'tshirt', variantId: 't1' },
        { category: 'jacket', variantId: 'j1' },
      ],
      indexRenders([render('r1', 't1', null), render('r2', 'j1', 'r1', 'processing')]),
    );

    expect(topReady(resolved)?.id).toBe('r1');
  });

  it('hech narsa tayyor bo`lmasa null', () => {
    expect(
      topReady(resolveOutfit([{ category: 'tshirt', variantId: 't1' }], new Map())),
    ).toBeNull();
  });
});

describe('nextPending', () => {
  it('so`ralmagan eng pastki qatlamni beradi', () => {
    const resolved = resolveOutfit(
      [
        { category: 'tshirt', variantId: 't1' },
        { category: 'jacket', variantId: 'j1' },
      ],
      indexRenders([render('r1', 't1', null)]),
    );

    expect(nextPending(resolved)?.category).toBe('jacket');
    expect(nextPending(resolved)?.baseRenderId).toBe('r1');
  });

  it('ish ketayotgan bo`lsa yangisini so`ramaydi', () => {
    const resolved = resolveOutfit(
      [
        { category: 'tshirt', variantId: 't1' },
        { category: 'jacket', variantId: 'j1' },
      ],
      indexRenders([render('r1', 't1', null, 'processing')]),
    );

    expect(nextPending(resolved)).toBeNull();
  });

  it('hammasi tayyor bo`lsa null', () => {
    const resolved = resolveOutfit(
      [{ category: 'tshirt', variantId: 't1' }],
      indexRenders([render('r1', 't1', null)]),
    );

    expect(nextPending(resolved)).toBeNull();
  });
});
