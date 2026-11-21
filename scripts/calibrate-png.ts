// Calibrate the palette-PNG gates against the fixed eight-theme corpus.
// Renders one 2x PNG per theme and surface, measures fixed palette sizes with
// PSNR and p99 edge Oklab ΔE, then prints the gates used by png-quant.ts.
// Run: bun scripts/calibrate-png.ts  (about 2–3 minutes; output in review/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { blockPage, htmlKindToInner } from '../src/blocks.ts';
import { oklab, parseColor, type Rgb } from '../src/color.ts';
import { loadAssets } from '../src/embed.ts';
import { quantizePng, type PngQuality } from '../src/png-quant.ts';
import { Renderer } from '../src/render.ts';
import { accentTint, type Tokens } from '../src/tokens.ts';
import { getTheme, PRESETS } from '../src/themes.ts';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'review', 'png-calibration');
const SIZES = [128, 160, 192, 224, 256];
const SOURCES = ['flowchart', 'state', 'class', 'er', 'pie', 'xychart', 'mindmap', 'sequence'];
const TARGET_EDGE_DE = 0.035;
const GLOBAL_GATE = 53.0;

fs.mkdirSync(path.join(OUT, 'off'), { recursive: true });

const tokensFor = (spec: ReturnType<typeof getTheme>): Tokens => ({
  paper: spec.vars.bg,
  ink: spec.vars.fg,
  muted: spec.vars.muted,
  rule: spec.vars.border,
  accent: spec.vars.accent,
  accentTint: accentTint(spec.vars.accent, spec.vars.bg),
  paper2: spec.vars.surfaceAlt,
});

const mermaid = new Map<string, string>();
for (const name of SOURCES) {
  const raw = fs.readFileSync(path.join(ROOT, 'tests', 'diagrams', `${name}.md`), 'utf8');
  const m = raw.match(/```mermaid\r?\n([\s\S]*?)```/);
  if (m) mermaid.set(name, m[1]);
}
const tableRaw = fs.readFileSync(path.join(ROOT, 'tests', 'edge', 'table.md'), 'utf8');
const table = tableRaw.match(/```table\r?\n([\s\S]*?)```/)?.[1] ?? '';

interface Sample {
  theme: string;
  source: string;
  png: Buffer;
  width: number;
  height: number;
  rgb: PNG;
  edges: number[];
  globalStride: number;
}

const samples: Sample[] = [];
const renderer = await Renderer.create(await loadAssets(), { scale: 2, width: 1200, pngColors: 'off' });
for (const theme of Object.keys(PRESETS)) {
  const spec = getTheme(theme);
  const preset = PRESETS[theme as keyof typeof PRESETS];
  const add = (source: string, png: Buffer): void => {
    const decoded = PNG.sync.read(Buffer.from(png));
    fs.writeFileSync(path.join(OUT, 'off', `${theme}-${source}.png`), png);
    const { width, height, data } = decoded;
    const bg = parseColor(spec.background);
    const n = width * height;
    const luma = new Float32Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const a = data[p + 3] / 255;
      luma[i] = 0.2126 * (data[p] * a + bg[0] * (1 - a)) +
        0.7152 * (data[p + 1] * a + bg[1] * (1 - a)) +
        0.0722 * (data[p + 2] * a + bg[2] * (1 - a));
    }
    const mask = new Uint8Array(n);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (x > 0 && Math.abs(luma[i] - luma[i - 1]) > 8) {
          mask[i] = 1;
          mask[i - 1] = 1;
        }
        if (y > 0 && Math.abs(luma[i] - luma[i - width]) > 8) {
          mask[i] = 1;
          mask[i - width] = 1;
        }
      }
    }
    const edges: number[] = [];
    for (let i = 0; i < n; i++) if (mask[i]) edges.push(i);
    samples.push({
      theme, source, png, width, height, rgb: decoded, edges,
      globalStride: Math.max(1, Math.floor(Math.sqrt(n / 20000))),
    });
    console.log('rendered', theme, source, png.length);
  };
  for (const [source, code] of mermaid) {
    try {
      const { png } = await renderer.render({
        code, background: spec.background, needPng: true, scale: 2, width: 1200,
        theme: spec, mermaidConfig: preset.config as Record<string, unknown>,
        fontSize: 15, padding: 0, svgThemeable: false, titlePos: 'top', titleText: '',
        remap: preset.remap,
      });
      if (!png) throw new Error('no png');
      add(source, png);
    } catch (e) {
      console.log('ERR', theme, source, e instanceof Error ? e.message.slice(0, 80) : e);
    }
  }
  try {
    const page = blockPage(htmlKindToInner('table', table), {
      blockCss: spec.blockCss,
      tokens: tokensFor(spec),
    });
    add('table', await renderer.renderHtml(page, spec.background));
  } catch (e) {
    console.log('ERR', theme, 'table', e instanceof Error ? e.message.slice(0, 80) : e);
  }
}
await renderer.close();
if (!samples.length) throw new Error('calibration corpus failed to render');

const pct = (xs: number[], p: number): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const delta = (a: Rgb, b: Rgb): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const composite = (data: Uint8Array, p: number, bg: Rgb): Rgb => {
  const a = data[p + 3] / 255;
  return [
    data[p] * a + bg[0] * (1 - a),
    data[p + 1] * a + bg[1] * (1 - a),
    data[p + 2] * a + bg[2] * (1 - a),
  ];
};

interface Fixed {
  theme: string;
  source: string;
  size: number;
  bytes: number;
  originalBytes: number;
  psnr: number;
  edgePsnr: number;
  edgeDe99: number;
}
const fixed: Fixed[] = [];
for (const sample of samples) {
  const spec = getTheme(sample.theme);
  const bg = parseColor(spec.background);
  for (const size of SIZES) {
    const q = quantizePng(sample.png, {
      mode: size, theme: sample.theme, background: spec.background, quality: 'balanced',
    });
    if (!q) continue;
    const out = PNG.sync.read(q.png);
    const edgeStep = Math.max(1, Math.floor(sample.edges.length / 50000));
    const edgeDe: number[] = [];
    for (let i = 0; i < sample.edges.length; i += edgeStep) {
      const p = 4 * sample.edges[i];
      edgeDe.push(delta(
        oklab(composite(sample.rgb.data, p, bg)),
        oklab(composite(out.data, p, bg)),
      ));
    }
    fixed.push({
      theme: sample.theme, source: sample.source, size,
      bytes: q.png.length, originalBytes: sample.png.length,
      psnr: q.psnr, edgePsnr: q.edgePsnr, edgeDe99: pct(edgeDe, 99),
    });
  }
}

const themes = Object.keys(PRESETS);
const recommended = new Map<string, { size: number; edgeDe99: number; edgePsnr: number }>();
for (const theme of themes) {
  const size = SIZES.find((s) => {
    const rs = fixed.filter((r) => r.theme === theme && r.size === s);
    return rs.length > 0 && rs.every((r) => r.edgeDe99 <= TARGET_EDGE_DE);
  }) ?? SIZES.at(-1)!;
  const rs = fixed.filter((r) => r.theme === theme && r.size === size);
  recommended.set(theme, {
    size,
    edgeDe99: Math.max(...rs.map((r) => r.edgeDe99)),
    edgePsnr: Math.min(...rs.map((r) => r.edgePsnr)),
  });
}

const lines: string[] = [];
lines.push('# PNG palette calibration', '');
lines.push(`Generated ${new Date().toISOString().slice(0, 10)} from ${samples.length} 2x PNGs ` +
  `(8 themes × flowchart / state / class / ER / pie / xychart / mindmap / sequence / table).`, '');
lines.push(`Standard: p99 edge OKLab ΔE ≤ ${TARGET_EDGE_DE.toFixed(3)}; global PSNR ≥ ${GLOBAL_GATE.toFixed(1)} dB (fast: 51.5 dB).`, '');
lines.push('## Worst p99 edge ΔE / min edge PSNR / min global PSNR', '');
lines.push(`| Theme | ${SIZES.join(' | ')} |`);
lines.push(`| --- | ${SIZES.map(() => '---').join(' | ')} |`);
for (const theme of themes) {
  const cells = SIZES.map((size) => {
    const rs = fixed.filter((r) => r.theme === theme && r.size === size);
    if (!rs.length) return '—';
    return `${Math.max(...rs.map((r) => r.edgeDe99)).toFixed(3)} / ${Math.min(...rs.map((r) => r.edgePsnr)).toFixed(1)} / ${Math.min(...rs.map((r) => r.psnr)).toFixed(1)}`;
  });
  lines.push(`| \`${theme}\` | ${cells.join(' | ')} |`);
}
lines.push('', '## Suggested gates', '');
lines.push('| Theme | Palette floor | Edge gate | Measured p99 ΔE | Measured edge PSNR |');
lines.push('| --- | --- | --- | --- | --- |');
for (const theme of themes) {
  const r = recommended.get(theme)!;
  const edgeGate = Math.floor((r.edgePsnr - 0.3) * 10) / 10;
  lines.push(`| \`${theme}\` | ${r.size} | ${edgeGate.toFixed(1)} | ${r.edgeDe99.toFixed(3)} | ${r.edgePsnr.toFixed(1)} |`);
}
lines.push('', '## Auto tiers', '');
lines.push('| Tier | Aggregate size | Chosen sizes | Worst p99 ΔE | Median / p95 time |');
lines.push('| --- | --- | --- | --- | --- |');
const tiers: PngQuality[] = ['fast', 'balanced', 'best'];
for (const tier of tiers) {
  const rs = samples.map((sample) => {
    const spec = getTheme(sample.theme);
    const t0 = performance.now();
    const q = quantizePng(sample.png, {
      mode: 'auto', theme: sample.theme, background: spec.background, quality: tier,
    });
    const ms = performance.now() - t0;
    const orow = q && fixed.find((r) => r.theme === sample.theme && r.source === sample.source && r.size === q.colors);
    return { tier, bytes: q?.png.length ?? sample.png.length, original: sample.png.length, colors: q?.colors ?? 0, ms, de: orow?.edgeDe99 ?? 0 };
  });
  const bytes = rs.reduce((s, r) => s + r.bytes, 0);
  const original = rs.reduce((s, r) => s + r.original, 0);
  const sizes = [...new Set(rs.map((r) => r.colors))].filter(Boolean).sort((a, b) => a - b);
  lines.push(`| ${tier} | ${(100 * bytes / original).toFixed(1)}% | ${sizes.join(', ')} | ${Math.max(...rs.map((r) => r.de)).toFixed(3)} | ${pct(rs.map((r) => r.ms), 50).toFixed(0)} / ${pct(rs.map((r) => r.ms), 95).toFixed(0)} ms |`);
}
lines.push('', 'Generated by `bun scripts/calibrate-png.ts`; images are in `review/png-calibration/off/`.', '');

const report = lines.join('\n');
fs.writeFileSync(path.join(OUT, 'report.md'), report);
fs.writeFileSync(path.join(OUT, 'fixed.json'), JSON.stringify(fixed, null, 2));
console.log(`\n${report}\nreport: ${path.join(OUT, 'report.md')}`);
