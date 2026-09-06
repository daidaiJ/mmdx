// Pixel-level theme coverage census: render every diagram, count exact
// pixel colours, flag anything outside the theme palette above a coverage
// threshold (with blend tolerance for AA / translucent fills) plus a
// blacklist of known garish mermaid defaults at any coverage.
// Run after tests/run.ts: bun scripts/theme-census.ts
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { loadAssets } from '../src/embed.ts';
import { Renderer } from '../src/render.ts';
import { DEFAULT_THEME, PRESETS } from '../src/themes.ts';

const ROOT = path.join(import.meta.dir, '..');

// 1. allowed palette = every hex literal in themes.ts + black/white
const themeSrc = fs.readFileSync(path.join(ROOT, 'src', 'themes.ts'), 'utf8');
const allowed = new Set<string>(['#000000', '#FFFFFF']);
for (const m of themeSrc.matchAll(/#([0-9a-fA-F]{6})\b/g)) allowed.add('#' + m[1].toUpperCase());

// 2. render + census
const dir = path.join(ROOT, 'tests', 'diagrams');
const preset = PRESETS[DEFAULT_THEME as keyof typeof PRESETS];
const config = JSON.parse(JSON.stringify(preset.config)) as Record<string, unknown>;
const r = await Renderer.create(await loadAssets(), { layout: 'elk', scale: 2, width: 1200 });
let flagged = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const m = src.match(/```mermaid\n([\s\S]*?)```/);
  if (!m) continue;
  const base = f.replace('.md', '');
  try {
    const { png } = await r.render(m[1], config, '#FFFFFF', true, undefined, undefined, preset.remap);
    if (!png) continue;
    fs.writeFileSync(path.join(ROOT, '.tmp-audit', `${base}.png`), png);
    const img = PNG.sync.read(Buffer.from(png));
    const { width, height, data } = img;
    const counts = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) continue; // AA fringe
      const key = '#' + [data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0').toUpperCase()).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const total = width * height;
    // accept palette colors AND their blends over white (semi-transparent
    // fills, antialiasing) — a colour passes if some palette entry P with
    // alpha a reproduces it within +-3 per channel
    const pal = [...allowed].map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const isDerived = (hex: string): boolean => {
      const c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
      for (const p of pal) {
        const alphas = [0, 1, 2].map((i) => (255 - c[i]) / (255 - p[i] || 1));
        const a = alphas[0];
        if (a < 0.08 || a > 1) continue;
        if (alphas.every((x) => Math.abs(x - a) < 0.06) &&
            [0, 1, 2].every((i) => Math.abs(Math.round(p[i] * a + 255 * (1 - a)) - c[i]) <= 3)) return true;
      }
      return false;
    };
    // known garish mermaid defaults — flag at ANY coverage (tiny elements
    // like journey actor dots fall below the area threshold)
    const loud = ['#7CFC00', '#00FFFF', '#8FBC8F', '#ECECFF', '#9370DB', '#191970', '#8B008B', '#FF0000', '#00BFFF', '#FF8888'];
    const off = [...counts.entries()]
      .filter(([c, n]) => !allowed.has(c) && !isDerived(c) && (n / total > 0.0015 || (loud.includes(c) && n > total * 0.0001)))
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `${c} ${(n / total * 100).toFixed(2)}%`);
    if (off.length) { flagged++; console.log(base.padEnd(12), 'OFF-PALETTE:', off.join('  ')); }
    else console.log(base.padEnd(12), 'clean');
  } catch (e) {
    console.log(base, 'ERROR', e instanceof Error ? e.message.slice(0, 80) : e);
    flagged++;
  }
}
await r.close();
console.log(flagged === 0 ? 'ALL CLEAN' : `${flagged} diagram(s) need attention`);
