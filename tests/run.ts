// mmdx acceptance test matrix. Run: bun run tests/run.ts
//
// Three layers:
//  1. library-level screening — all diagram fixtures rendered through ONE
//     browser session, then pixel-analyzed (margins symmetric? content
//     present? not blank?) so visual review is only needed for flagged items
//  2. CLI-level behavior — exit codes, naming, stdin, error paths
//  3. profile probes — Renderer.profile budgets catch page-reset / init
//     hotspots (e.g. re-injecting mermaid after every HTML block)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { blockPage, htmlKindToInner, type BlockKind } from '../src/blocks.ts';
import { chartToMermaid, parseChart } from '../src/chart.ts';
import { loadAssets } from '../src/embed.ts';
import { scanLimits } from '../src/limits.ts';
import { Renderer } from '../src/render.ts';
import { applySlideDensity, DEFAULT_THEME, PRESETS } from '../src/themes.ts';
import { applyBrand, normalizeHex } from '../src/tokens.ts';

const ROOT = path.dirname(import.meta.dir);
const CLI = path.join(ROOT, 'src', 'cli.ts');
const KEEP = path.join(ROOT, 'tests', 'artifacts');
try {
  fs.rmSync(KEEP, { recursive: true, force: true });
} catch {
  // Windows: a stale browser handle can keep the dir busy; stale files are
  // overwritten per-case below, so just continue with the existing dir
}
fs.mkdirSync(KEEP, { recursive: true });

interface CaseResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CaseResult[] = [];
const record = (name: string, ok: boolean, detail: string): void => {
  results.push({ name, ok, detail });
};

// ---------------------------------------------------------------------------
// 0. pure unit checks (no browser)
// ---------------------------------------------------------------------------

{
  const pie = `pie showData\n    "A" : 1\n    "B" : 2\n    "C" : 3\n    "D" : 4\n    "E" : 5\n    "F" : 6\n    "G" : 7`;
  const hits = scanLimits(pie);
  record('unit/pie-over-warn', hits.some((h) => h.code === 'pie-sectors'), hits.map((h) => h.code).join(',') || 'none');
  const okPie = scanLimits(fs.readFileSync(path.join(ROOT, 'tests', 'diagrams', 'pie.md'), 'utf8').match(/```mermaid\n([\s\S]*?)```/)![1]);
  record('unit/pie-in-range', okPie.length === 0, okPie.map((h) => h.message).join('; ') || 'ok');
  try {
    parseChart('type: pie\nA,1\nB,2\nC,3\nD,4\nE,5\nF,6\nG,7');
    record('unit/chart-over-throws', false, 'did not throw');
  } catch (e) {
    record('unit/chart-over-throws', /mcp-server-chart/.test((e as Error).message), (e as Error).message.slice(0, 80));
  }
  const spec = parseChart('type: bar\n华东, 120\n华南, 86');
  record('unit/chart-bar', spec.categories.length === 2 && /y-axis 0 -->/.test(chartToMermaid(spec)), spec.type);
  record('unit/brand-hex', normalizeHex('4098fc') === '#4098FC', String(normalizeHex('4098fc')));
  {
    const c = JSON.parse(JSON.stringify(PRESETS.tech.config)) as Record<string, unknown>;
    applySlideDensity(c);
    const css = String(c.themeCSS ?? '');
    record(
      'unit/slide-density',
      c.fontSize === 18 && /stroke-width: 2px/.test(css),
      `fontSize=${String(c.fontSize)} css=${/stroke-width: 2px/.test(css)}`,
    );
  }
  record('unit/brand-bad', normalizeHex('nope') === null, 'null');
  const pale = applyBrand('#EEEEEE');
  record('unit/brand-contrast-warn', !!pale.warning, pale.warning || 'no warn');
  try {
    htmlKindToInner('vs', '构建, 42, 11, 3');
    record('unit/vs-cols', false, 'did not throw');
  } catch (e) {
    record('unit/vs-cols', /left, right/.test((e as Error).message), (e as Error).message.slice(0, 80));
  }
  try {
    htmlKindToInner('heatmap', '2026-01-01, 1\n2026-06-01, 1');
    record('unit/heatmap-span', false, 'did not throw');
  } catch (e) {
    record('unit/heatmap-span', /max 12/.test((e as Error).message), (e as Error).message.slice(0, 80));
  }
  try {
    htmlKindToInner('heatmap', '09-01, 2');
    record('unit/heatmap-date', false, 'did not throw');
  } catch (e) {
    record('unit/heatmap-date', /YYYY-MM-DD/.test((e as Error).message), (e as Error).message.slice(0, 80));
  }
  {
    const html = htmlKindToInner('heatmap', '2026-09-01, 2\n2026-09-08, 12');
    record('unit/heatmap-zh-range', /2026年9月1日/.test(html) && /hm-n2/.test(html), html.slice(0, 80));
  }
  try {
    htmlKindToInner('gauge', 'A, 10\nB, 20\nC, 30\nD, 40\nE, 50');
    record('unit/gauge-over', false, 'did not throw');
  } catch (e) {
    record('unit/gauge-over', /at most 4/.test((e as Error).message), (e as Error).message.slice(0, 80));
  }
}

// ---------------------------------------------------------------------------
// 1. library-level screening
// ---------------------------------------------------------------------------

const assets = await loadAssets();
const renderer = await Renderer.create(assets, { layout: 'elk', scale: 2, width: 1200, profile: true });
const tech = PRESETS[DEFAULT_THEME].config;

interface Analysis {
  w: number;
  h: number;
  margins: { l: number; r: number; t: number; b: number };
  ink: number;
}

function analyze(file: string): Analysis {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = png;
  const bgIdx = 0;
  const bg = [data[bgIdx], data[bgIdx + 1], data[bgIdx + 2], data[bgIdx + 3]];
  let minX = width, minY = height, maxX = -1, maxY = -1, ink = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const diff =
        Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) +
        Math.abs(data[i + 2] - bg[2]) + Math.abs(data[i + 3] - bg[3]);
      if (diff > 40) {
        ink++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return {
    w: width,
    h: height,
    margins: { l: minX, r: width - 1 - maxX, t: minY, b: height - 1 - maxY },
    ink: ink / (width * height),
  };
}

const diagramFiles = fs.readdirSync(path.join(ROOT, 'tests', 'diagrams')).filter((f) => f.endsWith('.md'));
const source = (f: string): string =>
  /\S/.test(f) ? fs.readFileSync(path.join(ROOT, 'tests', 'diagrams', f), 'utf8').match(/```mermaid\n([\s\S]*?)```/)![1] : '';

for (const f of diagramFiles) {
  const name = f.replace(/\.md$/, '');
  const file = path.join(KEEP, `${name}.png`);
  try {
    const { png } = await renderer.render(source(f), tech as Record<string, unknown>, '#FFFFFF', true);
    fs.writeFileSync(file, png);
    const a = analyze(file);
    const lr = Math.abs(a.margins.l - a.margins.r);
    const tb = Math.abs(a.margins.t - a.margins.b);
    const problems: string[] = [];
    if (lr > 16) problems.push(`L/R margins ${a.margins.l}/${a.margins.r}`);
    if (tb > 16) problems.push(`T/B margins ${a.margins.t}/${a.margins.b}`);
    if (a.ink < 0.005) problems.push('near-blank');
    if (a.ink > 0.85 && name !== 'treemap') problems.push('overfull');
    record(`screen/${name}`, problems.length === 0, problems.join('; ') || `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}% margins L${a.margins.l} R${a.margins.r} T${a.margins.t} B${a.margins.b}`);
  } catch (e) {
    record(`screen/${name}`, false, (e as Error).message.slice(0, 120));
  }
}

const fenceSrc = (file: string, lang: string): string =>
  fs.readFileSync(path.join(ROOT, 'tests', 'edge', file), 'utf8').match(new RegExp('```' + lang + '\\r?\\n([\\s\\S]*?)```'))![1];

async function screenBlock(name: string, lang: BlockKind, file: string, lrMax = 8): Promise<void> {
  const inner = htmlKindToInner(lang, fenceSrc(file, lang));
  const out = path.join(KEEP, `${name}.png`);
  const png = await renderer.renderHtml(blockPage(inner), '#FFFFFF');
  fs.writeFileSync(out, png);
  const a = analyze(out);
  const lr = Math.abs(a.margins.l - a.margins.r);
  record(`screen/${name}`, lr <= lrMax && a.ink > 0.01, `${a.w}x${a.h} L/R diff=${lr} ink=${(a.ink * 100).toFixed(1)}%`);
}

await screenBlock('table', 'table', 'table.md');
{
  const listSrc = fenceSrc('list.md', 'list');
  const file = path.join(KEEP, 'list.png');
  const png = await renderer.renderHtml(blockPage(htmlKindToInner('list', listSrc)), '#FFFFFF');
  fs.writeFileSync(file, png);
  const a = analyze(file);
  record('screen/list', a.ink > 0.005, `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}%`);
}
await screenBlock('card', 'card', 'card.md');
await screenBlock('kpi', 'kpi', 'kpi.md');
await screenBlock('compare', 'compare', 'compare.md');
await screenBlock('funnel', 'funnel', 'funnel.md');
await screenBlock('task', 'task', 'task.md', 16);
await screenBlock('progress', 'progress', 'progress.md', 16);
await screenBlock('progress-one', 'progress', 'progress-one.md', 16);
await screenBlock('swimlane', 'swimlane', 'swimlane.md', 16);
await screenBlock('gauge', 'gauge', 'gauge.md', 16);
await screenBlock('vs', 'vs', 'vs.md', 16);
await screenBlock('heatmap', 'heatmap', 'heatmap.md', 16);

{
  const spec = parseChart(fenceSrc('chart-bar.md', 'chart'));
  const file = path.join(KEEP, 'chart-bar.png');
  const { png } = await renderer.render(chartToMermaid(spec), tech as Record<string, unknown>, '#FFFFFF', true);
  fs.writeFileSync(file, png);
  const a = analyze(file);
  record('screen/chart-bar', a.ink > 0.01, `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}%`);
}

{
  const inner = htmlKindToInner('table', fenceSrc('caption-table.md', 'table'));
  const file = path.join(KEEP, 'caption-table.png');
  const png = await renderer.renderHtml(blockPage(inner, {
    caption: { title: 'Q1 销售构成', unit: '万元', source: '财务月报 2026-03' },
  }), '#FFFFFF');
  fs.writeFileSync(file, png);
  const a = analyze(file);
  const lr = Math.abs(a.margins.l - a.margins.r);
  record('screen/caption-table', lr <= 8 && a.ink > 0.01 && a.h > 80, `${a.w}x${a.h} L/R diff=${lr}`);
}

{
  type Agg = { count: number; totalMs: number; maxMs: number; maxLabel: string };
  const agg: Record<string, Agg> = {};
  for (const e of renderer.profile) {
    const k = agg[e.stage] ?? (agg[e.stage] = { count: 0, totalMs: 0, maxMs: 0, maxLabel: '' });
    k.count++;
    k.totalMs += e.ms;
    if (e.ms > k.maxMs) {
      k.maxMs = e.ms;
      k.maxLabel = e.label || '';
    }
  }
  const ranked = Object.entries(agg).sort((a, b) => b[1].totalMs - a[1].totalMs);
  console.log('profile (library sweep):');
  for (const [stage, k] of ranked) {
    console.log(`  ${stage.padEnd(16)} n=${String(k.count).padEnd(4)} total=${String(k.totalMs).padEnd(6)}ms max=${k.maxMs}ms ${k.maxLabel}`);
  }

  // Generous walls: catch order-of-magnitude regressions (re-init every HTML
  // block, hung screenshot), not 10% jitter across machines.
  const BUDGET: Record<string, { maxMs: number; maxCount?: number }> = {
    'page-init': { maxMs: 20_000, maxCount: 2 },
    'init-mermaid': { maxMs: 8_000, maxCount: 3 },
    'init-font': { maxMs: 5_000, maxCount: 3 },
    'page-restore': { maxMs: 12_000, maxCount: 2 },
    'page-reset': { maxMs: 1_000, maxCount: 2 },
    'mermaid-render': { maxMs: 20_000 },
    'screenshot': { maxMs: 12_000 },
    'block-render': { maxMs: 8_000 },
  };
  for (const [stage, b] of Object.entries(BUDGET)) {
    const k = agg[stage];
    const count = k?.count ?? 0;
    const maxMs = k?.maxMs ?? 0;
    const ok = count <= (b.maxCount ?? Infinity) && maxMs <= b.maxMs;
    record(
      `perf/${stage}`,
      ok,
      `n=${count}${b.maxCount != null ? `/${b.maxCount}` : ''} max=${maxMs}ms/${b.maxMs}ms ${k?.maxLabel || ''}`.trim(),
    );
  }
  // mermaid → HTML → chart-bar: one cheap DOM reset, not a mermaid re-inject per HTML block
  record(
    'perf/page-reset-after-html',
    (agg['page-reset']?.count ?? 0) === 1 && (agg['init-mermaid']?.count ?? 0) <= 2,
    `reset=${agg['page-reset']?.count ?? 0} init-mermaid=${agg['init-mermaid']?.count ?? 0}`,
  );
}

await renderer.close();

// ---------------------------------------------------------------------------
// 2. CLI-level behavior
// ---------------------------------------------------------------------------

function runCli(args: string[], opts?: { stdin?: string }): { code: number; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, ['run', CLI, ...args], {
    cwd: ROOT,
    input: opts?.stdin,
    encoding: 'utf8',
    timeout: 180_000,
  });
  return { code: r.status ?? -1, stdout: r.stdout || '', stderr: r.stderr || '' };
}

{
  const help = runCli(['-h']);
  record('cli/help-preset-index', help.code === 0 && help.stdout.includes('--preset') && help.stdout.includes('--index') && help.stdout.includes('--brand') && help.stdout.includes('--subtitle'), `exit=${help.code}`);
}

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const r = runCli([path.join('tests', 'edge', 'empty.md'), '-o', outDir, '-f', 'png']);
  record('cli/empty-md-exit1', r.code === 1, `exit=${r.code} stderr="${r.stderr.trim().slice(0, 50)}"`);
  const r2 = runCli([path.join('tests', 'edge', 'broken.md'), '-o', path.join(outDir, 'b'), '-f', 'png', '--json']);
  const j = JSON.parse(r2.stdout) as { rendered: number; failed: number };
  record('cli/broken-isolated', r2.code === 1 && j.rendered === 1 && j.failed === 1, `exit=${r2.code} ok=${j.rendered} fail=${j.failed}`);
  const r3 = runCli([path.join('tests', 'diagrams', 'flowchart.md'), '--index', '9']);
  record('cli/index-oob-exit2', r3.code === 2, `exit=${r3.code}`);
  const r4 = runCli(['-', '-f', 'svg', '-o', path.join(outDir, 's')], { stdin: 'graph LR; A-->B\n' });
  record('cli/stdin', r4.code === 0 && fs.existsSync(path.join(outDir, 's', 'diagram.svg')), `exit=${r4.code}`);
  const r5 = runCli([path.join('tests', 'edge', 'table.md'), '-o', path.join(outDir, 't'), '--quiet']);
  record('cli/table-png', r5.code === 0 && fs.existsSync(path.join(outDir, 't', 'table.png')), `exit=${r5.code}`);
  fs.rmSync(outDir, { recursive: true, force: true });
}

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const r = runCli(
    [...diagramFiles.map((f) => path.join('tests', 'diagrams', f)), path.join('tests', 'edge', 'table.md'), path.join('tests', 'edge', 'list.md'), path.join('tests', 'edge', 'card.md'), '-o', outDir, '-f', 'png', '--quiet', '--jobs', '4'],
  );
  const pngs = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).length;
  record('cli/batch-20-files-4-jobs', r.code === 0 && pngs === diagramFiles.length + 3, `exit=${r.code} pngs=${pngs}/${diagramFiles.length + 3}`);
  fs.rmSync(outDir, { recursive: true, force: true });
}

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const slide = runCli([path.join('tests', 'diagrams', 'flowchart.md'), '--preset', 'slide', '--json', '--quiet', '-o', path.join(outDir, 'slide')]);
  const sj = JSON.parse(slide.stdout) as { format: string; files: string[] };
  const sw = sj.files[0] ? PNG.sync.read(fs.readFileSync(sj.files[0])).width : 0;
  record('cli/preset-slide', slide.code === 0 && sj.format === 'png' && sw === 3200, `exit=${slide.code} format=${sj.format} w=${sw}`);

  const a4 = runCli([path.join('tests', 'edge', 'table.md'), '--preset', 'a4', '--json', '--quiet', '-o', path.join(outDir, 'a4')]);
  const aj = JSON.parse(a4.stdout) as { format: string; files: string[] };
  const aw = aj.files[0] ? PNG.sync.read(fs.readFileSync(aj.files[0])).width : 0;
  record('cli/preset-a4', a4.code === 0 && aj.format === 'png' && aw === 1800, `exit=${a4.code} w=${aw}`);

  const sq = runCli([path.join('tests', 'edge', 'card.md'), '--preset', 'square', '--json', '--quiet', '-o', path.join(outDir, 'sq')]);
  const qj = JSON.parse(sq.stdout) as { format: string; files: string[] };
  const qw = qj.files[0] ? PNG.sync.read(fs.readFileSync(qj.files[0])).width : 0;
  record('cli/preset-square', sq.code === 0 && qj.format === 'png' && qw === 2160, `exit=${sq.code} w=${qw}`);

  const ov = runCli([path.join('tests', 'diagrams', 'flowchart.md'), '--preset', 'slide', '--width', '800', '--json', '--quiet', '-o', path.join(outDir, 'ov')]);
  const oj = JSON.parse(ov.stdout) as { files: string[] };
  const ow = oj.files[0] ? PNG.sync.read(fs.readFileSync(oj.files[0])).width : 0;
  record('cli/preset-width-override', ov.code === 0 && ow === 1600, `exit=${ov.code} w=${ow}`);
  fs.rmSync(outDir, { recursive: true, force: true });
}

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const r = runCli([
    path.join('tests', 'diagrams', 'flowchart.md'), '-f', 'png', '--quiet', '--json',
    '--title', 'Q1 销售构成', '--unit', '万元', '--source', '财务月报 2026-03',
    '-o', path.join(outDir, 'cap'),
  ]);
  const j = JSON.parse(r.stdout) as { caption?: { title?: string }; files: string[] };
  record('cli/caption-mermaid', r.code === 0 && j.caption?.title === 'Q1 销售构成' && j.files.length === 1, `exit=${r.code} title=${j.caption?.title}`);
  const t = runCli([
    path.join('tests', 'edge', 'caption-table.md'), '-f', 'png', '--quiet', '--json',
    '--title', '表格题', '-o', path.join(outDir, 'ct'),
  ]);
  const tj = JSON.parse(t.stdout) as { files: string[] };
  record('cli/caption-table', t.code === 0 && tj.files.length === 1, `exit=${t.code}`);
  fs.rmSync(outDir, { recursive: true, force: true });
}

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const r = runCli([path.join('tests', 'edge', 'pie-over.md'), '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'w')]);
  const j = JSON.parse(r.stdout) as { warnings: Array<{ code: string }>; failed: number };
  record('cli/chart-warn', r.code === 0 && j.failed === 0 && j.warnings.some((w) => w.code === 'pie-sectors'), `exit=${r.code} warn=${j.warnings.map((w) => w.code).join(',')}`);
  const s = runCli([path.join('tests', 'edge', 'pie-over.md'), '-f', 'png', '--json', '--quiet', '--strict-chart', '-o', path.join(outDir, 's')]);
  const sj = JSON.parse(s.stdout) as { failed: number };
  record('cli/strict-chart', s.code === 1 && sj.failed === 1, `exit=${s.code} failed=${sj.failed}`);
  fs.rmSync(outDir, { recursive: true, force: true });
}

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const r = runCli([path.join('tests', 'edge', 'chart-over.md'), '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'c')]);
  const j = JSON.parse(r.stdout) as { rendered: number; failed: number };
  record('cli/chart-over-isolated', r.code === 1 && j.rendered === 1 && j.failed === 1, `exit=${r.code} ok=${j.rendered} fail=${j.failed}`);
  const k = runCli([path.join('tests', 'edge', 'office-over.md'), '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'k')]);
  const kj = JSON.parse(k.stdout) as { rendered: number; failed: number };
  record('cli/kpi-over-isolated', k.code === 1 && kj.rendered === 1 && kj.failed === 1, `exit=${k.code} ok=${kj.rendered} fail=${kj.failed}`);
  const b = runCli([path.join('tests', 'edge', 'task-bad.md'), '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'tb')]);
  const bj = JSON.parse(b.stdout) as { errors: Array<{ error: string }> };
  record('cli/task-bad-status', b.code === 1 && /未开始/.test(bj.errors[0]?.error || ''), (bj.errors[0]?.error || '').slice(0, 80));
  const bar = runCli([path.join('tests', 'edge', 'chart-bar.md'), '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'bar')]);
  record('cli/chart-bar', bar.code === 0, `exit=${bar.code}`);
  const g = runCli([path.join('tests', 'edge', 'gauge-over.md'), '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'go')]);
  const gj = JSON.parse(g.stdout) as { rendered: number; failed: number };
  record('cli/gauge-over-isolated', g.code === 1 && gj.rendered === 1 && gj.failed === 1, `exit=${g.code} ok=${gj.rendered} fail=${gj.failed}`);
  const hm = runCli([path.join('tests', 'edge', 'heatmap-over.md'), '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'ho')]);
  const hmj = JSON.parse(hm.stdout) as { rendered: number; failed: number };
  record('cli/heatmap-over-isolated', hm.code === 1 && hmj.rendered === 1 && hmj.failed === 1, `exit=${hm.code} ok=${hmj.rendered} fail=${hmj.failed}`);
  fs.rmSync(outDir, { recursive: true, force: true });
}

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const bad = runCli([path.join('tests', 'edge', 'card.md'), '--brand', 'not-a-color', '-f', 'png', '-o', outDir]);
  record('cli/brand-bad-exit2', bad.code === 2, `exit=${bad.code}`);
  const r = runCli([path.join('tests', 'edge', 'card.md'), '--brand', '#E4572E', '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'br')]);
  const j = JSON.parse(r.stdout) as { brand?: string; files: string[] };
  let found = false;
  if (j.files[0] && fs.existsSync(j.files[0])) {
    const png = PNG.sync.read(fs.readFileSync(j.files[0]));
    for (let i = 0; i < png.data.length; i += 4) {
      if (Math.abs(png.data[i] - 0xE4) < 12 && Math.abs(png.data[i + 1] - 0x57) < 12 && Math.abs(png.data[i + 2] - 0x2E) < 12) {
        found = true;
        break;
      }
    }
  }
  record('cli/brand-card-accent', r.code === 0 && j.brand === '#E4572E' && found, `exit=${r.code} brand=${j.brand} pixel=${found}`);
  const pale = runCli([path.join('tests', 'edge', 'card.md'), '--brand', '#EEEEEE', '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'pale')]);
  const pj = JSON.parse(pale.stdout) as { warnings: Array<{ code: string }> };
  record('cli/brand-contrast-warn', pale.code === 0 && pj.warnings.some((w) => w.code === 'brand-contrast'), `exit=${pale.code}`);
  fs.rmSync(outDir, { recursive: true, force: true });
}

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const r = runCli([
    path.join('tests', 'diagrams', 'flowchart.md'),
    path.join('tests', 'edge', 'table.md'),
    '-f', 'png', '--json', '--quiet', '--profile', '--jobs', '1',
    '-o', path.join(outDir, 'pf'),
  ]);
  const j = JSON.parse(r.stdout || '{}') as { profile?: Record<string, { count: number }> };
  const initN = j.profile?.['init-mermaid']?.count ?? 0;
  record(
    'cli/profile-hotspots',
    r.code === 0 && (j.profile?.['mermaid-render']?.count ?? 0) >= 1 && initN > 0 && initN <= 3,
    `exit=${r.code} init-mermaid=${initN} stages=${Object.keys(j.profile || {}).join(',')}`,
  );
  fs.rmSync(outDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(36)} ${r.detail}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed. artifacts for visual review: tests/artifacts/`);
process.exit(failed.length ? 1 : 0);
