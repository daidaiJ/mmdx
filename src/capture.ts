// PNG capture shared by both diagram engines: take a screenshot of an element,
// then crop to its ink so file margins are symmetric regardless of how the
// engine computes its viewBox.

import type { Page } from 'puppeteer-core';
import { PNG } from 'pngjs';

export const PAD_X = 20;
export const PAD_Y = 12;

/** Bounding box of pixels that differ from the corner pixel (the page bg). */
export function inkBBox(png: Buffer): { x0: number; y0: number; x1: number; y1: number } | null {
  const img = PNG.sync.read(Buffer.from(png));
  const { width, height, data } = img;
  const bg = [data[0], data[1], data[2], data[3]];
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (
        Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) +
        Math.abs(data[i + 2] - bg[2]) + Math.abs(data[i + 3] - bg[3]) > 40
      ) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Serialize screenshot rasterization across all pooled pages. */
let gate: Promise<unknown> = Promise.resolve();
export function screenshotGate<T>(fn: () => Promise<T>): Promise<T> {
  const run = gate.then(fn, fn);
  gate = run.catch(() => { /* keep the chain alive */ });
  return run;
}

/**
 * Screenshot `#id` at `scale`, cropped to its ink with symmetric margins.
 * The caller sizes the element's viewBox; this function only rasterizes.
 * `fullBleed` skips the ink crop for themes that paint their own backdrop:
 * there the whole box is ink, so cropping to it would follow the backdrop
 * instead of the diagram and leave the margins asymmetric.
 */
export async function captureElement(
  page: Page,
  id: string,
  background: string,
  scale: number,
  fullBleed = false,
): Promise<Buffer> {
  return screenshotGate(async () => {
    const transparent = background === 'transparent';
    await page.evaluate(([elId, bg]) => {
      const el = document.getElementById(elId)!;
      // Normalize the page box, not just the colour: a page that has not been
      // through a reset still carries the browser's 8px body margin, which
      // offsets the clip. Backdrop themes crop to the element box, so that
      // offset lands in the PNG and shifts their margins.
      document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;background:transparent';
      document.body.style.background = bg;
    }, [id, transparent ? 'transparent' : background] as [string, string]);

    const size = await page.evaluate((elId) => {
      const r = document.getElementById(elId)!.getBoundingClientRect();
      return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
    }, id);
    const cur = page.viewport();
    const vw = Math.min(16_000, Math.max(320, size.w));
    const vh = Math.min(16_000, Math.max(320, size.h));
    if (cur && (cur.width !== vw || cur.height !== vh)) {
      await page.setViewport({ width: vw, height: vh, deviceScaleFactor: scale });
    }
    await page.bringToFront();
    const first = (await page.screenshot({
      clip: { x: 0, y: 0, width: size.w, height: size.h },
      omitBackground: transparent,
    })) as Buffer;

    // geometric bounds miss marker arrowheads and glyph overshoot; a second
    // capture clipped to the actual ink gives pixel-exact, symmetric margins
    const ink = fullBleed ? null : inkBBox(first);
    if (!ink) return first;
    const mx = Math.max(1, PAD_X * scale - 2);
    const my = Math.max(1, PAD_Y * scale - 2);
    const clip = {
      x: Math.max(0, (ink.x0 - mx) / scale),
      y: Math.max(0, (ink.y0 - my) / scale),
      width: (ink.x1 - ink.x0 + 1 + 2 * mx) / scale,
      height: (ink.y1 - ink.y0 + 1 + 2 * my) / scale,
    };
    return (await page.screenshot({ clip, omitBackground: transparent })) as Buffer;
  });
}
