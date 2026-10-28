import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@imgly/background-removal-node', () => ({ removeBackground: vi.fn() }));
vi.mock('../integrations/r2', () => ({ uploadObject: vi.fn(async () => 'https://cdn/x.png') }));

import { removeBackground } from '@imgly/background-removal-node';

import { makeCutout } from './cutout';

async function serve(buffer: Buffer): Promise<void> {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(buffer, { headers: { 'content-type': 'image/png' } })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('kesim — shaffof surat modelsiz o`tadi', () => {
  it('fon allaqachon shaffof — model chaqirilmaydi, asl havola qaytadi', async () => {
    const figure = await sharp({
      create: { width: 40, height: 80, channels: 4, background: '#123' },
    })
      .png()
      .toBuffer();
    const png = await sharp({
      create: { width: 100, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: figure, left: 30, top: 60 }])
      .png()
      .toBuffer();
    await serve(png);
    expect(await makeCutout('https://cdn/a.png', 'avatar')).toBe('https://cdn/a.png');
    expect(removeBackground).not.toHaveBeenCalled();
  });

  it('oq fonli surat — model ishlaydi', async () => {
    const png = await sharp({
      create: { width: 100, height: 200, channels: 4, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await serve(png);
    vi.mocked(removeBackground).mockResolvedValue(new Blob([png], { type: 'image/png' }));
    expect(await makeCutout('https://cdn/b.png', 'avatar')).toBe('https://cdn/x.png');
    expect(removeBackground).toHaveBeenCalledTimes(1);
  });
});
