import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { buildAvatarPrompt, buildAvatarSheetPrompt } from './avatar-prompt';
import { isAvatarSheet, splitAvatarSheet } from './avatar-sheet';

/** Uch rangli sinov varag'i: chap — qizil, o'rta — yashil, o'ng — ko'k. */
async function sheet(width: number, height: number): Promise<Buffer> {
  const third = Math.floor(width / 3);
  const block = (r: number, g: number, b: number, w: number) =>
    sharp({ create: { width: w, height, channels: 4, background: { r, g, b, alpha: 1 } } })
      .png()
      .toBuffer();

  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: await block(255, 0, 0, third), left: 0, top: 0 },
      { input: await block(0, 255, 0, third), left: third, top: 0 },
      { input: await block(0, 0, 255, width - third * 2), left: third * 2, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function centerColor(input: Buffer): Promise<[number, number, number]> {
  const { data, info } = await sharp(input).raw().toBuffer({ resolveWithObject: true });
  const offset =
    (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
  return [data[offset]!, data[offset + 1]!, data[offset + 2]!];
}

/** WebP yo'qotishli — rang aniq emas, ustun kanalni tekshiramiz. */
function dominant([r, g, b]: [number, number, number]): 'red' | 'green' | 'blue' {
  if (r >= g && r >= b) return 'red';
  return g >= b ? 'green' : 'blue';
}

describe('avatar varag`i', () => {
  it('landshaft — varaq, tik yoki kvadrat — emas', () => {
    expect(isAvatarSheet(1536, 1024)).toBe(true);
    expect(isAvatarSheet(1024, 1536)).toBe(false);
    expect(isAvatarSheet(1024, 1024)).toBe(false);
  });

  it('uch teng bo`lakka old · yon · orqa tartibida ajraladi', async () => {
    const parts = await splitAvatarSheet(await sheet(1536, 1024));
    expect(parts).not.toBeNull();

    expect(dominant(await centerColor(parts!.front))).toBe('red');
    expect(dominant(await centerColor(parts!.side))).toBe('green');
    expect(dominant(await centerColor(parts!.back))).toBe('blue');

    for (const part of Object.values(parts!)) {
      const meta = await sharp(part).metadata();
      expect([meta.width, meta.height, meta.format]).toEqual([512, 1024, 'webp']);
    }
  });

  it('shaffof bo`shliq bo`yicha kesadi — figura markazdan siljigan bo`lsa ham', async () => {
    // Shaffof fon; figuralar teng bo'lmagan joyda: chap, o'ng-o'rta, o'ng
    const block = (r: number, g: number, b: number, w: number, h: number) =>
      sharp({ create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 1 } } })
        .png()
        .toBuffer();
    const sheet = await sharp({
      create: { width: 900, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        { input: await block(255, 0, 0, 100, 260), left: 20, top: 20 },
        { input: await block(0, 255, 0, 170, 260), left: 350, top: 20 },
        { input: await block(0, 0, 255, 120, 260), left: 700, top: 20 },
      ])
      .png()
      .toBuffer();

    const parts = await splitAvatarSheet(sheet);
    expect(parts).not.toBeNull();
    expect(dominant(await centerColor(parts!.front))).toBe('red');
    expect(dominant(await centerColor(parts!.side))).toBe('green');
    expect(dominant(await centerColor(parts!.back))).toBe('blue');

    // ⚠️ Shaffof fon WebP'da SAQLANADI — orqa fon bo'lmasligi shart
    for (const part of Object.values(parts!)) {
      const meta = await sharp(part).metadata();
      expect([meta.format, meta.hasAlpha]).toEqual(['webp', true]);
    }
  });

  it('kenglik 3 ga bo`linmasa ham bo`laklar teng', async () => {
    const parts = await splitAvatarSheet(await sheet(1537, 1024));
    const widths = await Promise.all(
      Object.values(parts!).map(async (part) => (await sharp(part).metadata()).width ?? 0),
    );
    // Qoldiq piksel oxirgi bo'lakka qo'shiladi — farq ko'pi bilan 1 px
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
  });

  it('bitta pozali tik rasm ajratilmaydi — eski oqim o`zgarmaydi', async () => {
    const tall = await sharp({
      create: { width: 1024, height: 1536, channels: 4, background: '#888' },
    })
      .png()
      .toBuffer();
    expect(await splitAvatarSheet(tall)).toBeNull();
  });
});

describe('varaq prompti', () => {
  const prompt = buildAvatarSheetPrompt('male', { height: 180, weight: 80 });

  it('uch panel chapdan o`ngga: old, yon, orqa', () => {
    const front = prompt.indexOf('PANEL 1 (left third) — FRONT');
    const side = prompt.indexOf('PANEL 2 (middle third) — SIDE');
    const back = prompt.indexOf('PANEL 3 (right third) — BACK');
    expect(front).toBeGreaterThan(-1);
    expect(side).toBeGreaterThan(front);
    expect(back).toBeGreaterThan(side);
  });

  it('old ko`rinish chapga burilgan, orqada yuz ko`rinmaydi', () => {
    expect(prompt).toMatch(/turned about 40 degrees to the LEFT/);
    expect(prompt).toMatch(/face is NOT visible/);
  });

  it('fon har doim shaffof PNG', () => {
    expect(prompt).toMatch(/TRANSPARENT PNG with an alpha channel/);
    expect(prompt).toMatch(/no divider lines/);
  });

  it('aynan uch figura va kesish uchun chekka talab qilinadi', () => {
    expect(prompt).toMatch(/EXACTLY THREE FIGURES/);
    expect(prompt).toMatch(/at least 8% of the image width/);
    expect(prompt).toMatch(/85–90% of the image height/);
  });

  it('yon va orqa matni avtomatik rejim bilan bir xil', () => {
    expect(prompt).toContain(
      buildAvatarPrompt('male', { height: 180, weight: 80 }, 'side')
        .split(' The entire body')[0]!
        .split('build. ')[1]!,
    );
  });

  it('yuz qat`iy qulflangan — har qism sanaladi, har panelda bir xil', () => {
    expect(prompt).toMatch(/FACE IDENTITY \(the most important rule\)/);
    expect(prompt).toMatch(/nose shape and size/);
    expect(prompt).toMatch(/Do NOT beautify/);
    expect(prompt).toMatch(/SAME identical face appears in every panel/);
  });

  it('bo`y va gavda tavsifi bor', () => {
    expect(prompt).toContain('180 cm tall');
  });
});

describe('razmer tanlovi', () => {
  it('varaq promptida tanlangan razmer bor', () => {
    const prompt = buildAvatarSheetPrompt('male', {
      height: 183,
      weight: 80,
      topSize: 'L',
      bottomSize: 'M',
    });
    expect(prompt).toContain('wears size L tops and size M trousers');
  });
});
