import { matchSize, measurementsSchema, normalizeSize, recommendSize } from '@looksave/validation';
import { describe, expect, it } from 'vitest';

describe('razmerlar', () => {
  it('tanlangan razmer sm taxminidan ustun', () => {
    expect(recommendSize('top', { topSize: 'L', chest: 80 })).toBe('L');
    expect(recommendSize('bottom', { bottomSize: 'XL', waist: 60 })).toBe('XL');
  });

  it('tanlanmagan bo`lsa eski sm qiymatidan hisoblanadi', () => {
    expect(recommendSize('top', { chest: 100 })).toBe('M');
  });

  it('oyoq kiyimi — «EU» prefiksisiz, omborga mos', () => {
    expect(recommendSize('feet', { shoeSize: 42 })).toBe('42');
  });

  it('ombordagi yozuvlar normallashtiriladi', () => {
    expect(normalizeSize(' m ')).toBe('M');
    expect(normalizeSize('EU 42')).toBe('42');
    expect(normalizeSize('XXXL')).toBe('3XL');
    expect(matchSize(['s', 'm', 'l'], 'M')).toBe('m');
    expect(matchSize(['S'], 'XL')).toBeNull();
  });

  it('sxema faqat ro`yxatdagi razmerni qabul qiladi', () => {
    expect(measurementsSchema.safeParse({ topSize: 'L' }).success).toBe(true);
    expect(measurementsSchema.safeParse({ topSize: 'huge' }).success).toBe(false);
  });
});
