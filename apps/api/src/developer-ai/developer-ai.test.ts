import {
  developerAiPresignSchema,
  taskFailSchema,
  taskQuerySchema,
  taskResultSchema,
} from '@looksave/validation';
import { describe, expect, it } from 'vitest';

/**
 * Operator navbati sxemalari.
 *
 * Oqimning o'zi (band qilish, poyga, natijani asl joyga yozish, tungi
 * tozalashdan himoya) haqiqiy baza bilan uchidan-uchiga sinalgan —
 * u yerda SQL shartlari muhim va ularni soxta `pool` bilan sinash
 * hech narsani isbotlamaydi. Bu yerda — kirishdagi chegaralar.
 */

describe('navbatni o`qish', () => {
  it('sukut bo`yicha ochiq ishlar', () => {
    expect(taskQuerySchema.parse({})).toEqual({ status: 'open', limit: 50 });
  });

  it('noma`lum holat rad etiladi', () => {
    expect(taskQuerySchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });

  it('chegara 100 dan oshmaydi', () => {
    expect(taskQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
    expect(taskQuerySchema.parse({ limit: '20' }).limit).toBe(20);
  });
});

describe('natija', () => {
  it('faqat manzil qabul qilinadi', () => {
    expect(taskResultSchema.safeParse({ resultUrl: 'avatar/abc.jpg' }).success).toBe(false);
    expect(
      taskResultSchema.safeParse({ resultUrl: 'https://cdn.looksave.app/avatar/a.jpg' }).success,
    ).toBe(true);
  });
});

describe('bajarib bo`lmadi', () => {
  it('sabab bo`sh bo`lmaydi — mijoz uni ko`radi', () => {
    expect(taskFailSchema.safeParse({ reason: '  ' }).success).toBe(false);
    expect(taskFailSchema.parse({ reason: '  Yuz xira  ' }).reason).toBe('Yuz xira');
  });

  it('sabab 300 belgidan oshmaydi', () => {
    expect(taskFailSchema.safeParse({ reason: 'x'.repeat(301) }).success).toBe(false);
  });
});

describe('operator yuklashi', () => {
  const base = { fileName: 'natija.jpg', contentType: 'image/jpeg' };

  it('natija ochiq bucketga (`avatar`) tushadi', () => {
    expect(developerAiPresignSchema.safeParse({ ...base, purpose: 'avatar' }).success).toBe(true);
  });

  /*
   * ⚠️ ENG MUHIMI. `face` va `body` shaxsiy bucketga yozadi —
   * operator mijozning shaxsiy papkasiga fayl tashlay olmasligi kerak.
   */
  it('shaxsiy maqsadlar taqiqlangan', () => {
    for (const purpose of ['face', 'body', 'product', 'brand']) {
      expect(developerAiPresignSchema.safeParse({ ...base, purpose }).success).toBe(false);
    }
  });
});
