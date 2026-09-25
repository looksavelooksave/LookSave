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

describe('avatar varag`i', () => {
  it('landshaft — varaq, tik yoki kvadrat — emas', () => {
    expect(isAvatarSheet(1536, 1024)).toBe(true);
    expect(isAvatarSheet(1024, 1536)).toBe(false);
    expect(isAvatarSheet(1024, 1024)).toBe(false);
  });

  it('uch teng bo`lakka old · yon · orqa tartibida ajraladi', async () => {
    const parts = await splitAvatarSheet(await sheet(1536, 1024));
    expect(parts).not.toBeNull();

    expect(await centerColor(parts!.front)).toEqual([255, 0, 0]);
    expect(await centerColor(parts!.side)).toEqual([0, 255, 0]);
    expect(await centerColor(parts!.back)).toEqual([0, 0, 255]);

    for (const part of Object.values(parts!)) {
      const meta = await sharp(part).metadata();
      expect([meta.width, meta.height, meta.format, meta.hasAlpha]).toEqual([
        512,
        1024,
        'png',
        true,
      ]);
    }
  });

  it('kenglik 3 ga bo`linmasa ham bo`laklar teng', async () => {
    const parts = await splitAvatarSheet(await sheet(1537, 1024));
    const widths = await Promise.all(
      Object.values(parts!).map(async (part) => (await sharp(part).metadata()).width),
    );
    expect(new Set(widths).size).toBe(1);
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
