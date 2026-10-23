// Render tests/diagrams with each engine and collage them into
// tests/contact-sheet-{pele,mermaid}.png (same 4-column grid so the two
// sheets line up). tests/contact-sheet.png is a copy of the Pele sheet
// (README default / old links). Run: bun scripts/make-contact-sheet.ts
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { loadAssets } from '../src/embed.ts';
import { Renderer, type Engine } from '../src/render.ts';
import { DEFAULT_THEME, PRESETS } from '../src/themes.ts';

const ROOT = path.join(import.meta.dir, '..');
const DIAGRAM_DIR = path.join(ROOT, 'tests', 'diagrams');
const OUT_DIR = path.join(ROOT, 'tests');

const COLS = 4;
const GAP = 16;
const COL_W = 460;
const HAIRLINE = [222, 225, 230];

const files = fs.readdirSync(DIAGRAM_DIR).filter((f) => f.endsWith('.md')).sort();
if (files.length === 0) throw new Error('no tests/diagrams/*.md');

function source(file: string): string {
  const src = fs.readFileSync(path.join(DIAGRAM_DIR, file), 'utf8');
  const m = src.match(/```mermaid\n([\s\S]*?)```/);
  if (!m) throw new Error(`${file}: no mermaid fence`);
  return m[1];
}

function scaleNearest(img: PNG, w: number, h: number): PNG {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.height - 1, Math.floor((y / h) * img.height));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.floor((x / w) * img.width));
      const si = (sy * img.width + sx) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  return out;
}

function collage(pngs: PNG[]): PNG {
  const tiles = pngs.map((img) => {
    const h = Math.max(1, Math.round((img.height / img.width) * COL_W));
    return scaleNearest(img, COL_W, h);
  });
  // tallest-first into the shortest column (same packing as the old sheet)
  const order = tiles.map((t, i) => i).sort((a, b) => tiles[b].height - tiles[a].height);
  const colH = new Array(COLS).fill(GAP);
  const placed = order.map((i) => {
    const c = colH.indexOf(Math.min(...colH));
    const y = colH[c];
    colH[c] += tiles[i].height + GAP;
    return { tile: tiles[i], col: c, y };
  });
  const sheetW = COLS * COL_W + (COLS + 1) * GAP;
  const sheetH = Math.max(...colH) + GAP;
  const out = new PNG({ width: sheetW, height: sheetH });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255;
    out.data[i + 1] = 255;
    out.data[i + 2] = 255;
    out.data[i + 3] = 255;
  }
  const put = (px: number, rgb: number[]): void => {
    out.data[px] = rgb[0];
    out.data[px + 1] = rgb[1];
    out.data[px + 2] = rgb[2];
    out.data[px + 3] = 255;
  };
  for (const { tile, col, y } of placed) {
    const x0 = GAP + col * (COL_W + GAP);
    const y0 = y;
    for (let py = 0; py < tile.height; py++) {
      for (let px = 0; px < tile.width; px++) {
        const si = (py * tile.width + px) * 4;
        const di = ((y0 + py) * sheetW + (x0 + px)) * 4;
        out.data[di] = tile.data[si];
        out.data[di + 1] = tile.data[si + 1];
        out.data[di + 2] = tile.data[si + 2];
        out.data[di + 3] = 255;
      }
    }
    const w = tile.width;
    const h = tile.height;
    for (let x = -1; x <= w; x++) {
      for (const yy of [-1, h]) {
        const xx = x0 + x;
        const yy2 = y0 + yy;
        if (xx < 0 || xx >= sheetW || yy2 < 0 || yy2 >= sheetH) continue;
        put((yy2 * sheetW + xx) * 4, HAIRLINE);
      }
    }
    for (let py = 0; py < h; py++) {
      for (const xx of [-1, w]) {
        const xx2 = x0 + xx;
        const yy = y0 + py;
        if (xx2 < 0 || xx2 >= sheetW || yy < 0 || yy >= sheetH) continue;
        put((yy * sheetW + xx2) * 4, HAIRLINE);
      }
    }
  }
  return out;
}

async function renderEngine(engine: Engine): Promise<PNG[]> {
  const preset = PRESETS[DEFAULT_THEME];
  const config = JSON.parse(JSON.stringify(preset.config)) as Record<string, unknown>;
  if (engine === 'mermaid') config.layoutAlgorithm = 'elk';
  const r = await Renderer.create(await loadAssets(), {
    layout: 'elk',
    engine,
    scale: 2,
    width: 1200,
  });
  const pngs: PNG[] = [];
  try {
    for (const f of files) {
      const { png } = await r.render(source(f), config, '#FFFFFF', true, 'top', '', preset.remap);
      if (!png) throw new Error(`${engine}/${f}: no png`);
      pngs.push(PNG.sync.read(Buffer.from(png)));
      process.stdout.write(`  ${engine} ${f.replace(/\.md$/, '')}\n`);
    }
  } finally {
    await r.close();
  }
  return pngs;
}

const engines: Engine[] = ['pele', 'mermaid'];
for (const engine of engines) {
  process.stdout.write(`engine ${engine}\n`);
  const sheet = collage(await renderEngine(engine));
  const dest = path.join(OUT_DIR, `contact-sheet-${engine}.png`);
  fs.writeFileSync(dest, PNG.sync.write(sheet));
  process.stdout.write(`  → ${dest} (${sheet.width}x${sheet.height})\n`);
  if (engine === 'pele') {
    const alias = path.join(OUT_DIR, 'contact-sheet.png');
    fs.copyFileSync(dest, alias);
    process.stdout.write(`  → ${alias} (alias)\n`);
  }
}
