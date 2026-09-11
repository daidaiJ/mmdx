// Regenerate tests/contact-sheet.jpg — masonry layout of all diagram-type
// artifacts (tallest-first into the shortest of 4 columns, white background,
// hairline borders). Run after tests/run.ts: bun scripts/make-contact-sheet.ts
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.join(import.meta.dir, '..');
const SRC = path.join(ROOT, 'tests', 'artifacts');
const OUT = path.join(ROOT, 'tests', 'contact-sheet.png');

// mermaid types only — extension artifacts live in docs/ separately
const DIAGRAMS = new Set(
  fs.readdirSync(path.join(ROOT, 'tests', 'diagrams'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, '.png')),
);
const files = fs.readdirSync(SRC).filter((f) => DIAGRAMS.has(f)).sort();
if (files.length === 0) throw new Error('no artifacts — run tests first');

const imgs = files.map((f) => PNG.sync.read(fs.readFileSync(path.join(SRC, f))));
// normalize widths, keep aspect
const COLS = 4;
const GAP = 16;
const COL_W = 460;
const scaled = imgs.map((img) => {
  const h = Math.round((img.height / img.width) * COL_W);
  return { img, w: COL_W, h };
});
// tallest-first into shortest column (classic masonry)
scaled.sort((a, b) => b.h - a.h);
const colH = new Array(COLS).fill(GAP);
const placed = scaled.map((it) => {
  const c = colH.indexOf(Math.min(...colH));
  const pos = { col: c, y: colH[c] };
  colH[c] += it.h + GAP;
  return { ...it, pos };
});
const sheetH = Math.max(...colH) + GAP;
const sheetW = COLS * COL_W + (COLS + 1) * GAP;

// scale down 2x artifacts to sheet resolution via nearest-neighbour sampling
const out = new PNG({ width: sheetW, height: sheetH });
// white background
for (let i = 0; i < out.data.length; i += 4) {
  out.data[i] = 255; out.data[i + 1] = 255; out.data[i + 2] = 255; out.data[i + 3] = 255;
}
const hairline = [222, 225, 230];
for (const { img, pos, w, h } of placed) {
  const x0 = GAP + pos.col * (COL_W + GAP);
  const y0 = pos.y;
  for (let y = 0; y < h; y++) {
    const sy = Math.floor((y / h) * img.height);
    for (let x = 0; x < w; x++) {
      const sx = Math.floor((x / w) * img.width);
      const si = (sy * img.width + sx) * 4;
      const di = ((y0 + y) * sheetW + (x0 + x)) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  // hairline border
  for (let x = -1; x <= w; x++) {
    for (const yy of [-1, h]) {
      const px = ((y0 + yy) * sheetW + (x0 + x)) * 4;
      if (x0 + x < 0 || x0 + x >= sheetW || y0 + yy < 0 || y0 + yy >= sheetH) continue;
      hairline.forEach((v, k) => (out.data[px + k] = v));
      out.data[px + 3] = 255;
    }
  }
  for (let y = 0; y < h; y++) {
    for (const xx of [-1, w]) {
      const px = ((y0 + y) * sheetW + (x0 + xx)) * 4;
      if (x0 + xx < 0 || x0 + xx >= sheetW || y0 + y < 0 || y0 + y >= sheetH) continue;
      hairline.forEach((v, k) => (out.data[px + k] = v));
      out.data[px + 3] = 255;
    }
  }
}
fs.writeFileSync(OUT, PNG.sync.write(out));
console.log(`contact sheet: ${files.length} tiles → ${OUT} (${sheetW}x${sheetH})`);
