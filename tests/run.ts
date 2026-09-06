// mmdx acceptance test matrix. Run: bun run tests/run.ts
//
// Two layers:
//  1. library-level screening — all diagram fixtures rendered through ONE
//     browser session, then pixel-analyzed (margins symmetric? content
//     present? not blank?) so visual review is only needed for flagged items
//  2. CLI-level behavior — exit codes, naming, stdin, error paths

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { blockPage, cardToHtml, listToHtml, tableToHtml } from '../src/blocks.ts';
import { loadAssets } from '../src/embed.ts';
import { Renderer } from '../src/render.ts';
import { DEFAULT_THEME, PRESETS } from '../src/themes.ts';

const ROOT = path.dirname(import.meta.dir);
const CLI = path.join(ROOT, 'src', 'cli.ts');
const KEEP = path.join(ROOT, 'tests', 'artifacts'); // pngs kept for visual review
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
// 1. library-level screening
// ---------------------------------------------------------------------------

const assets = await loadAssets();
const renderer = await Renderer.create(assets, { layout: 'elk', scale: 2, width: 1200 });
const tech = PRESETS[DEFAULT_THEME].config;

interface Analysis {
  w: number;
  h: number;
  margins: { l: number; r: number; t: number; b: number };
  ink: number; // fraction of non-background pixels
}

function analyze(file: string): Analysis {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = png;
  const bgIdx = 0; // pixel (0,0)
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
    // treemap is a full-bleed tiled chart — near-100% ink is by design
    if (a.ink > 0.85 && name !== 'treemap') problems.push('overfull');
    record(`screen/${name}`, problems.length === 0, problems.join('; ') || `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}% margins L${a.margins.l} R${a.margins.r} T${a.margins.t} B${a.margins.b}`);
  } catch (e) {
    record(`screen/${name}`, false, (e as Error).message.slice(0, 120));
  }
}

// table + list rendering
{
  const tableSrc = fs.readFileSync(path.join(ROOT, 'tests', 'edge', 'table.md'), 'utf8').match(/```table\n([\s\S]*?)```/)![1];
  const file = path.join(KEEP, 'table.png');
  const png = await renderer.renderHtml(blockPage(tableToHtml(tableSrc)), '#FFFFFF');
  fs.writeFileSync(file, png);
  const a = analyze(file);
  const lr = Math.abs(a.margins.l - a.margins.r);
  record('screen/table', lr <= 8 && a.ink > 0.01, `${a.w}x${a.h} L/R diff=${lr}`);
}
{
  const listSrc = fs.readFileSync(path.join(ROOT, 'tests', 'edge', 'list.md'), 'utf8').match(/```list\n([\s\S]*?)```/)![1];
  const file = path.join(KEEP, 'list.png');
  const png = await renderer.renderHtml(blockPage(listToHtml(listSrc)), '#FFFFFF');
  fs.writeFileSync(file, png);
  const a = analyze(file);
  record('screen/list', a.ink > 0.005, `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}%`);
}
{
  const cardSrc = fs.readFileSync(path.join(ROOT, 'tests', 'edge', 'card.md'), 'utf8').match(/```card\n([\s\S]*?)```/)![1];
  const file = path.join(KEEP, 'card.png');
  const png = await renderer.renderHtml(blockPage(cardToHtml(cardSrc)), '#FFFFFF');
  fs.writeFileSync(file, png);
  const a = analyze(file);
  const lr = Math.abs(a.margins.l - a.margins.r);
  record('screen/card', lr <= 8 && a.ink > 0.01, `${a.w}x${a.h} L/R diff=${lr} ink=${(a.ink * 100).toFixed(1)}%`);
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

// batch all-in-one invocation
{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const r = runCli(
    [...diagramFiles.map((f) => path.join('tests', 'diagrams', f)), path.join('tests', 'edge', 'table.md'), path.join('tests', 'edge', 'list.md'), path.join('tests', 'edge', 'card.md'), '-o', outDir, '-f', 'png', '--quiet', '--jobs', '4'],
  );
  const pngs = fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).length;
  record('cli/batch-20-files-4-jobs', r.code === 0 && pngs === diagramFiles.length + 3, `exit=${r.code} pngs=${pngs}/${diagramFiles.length + 3}`);
  fs.rmSync(outDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(30)} ${r.detail}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed. artifacts for visual review: tests/artifacts/`);
process.exit(failed.length ? 1 : 0);
