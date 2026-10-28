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
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { blockPage, htmlKindToInner, type BlockKind } from '../src/blocks.ts';
import { cardPage, extractCardHtml, parseCardMarkdown } from '../src/card.ts';
import { chartToMermaid, parseChart } from '../src/chart.ts';
import { loadAssets } from '../src/embed.ts';
import { scanColumnHints, scanLimits } from '../src/limits.ts';
import { bottomBlankLimit, diffPng } from '../src/lint.ts';
import { Renderer } from '../src/render.ts';
import { applyColumnDensity, applySlideDensity, DEFAULT_THEME, getTheme, peleCss, PRESETS, type ThemeSpec } from '../src/themes.ts';
import type { EngineId } from '../src/engine/types.ts';
import { accentTint, applyBrand, contrastRatio, normalizeHex } from '../src/tokens.ts';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
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
  const okPie = scanLimits(fs.readFileSync(path.join(ROOT, 'tests', 'diagrams', 'pie.md'), 'utf8').match(/```mermaid\r?\n([\s\S]*?)```/)![1]);
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
  {
    const c = JSON.parse(JSON.stringify(PRESETS.tech.config)) as Record<string, unknown>;
    applyColumnDensity(c);
    const fc = c.flowchart as { wrappingWidth?: number };
    record(
      'unit/column-density',
      c.fontSize === 18 && fc.wrappingWidth === 200,
      `fontSize=${String(c.fontSize)} wrap=${String(fc.wrappingWidth)}`,
    );
    const lr = scanColumnHints('flowchart LR\n  A-->B');
    const td = scanColumnHints('flowchart TD\n  A-->B');
    record('unit/column-landscape', lr.some((h) => h.code === 'column-landscape') && td.length === 0, lr.map((h) => h.code).join(',') || 'none');
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
// 1. style contract
// ---------------------------------------------------------------------------

{
  const ex = getTheme('excalidraw');
  record('unit/excalidraw-contract',
    ex.style?.rough === true && ex.style?.fillStyle === 'solid' && ex.style?.seed === 41 && !!ex.blockCss,
    `rough=${ex.style?.rough} fill=${ex.style?.fillStyle} seed=${ex.style?.seed}`);
  const exCss = peleCss(ex, { strokeWidth: 1.5 });
  record('unit/excalidraw-shapes',
    /pele-shape-fr-rect/.test(exCss) && /pele-class > rect/.test(exCss) && /pele-state-start circle/.test(exCss),
    `frRect=${/pele-shape-fr-rect/.test(exCss)} class=${/pele-class > rect/.test(exCss)} stateStart=${/pele-state-start circle/.test(exCss)}`);
  const techCss = peleCss(getTheme('tech'), { strokeWidth: 1.5 });
  record('unit/tech-no-shape-expansion', !/pele-shape-fr-rect/.test(techCss), 'old theme keeps its shape rules');
  const page = blockPage('<div class="card">x</div>', { blockCss: '.card{outline:1px solid red}' });
  record('unit/block-css', page.includes('.card{outline:1px solid red}'), 'blockCss appended');

  const paperPage = blockPage('<div class="card">x</div>', { tone: 'paper' });
  const productPage = blockPage('<div class="card">x</div>', { tone: 'product' });
  record('unit/tone-css',
    paperPage.includes('--tone-heading-font') && paperPage.includes('16px') &&
    productPage.includes('--tone-heading-font') && productPage.includes('6px') &&
    paperPage !== productPage,
    `paper=${paperPage.length}B product=${productPage.length}B`);

  {
    const doc = parseCardMarkdown(fs.readFileSync(path.join(ROOT, 'tests', 'edge', 'card-info.md'), 'utf8'));
    record('unit/card-parse',
      doc.title === '发布复盘' && doc.kicker === '工程周报 · 2026-10' &&
      doc.blocks.some((b) => b.type === 'ul') && doc.blocks.some((b) => b.type === 'quote') &&
      doc.blocks.some((b) => b.type === 'code'),
      `${doc.title} blocks=${doc.blocks.map((b) => b.type).join(',')}`);
    const extracted = extractCardHtml(
      '<html><head><title>Fallback</title><meta property="og:title" content="页面标题">' +
      '<meta name="description" content="摘要文本"></head><body><nav>菜单</nav>' +
      '<article><h1>正文标题</h1><p>第一段内容。</p><ul><li>条目一</li></ul></article></body></html>',
    );
    record('unit/card-extract',
      extracted.title === '页面标题' && extracted.description === '摘要文本' &&
      extracted.markdown.includes('正文标题') && extracted.markdown.includes('条目一') &&
      !extracted.markdown.includes('菜单'),
      `${extracted.title} / ${extracted.description} / ${extracted.markdown.length}B`);
  }

  {
    const pages = [
      'GALLERY.md', 'GALLERY.en.md',
      ...fs.readdirSync(path.join(ROOT, 'docs', 'gallery'))
        .filter((f) => f.endsWith('.md'))
        .map((f) => `gallery/${f}`),
    ];
    const missing: string[] = [];
    let refs = 0;
    for (const rel of pages) {
      const text = fs.readFileSync(path.join(ROOT, 'docs', rel), 'utf8');
      const found = new Set(
        [...text.matchAll(/\]\(([^)]+)\)/g)]
          .map((m) => m[1].split('#')[0])
          .filter((ref) => /\.(md|png)$/.test(ref) && !/^https?:/.test(ref)),
      );
      refs += found.size;
      for (const ref of found) {
        const target = path.resolve(path.dirname(path.join(ROOT, 'docs', rel)), ref);
        if (!fs.existsSync(target)) missing.push(`${rel}:${ref}`);
      }
    }
    record('unit/gallery-links', pages.length >= 8 && refs >= 30 && missing.length === 0,
      `${pages.length} pages, ${refs} links, missing=${missing.join(',') || 'none'}`);
  }

  {
    const docs = ['THIRD_PARTY_NOTICES.md', 'docs/QUALITY.md', 'docs/QUALITY.en.md'];
    const missing: string[] = [];
    let refs = 0;
    for (const rel of docs) {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const found = new Set(
        [...text.matchAll(/\]\(([^)]+)\)/g)]
          .map((m) => m[1].split('#')[0])
          .filter((ref) => ref && !/^https?:/.test(ref)),
      );
      refs += found.size;
      for (const ref of found) {
        if (!fs.existsSync(path.resolve(path.dirname(path.join(ROOT, rel)), ref))) {
          missing.push(`${rel}:${ref}`);
        }
      }
    }
    record('unit/notices-links', refs >= 10 && missing.length === 0,
      `${docs.length} docs, ${refs} links, missing=${missing.join(',') || 'none'}`);
  }
}

// ---------------------------------------------------------------------------
// 1. library-level screening
// ---------------------------------------------------------------------------

const assets = await loadAssets();
const renderer = await Renderer.create(assets, { layout: 'elk', scale: 2, width: 1200, profile: true });
const tech = PRESETS[DEFAULT_THEME].config;
const themeSpec = getTheme(DEFAULT_THEME);

const renderPng = (
  code: string,
  engine: EngineId = 'pele',
  spec: ThemeSpec = themeSpec,
): Promise<{ svg: string; png?: Buffer }> =>
  renderer.render({
    code, engine, background: spec.background, needPng: true, scale: 2, width: 1200,
    layout: 'elk', theme: spec, mermaidConfig: tech as Record<string, unknown>,
    fontSize: 15, padding: 0, svgThemeable: false, titlePos: 'top', titleText: '',
    remap: PRESETS[DEFAULT_THEME].remap,
  });

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

// A long page must not bake the viewport height into the PNG. Fixed padding is
// fine; a large empty band below the last ink row is not.
const bottomBlankOk = (a: Analysis): boolean => a.margins.b <= bottomBlankLimit(a.h);
const edgeClipped = (a: Analysis): string | null => {
  const hit = (['l', 'r', 't', 'b'] as const).filter((k) => a.margins[k] <= 0);
  return hit.length ? hit.join('') : null;
};

const diagramFiles = fs.readdirSync(path.join(ROOT, 'tests', 'diagrams')).filter((f) => f.endsWith('.md'));
const source = (f: string): string =>
  /\S/.test(f) ? fs.readFileSync(path.join(ROOT, 'tests', 'diagrams', f), 'utf8').match(/```mermaid\r?\n([\s\S]*?)```/)![1] : '';

for (const f of diagramFiles) {
  const name = f.replace(/\.md$/, '');
  const file = path.join(KEEP, `${name}.png`);
  try {
    const { png } = await renderPng(source(f));
    fs.writeFileSync(file, png);
    const a = analyze(file);
    const lr = Math.abs(a.margins.l - a.margins.r);
    const tb = Math.abs(a.margins.t - a.margins.b);
    const problems: string[] = [];
    if (lr > 16) problems.push(`L/R margins ${a.margins.l}/${a.margins.r}`);
    if (tb > 16) problems.push(`T/B margins ${a.margins.t}/${a.margins.b}`);
    if (!bottomBlankOk(a)) problems.push(`bottom blank ${a.margins.b}px > ${bottomBlankLimit(a.h)}px`);
    const edge = edgeClipped(a);
    if (edge) problems.push(`edge clip ${edge}`);
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
  record(`screen/${name}`, lr <= lrMax && a.ink > 0.01 && bottomBlankOk(a),
    `${a.w}x${a.h} L/R diff=${lr} bottom=${a.margins.b}/${bottomBlankLimit(a.h)} ink=${(a.ink * 100).toFixed(1)}%`);
}

await screenBlock('table', 'table', 'table.md');
{
  const listSrc = fenceSrc('list.md', 'list');
  const file = path.join(KEEP, 'list.png');
  const png = await renderer.renderHtml(blockPage(htmlKindToInner('list', listSrc)), '#FFFFFF');
  fs.writeFileSync(file, png);
  const a = analyze(file);
  record('screen/list', a.ink > 0.005 && bottomBlankOk(a),
    `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}% bottom=${a.margins.b}/${bottomBlankLimit(a.h)}`);
}
{
  // taller than the initial viewport: catches viewport-height blank bands
  const longList = Array.from({ length: 40 }, (_, i) => `- 条目 ${i + 1}：一段用于撑高页面的说明文字`).join('\n');
  const file = path.join(KEEP, 'long-list.png');
  const png = await renderer.renderHtml(blockPage(htmlKindToInner('list', longList), { wrapWidth: 600 }), '#FFFFFF');
  fs.writeFileSync(file, png);
  const a = analyze(file);
  record('screen/long-list', a.h > 1600 && a.ink > 0.01 && bottomBlankOk(a),
    `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}% bottom=${a.margins.b}/${bottomBlankLimit(a.h)}`);
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
  const { png } = await renderPng(chartToMermaid(spec));
  fs.writeFileSync(file, png);
  const a = analyze(file);
  record('screen/chart-bar', a.ink > 0.01 && bottomBlankOk(a),
    `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}% bottom=${a.margins.b}/${bottomBlankLimit(a.h)}`);
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
  record('screen/caption-table', lr <= 8 && a.ink > 0.01 && a.h > 80 && bottomBlankOk(a),
    `${a.w}x${a.h} L/R diff=${lr} bottom=${a.margins.b}/${bottomBlankLimit(a.h)}`);
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
    'init-pele': { maxMs: 8_000, maxCount: 3 },
    'init-mermaid': { maxMs: 8_000, maxCount: 3 },
    'init-font': { maxMs: 5_000, maxCount: 3 },
    'page-restore': { maxMs: 12_000, maxCount: 2 },
    'page-reset': { maxMs: 1_000, maxCount: 2 },
    'pele-render': { maxMs: 20_000 },
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
    (agg['page-reset']?.count ?? 0) === 1 && (agg['init-pele']?.count ?? 0) <= 2,
    `reset=${agg['page-reset']?.count ?? 0} init-pele=${agg['init-pele']?.count ?? 0}`,
  );
}

// ---------------------------------------------------------------------------
// every preset: diagram + block geometry under Pele
// ---------------------------------------------------------------------------

for (const styleName of Object.keys(PRESETS)) {
  const spec = getTheme(styleName);
  for (const name of ['flowchart', 'state', 'class', 'er']) {
    try {
      const { png } = await renderPng(source(`${name}.md`), 'pele', spec);
      const file = path.join(KEEP, `style-${styleName}-${name}.png`);
      fs.writeFileSync(file, png);
      const a = analyze(file);
      const lr = Math.abs(a.margins.l - a.margins.r);
      const tb = Math.abs(a.margins.t - a.margins.b);
      const edge = edgeClipped(a);
      record(
        `style/${styleName}/${name}`,
        lr <= 20 && tb <= 20 && !edge && a.ink > 0.005 && a.ink < 0.85 && bottomBlankOk(a),
        `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}% margins L${a.margins.l} R${a.margins.r} T${a.margins.t} B${a.margins.b}/${bottomBlankLimit(a.h)}${edge ? ` edge=${edge}` : ''}`,
      );
    } catch (e) {
      record(`style/${styleName}/${name}`, false, (e as Error).message.slice(0, 120));
    }
  }
  for (const [kind, file] of [['card', 'card.md'], ['kpi', 'kpi.md'], ['table', 'table.md']] as Array<[BlockKind, string]>) {
    try {
      const inner = htmlKindToInner(kind, fenceSrc(file, kind));
      const png = await renderer.renderHtml(blockPage(inner, { blockCss: spec.blockCss }), '#FFFFFF');
      const out = path.join(KEEP, `style-${styleName}-${kind}.png`);
      fs.writeFileSync(out, png);
      const a = analyze(out);
      const lr = Math.abs(a.margins.l - a.margins.r);
      record(
        `style/${styleName}/block-${kind}`,
        lr <= 40 && a.ink > 0.01 && bottomBlankOk(a),
        `${a.w}x${a.h} ink=${(a.ink * 100).toFixed(1)}% L/R diff=${lr} bottom=${a.margins.b}/${bottomBlankLimit(a.h)}`,
      );
    } catch (e) {
      record(`style/${styleName}/block-${kind}`, false, (e as Error).message.slice(0, 120));
    }
  }
}

// ---------------------------------------------------------------------------
// 1b. visual lint: DOM geometry, determinism, contrast
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];
  const clean: string[] = [];
  for (const name of Object.keys(PRESETS)) {
    const spec = getTheme(name);
    for (const [kind, file] of [['card', 'card.md'], ['kpi', 'kpi.md'], ['table', 'table.md']] as Array<[BlockKind, string]>) {
      const inner = htmlKindToInner(kind, fenceSrc(file, kind));
      const { issues } = await renderer.renderHtmlAudit(
        blockPage(inner, { blockCss: spec.blockCss, tone: 'neutral' }),
        spec.background,
      );
      if (issues.length) {
        problems.push(`${name}/${kind}:${issues.slice(0, 3).map((i) => `${i.kind}@${i.selector}(${i.detail})`).join(',')}`);
      } else {
        clean.push(`${name}/${kind}`);
      }
    }
  }
  record('lint/layout-blocks', problems.length === 0,
    problems.join('; ') || `clean=${clean.join(',')}`);
}

{
  const html = blockPage(
    '<div class="card" style="width:400px"><div class="card-title">宽卡片</div></div>' +
    '<div style="width:40px;overflow:hidden;white-space:nowrap">这段文字一定会被裁切</div>',
    { wrapWidth: 200 },
  );
  const { issues } = await renderer.renderHtmlAudit(html, '#FFFFFF');
  const kinds = new Set(issues.map((i) => i.kind));
  record('lint/layout-detects-overflow',
    kinds.has('root-overflow') && kinds.has('text-overflow'),
    [...kinds].join(',') || 'no issues');
}

{
  const html = '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'body{margin:0}.wrap{position:relative;width:240px;padding:16px}' +
    '.caption-head{position:absolute;top:0;left:16px}.card{padding:24px;border:1px solid #ddd}' +
    '</style></head><body><div class="wrap">' +
    '<header class="caption-head"><div class="caption-title">重叠标题</div></header>' +
    '<div class="card">正文内容</div></div></body></html>';
  const { issues } = await renderer.renderHtmlAudit(html, '#FFFFFF');
  record('lint/layout-detects-overlap',
    issues.some((i) => i.kind === 'caption-overlap'),
    issues.map((i) => i.kind).join(',') || 'no issues');
}

{
  const spec = getTheme('openai');
  const doc = parseCardMarkdown(fs.readFileSync(path.join(ROOT, 'tests', 'edge', 'card-info.md'), 'utf8'));
  const tokens = {
    paper: spec.vars.bg, ink: spec.vars.fg, muted: spec.vars.muted,
    rule: spec.vars.border, accent: spec.vars.accent,
    accentTint: accentTint(spec.vars.accent), paper2: spec.vars.surfaceAlt,
  };
  const problems: string[] = [];
  for (const tone of ['paper', 'neutral', 'product'] as const) {
    const html = cardPage(doc, doc.blocks, tone, 600, spec.fontFamily ?? 'sans-serif', 0, tokens);
    const { issues } = await renderer.renderHtmlAudit(html, spec.background);
    if (issues.length) problems.push(`${tone}:${issues.slice(0, 2).map((i) => `${i.kind}@${i.selector}`).join(',')}`);
  }
  record('lint/card-layout', problems.length === 0, problems.join('; ') || 'paper/neutral/product clean');
}

{
  const reportInner = '<div style="display:flex;flex-direction:column;gap:22px;align-items:flex-start">' +
    htmlKindToInner('kpi', fenceSrc('kpi.md', 'kpi')) +
    htmlKindToInner('card', fenceSrc('card.md', 'card')) +
    htmlKindToInner('table', fenceSrc('table.md', 'table')) +
    '</div>';
  const problems: string[] = [];
  for (const name of Object.keys(PRESETS)) {
    const spec = getTheme(name);
    const { issues } = await renderer.renderHtmlAudit(
      blockPage(reportInner, {
        blockCss: spec.blockCss,
        tone: 'neutral',
        caption: { title: '发布复盘报告', subtitle: 'HTML 报告卡 skill', source: '示例' },
      }),
      spec.background,
    );
    if (issues.length) {
      problems.push(`${name}:${issues.slice(0, 2).map((i) => `${i.kind}@${i.selector}`).join(',')}`);
    }
  }
  record('lint/html-report', problems.length === 0, problems.join('; ') || 'all presets clean');
}

{
  const spec = getTheme('excalidraw');
  const { svg } = await renderPng(source('flowchart.md'), 'pele', spec);
  const { issues } = await renderer.renderHtmlAudit(
    blockPage(`<div class="fig">${svg}</div>`, {
      tone: 'neutral',
      tokens: {
        paper: spec.vars.bg, ink: spec.vars.fg, muted: spec.vars.muted,
        rule: spec.vars.border, accent: spec.vars.accent,
        accentTint: accentTint(spec.vars.accent), paper2: spec.vars.surfaceAlt,
      },
    }),
    spec.background,
  );
  const bad = issues.filter((i) => i.kind === 'text-overflow' || i.kind === 'low-contrast');
  record('lint/svg-labels-excalidraw', bad.length === 0,
    bad.slice(0, 3).map((i) => `${i.kind}:${i.detail}`).join('; ') || 'labels fit and pass 3:1');
}

{
  const html = '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'body{margin:0;background:#fff}.wrap{padding:16px}' +
    '</style></head><body><div class="wrap"><svg width="200" height="80">' +
    '<g class="pele-node"><rect x="0" y="0" width="40" height="24"/>' +
    '<text x="2" y="18" font-size="14">THIS LABEL IS TOO LONG</text></g></svg></div></body></html>';
  const { issues } = await renderer.renderHtmlAudit(html, '#FFFFFF');
  record('lint/svg-text-detects-overflow',
    issues.some((i) => i.kind === 'text-overflow'),
    issues.map((i) => i.kind).join(',') || 'no issues');
}

for (const name of Object.keys(PRESETS)) {
  const spec = getTheme(name);
  const first = await renderPng(source('flowchart.md'), 'pele', spec);
  const second = await renderPng(source('flowchart.md'), 'pele', spec);
  if (!first.png || !second.png) {
    record(`lint/deterministic-${name}`, false, 'no PNG');
    continue;
  }
  const diff = diffPng(first.png, second.png);
  record(`lint/deterministic-${name}`,
    !diff.sizeMismatch && diff.ratio <= 0.0005,
    `${diff.width}x${diff.height} diff=${diff.diffPixels} ratio=${diff.ratio.toFixed(5)}`);
}

{
  const first = fs.readFileSync(path.join(KEEP, 'style-excalidraw-flowchart.png'));
  const { png } = await renderPng(source('flowchart.md'), 'pele', getTheme('excalidraw'));
  if (!png) throw new Error('no PNG for determinism check');
  fs.writeFileSync(path.join(KEEP, 'style-excalidraw-flowchart-repeat.png'), png);
  const diff = diffPng(first, png);
  record('lint/rough-deterministic',
    !diff.sizeMismatch && diff.ratio <= 0.0005,
    `${diff.width}x${diff.height} diff=${diff.diffPixels} ratio=${diff.ratio.toFixed(5)}`);
}

{
  const lows: string[] = [];
  let minMuted = 100;
  let minMutedName = '';
  for (const name of Object.keys(PRESETS)) {
    const t = getTheme(name);
    const fg = contrastRatio(t.vars.fg, t.vars.bg);
    if (fg < 4.5) lows.push(`${name} fg ${fg.toFixed(2)}`);
    for (const [key, value] of [
      ['muted', t.vars.muted],
      ['accent', t.vars.accent],
      ['critical', t.vars.critical],
    ] as const) {
      const c = contrastRatio(value, t.vars.bg);
      if (key === 'muted' && c < minMuted) {
        minMuted = c;
        minMutedName = name;
      }
      if (c < 3.0) lows.push(`${name} ${key} ${c.toFixed(2)}`);
    }
  }
  record('lint/theme-contrast', lows.length === 0,
    lows.join('; ') || `fg>=4.5; min muted ${minMuted.toFixed(2)} (${minMutedName})`);
}

await renderer.close();

// ---------------------------------------------------------------------------
// 2. CLI-level behavior
// ---------------------------------------------------------------------------

function runCli(args: string[], opts?: { stdin?: string }): { code: number; stdout: string; stderr: string } {
  const bun = process.versions.bun !== undefined;
  const argv = bun
    ? ['run', CLI, ...args]
    : ['--experimental-transform-types', '--no-warnings', CLI, ...args];
  const r = spawnSync(process.execPath, argv, {
    cwd: ROOT,
    input: opts?.stdin,
    encoding: 'utf8',
    timeout: 180_000,
  });
  return { code: r.status ?? -1, stdout: r.stdout || '', stderr: r.stderr || '' };
}

{
  const help = runCli(['-h']);
  record('cli/help-preset-index', help.code === 0 && help.stdout.includes('--preset') && help.stdout.includes('column') && help.stdout.includes('--index') && help.stdout.includes('--brand') && help.stdout.includes('--subtitle'), `exit=${help.code}`);
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

  const col = runCli([path.join('tests', 'diagrams', 'flowchart.md'), '--preset', 'column', '--json', '--quiet', '-o', path.join(outDir, 'col')]);
  const cj = JSON.parse(col.stdout) as { format: string; preset?: string; files: string[]; warnings: Array<{ code: string }> };
  const cw = cj.files[0] ? PNG.sync.read(fs.readFileSync(cj.files[0])).width : 0;
  record('cli/preset-column', col.code === 0 && cj.format === 'png' && cj.preset === 'column' && cw === 1600, `exit=${col.code} format=${cj.format} w=${cw}`);
  record('cli/preset-column-lr-warn', cj.warnings.some((w) => w.code === 'column-landscape'), cj.warnings.map((w) => w.code).join(',') || 'none');
  fs.rmSync(outDir, { recursive: true, force: true });
}

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-t-'));
  const shot = path.join('tests', 'edge', 'shot.html');
  const r = runCli([shot, '-o', path.join(outDir, 'shot.png'), '--json', '--quiet']);
  const j = JSON.parse(r.stdout) as { rendered: number; failed: number; files: string[] };
  const a = j.files[0] ? analyze(j.files[0]) : null;
  record(
    'cli/html-shot-fullpage',
    r.code === 0 && j.rendered === 1 && !!a && a.w === 960 && a.h >= 260 && a.h <= 440 && a.ink > 0.005,
    `exit=${r.code} w=${a?.w} h=${a?.h} ink=${a ? a.ink.toFixed(3) : '-'}`,
  );
  const r2 = runCli([shot, '-o', path.join(outDir, 'svg'), '-f', 'svg']);
  const pngOnly = fs.existsSync(path.join(outDir, 'svg', 'shot.png'));
  const noSvg = !fs.existsSync(path.join(outDir, 'svg', 'shot.svg'));
  record(
    'cli/html-svg-png-only',
    r2.code === 0 && pngOnly && noSvg && /renders to PNG only/.test(r2.stderr),
    `exit=${r2.code} png=${pngOnly} svgAbsent=${noSvg} note=${/renders to PNG only/.test(r2.stderr)}`,
  );

  // figure lint runs on the authored document and surfaces through --json
  const doc = path.join(outDir, 'lint-fixture.html');
  fs.writeFileSync(doc, '<!doctype html><meta charset="utf-8"><body style="margin:0">' +
    '<figure><svg viewBox="0 0 120 40" aria-label="无题图"><rect x="2" y="2" width="116" height="36" fill="#eee"/>' +
    '<text x="10" y="24" font-size="14">标签</text></svg></figure></body>');
  const r3 = runCli([doc, '-o', path.join(outDir, 'lint.png'), '--json', '--quiet']);
  const j3 = JSON.parse(r3.stdout || '{}') as { warnings?: Array<{ code: string }> };
  const codes = (j3.warnings ?? []).map((w) => w.code);
  record('cli/html-figure-lint', r3.code === 0 && codes.includes('figure-uncaptioned'), codes.join(',') || 'no warnings');
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
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-card-'));
  const card = path.join('tests', 'edge', 'card-info.md');
  const r = runCli([
    'card', '--in', card, '-t', 'excalidraw', '--tone', 'neutral',
    '--width', '600', '-o', path.join(outDir, 'card.png'), '--json',
  ]);
  const j = JSON.parse(r.stdout || '{}') as {
    command?: string; cards?: number; files?: string[]; tone?: string;
    pages?: Array<{ width: number; height: number }>;
  };
  const w = j.files?.[0] ? PNG.sync.read(fs.readFileSync(j.files[0])).width : 0;
  const h = j.files?.[0] ? PNG.sync.read(fs.readFileSync(j.files[0])).height : 0;
  record('cli/card-render',
    r.code === 0 && j.command === 'card' && j.tone === 'neutral' &&
    j.cards === 1 && w === 1200 && h > 400 && h <= 2400,
    `exit=${r.code} cards=${j.cards} w=${w} h=${h}`);

  const paper = runCli([
    'card', '--in', card, '--tone', 'paper', '-o', path.join(outDir, 'paper.png'), '--json',
  ]);
  const product = runCli([
    'card', '--in', card, '--tone', 'product', '-o', path.join(outDir, 'product.png'), '--json',
  ]);
  const pj = JSON.parse(paper.stdout || '{}') as { files?: string[] };
  const qj = JSON.parse(product.stdout || '{}') as { files?: string[] };
  const pd = pj.files?.[0] && qj.files?.[0]
    ? diffPng(fs.readFileSync(pj.files[0]), fs.readFileSync(qj.files[0]))
    : null;
  record('cli/card-tone-diff',
    paper.code === 0 && product.code === 0 && !!pd && (pd.sizeMismatch || pd.ratio > 0.005),
    `exit=${paper.code}/${product.code} ratio=${pd?.ratio.toFixed(4)} sizeMismatch=${pd?.sizeMismatch}`);

  const narrow = runCli([
    'card', '--in', card, '--width', '480', '-o', path.join(outDir, 'narrow.png'), '--json',
  ]);
  const nj = JSON.parse(narrow.stdout || '{}') as { files?: string[] };
  const nw = nj.files?.[0] ? PNG.sync.read(fs.readFileSync(nj.files[0])).width : 0;
  record('cli/card-width', narrow.code === 0 && nw === 960, `exit=${narrow.code} w=${nw}`);

  const long = path.join(outDir, 'long.md');
  fs.writeFileSync(long, `---\ntitle: 长文拆分\n---\n` + Array.from({ length: 14 }, (_, i) =>
    `## 小节 ${i + 1}\n\n这是一段用于撑高信息卡的内容，包含足够的文字来触发分页逻辑。`.repeat(2),
  ).join('\n\n'));
  const split = runCli([
    'card', '--in', long, '--max-height', '600', '-o', path.join(outDir, 'split.png'), '--json',
  ]);
  const sj = JSON.parse(split.stdout || '{}') as { cards?: number; files?: string[] };
  record('cli/card-split',
    split.code === 0 && (sj.cards ?? 0) >= 2 && (sj.files?.length ?? 0) === sj.cards,
    `exit=${split.code} cards=${sj.cards}`);

  const badTone = runCli(['card', '--in', card, '--tone', 'nope']);
  record('cli/card-tone-bad', badTone.code === 2 && /paper\|neutral\|product/.test(badTone.stderr),
    `exit=${badTone.code}`);
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
  const initN = j.profile?.['init-pele']?.count ?? 0;
  record(
    'cli/profile-hotspots',
    r.code === 0 && (j.profile?.['pele-render']?.count ?? 0) >= 1 && initN > 0 && initN <= 3,
    `exit=${r.code} init-pele=${initN} stages=${Object.keys(j.profile || {}).join(',')}`,
  );
  fs.rmSync(outDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// v2 engine / theme contract
// ---------------------------------------------------------------------------

{
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mmdx-v2-'));
  const flow = path.join('tests', 'diagrams', 'flowchart.md');

  const mermaidRun = runCli([flow, '--engine', 'mermaid', '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'm')]);
  const mj = JSON.parse(mermaidRun.stdout || '{}') as { engine?: string; rendered?: number };
  record('cli/engine-mermaid', mermaidRun.code === 0 && mj.engine === 'mermaid' && mj.rendered === 1,
    `exit=${mermaidRun.code} engine=${mj.engine} rendered=${mj.rendered}`);

  const flatRun = runCli([flow, '-f', 'svg', '--json', '--quiet', '-o', path.join(outDir, 'flat')]);
  const flat = fs.readFileSync(path.join(outDir, 'flat', 'flowchart.svg'), 'utf8');
  record('cli/svg-flat', flatRun.code === 0 && !/fill="var\(/.test(flat) && /fill:#d7e4f4/i.test(flat),
    `exit=${flatRun.code} attrVar=${/fill="var\(/.test(flat)} processFill=${/fill:#d7e4f4/i.test(flat)}`);

  const themeRun = runCli([flow, '-f', 'svg', '--svg-themeable', '--json', '--quiet', '-o', path.join(outDir, 'th')]);
  const th = fs.readFileSync(path.join(outDir, 'th', 'flowchart.svg'), 'utf8');
  record('cli/svg-themeable', themeRun.code === 0 && th.includes('<style') && th.includes('--pele-bg'),
    `exit=${themeRun.code} style=${th.includes('<style')} vars=${th.includes('--pele-bg')}`);

  const v2 = path.join(outDir, 'v2.js');
  fs.writeFileSync(v2, `(theme) => { theme.vars.accent = '#B91C1C'; theme.shapes.process.fill = '#FEE2E2'; return theme; }`);
  const v2Run = runCli([flow, '--theme-js', v2, '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'v2')]);
  record('cli/theme-js-v2', v2Run.code === 0, `exit=${v2Run.code}`);

  const v1 = path.join(outDir, 'v1.js');
  fs.writeFileSync(v1, `(config) => { config.themeVariables.primaryColor = '#FF0000'; return config; }`);
  const v1Run = runCli([flow, '--theme-js', v1, '-f', 'png', '--quiet', '-o', path.join(outDir, 'v1')]);
  record('cli/theme-js-v1-error', v1Run.code === 2 && /ThemeSpec/.test(v1Run.stderr), `exit=${v1Run.code}`);

  const cfg = path.join(outDir, 'cfg.json');
  fs.writeFileSync(cfg, JSON.stringify({ fontSize: 18, themeVariables: { primaryColor: '#FF0000' } }));
  const cfgRun = runCli([flow, '--config', cfg, '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'cfg')]);
  const cj = JSON.parse(cfgRun.stdout || '{}') as { warnings?: Array<{ code: string }> };
  record('cli/config-warning', cfgRun.code === 0 && !!cj.warnings?.some((w) => w.code === 'config-ignored'),
    `exit=${cfgRun.code} warnings=${(cj.warnings || []).map((w) => w.code).join(',')}`);

  const big = path.join(outDir, 'big.mmd');
  fs.writeFileSync(big, 'flowchart LR\n%% ' + 'x'.repeat(51_000) + '\nA-->B\n');
  const autoRun = runCli([big, '--engine', 'auto', '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'auto')]);
  const aj = JSON.parse(autoRun.stdout || '{}') as { fallbacks?: number; rendered?: number };
  record('cli/engine-auto-fallback', autoRun.code === 0 && aj.fallbacks === 1 && aj.rendered === 1,
    `exit=${autoRun.code} fallbacks=${aj.fallbacks} rendered=${aj.rendered}`);

  const layoutRun = runCli([flow, '--layout', 'elk', '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'elk')]);
  const lj = JSON.parse(layoutRun.stdout || '{}') as { engine?: string };
  record('cli/layout-selects-mermaid', layoutRun.code === 0 && lj.engine === 'mermaid',
    `exit=${layoutRun.code} engine=${lj.engine}`);

  const conflictRun = runCli([flow, '--engine', 'pele', '--layout', 'elk', '--quiet']);
  record('cli/layout-conflict', conflictRun.code === 2 && /mermaid engine/.test(conflictRun.stderr),
    `exit=${conflictRun.code}`);

  const solidRun = runCli([flow, '-t', 'excalidraw', '-f', 'svg', '--json', '--quiet', '-o', path.join(outDir, 'ex-solid')]);
  const hachureRun = runCli([flow, '-t', 'excalidraw', '--style-fill', 'hachure', '-f', 'svg', '--json', '--quiet', '-o', path.join(outDir, 'ex-hachure')]);
  const solidPath = path.join(outDir, 'ex-solid', 'flowchart.svg');
  const hachurePath = path.join(outDir, 'ex-hachure', 'flowchart.svg');
  const solidSize = fs.existsSync(solidPath) ? fs.statSync(solidPath).size : 0;
  const hachureSize = fs.existsSync(hachurePath) ? fs.statSync(hachurePath).size : 0;
  record('cli/style-fill-hachure', solidRun.code === 0 && hachureRun.code === 0 && hachureSize > solidSize,
    `solid=${solidSize} hachure=${hachureSize}`);

  const badFill = runCli([flow, '-t', 'excalidraw', '--style-fill', 'nope', '--quiet']);
  record('cli/style-fill-bad', badFill.code === 2 && /solid\|hachure/.test(badFill.stderr), `exit=${badFill.code}`);

  const badTone = runCli([flow, '--tone', 'nope', '--quiet']);
  record('cli/tone-bad', badTone.code === 2 && /paper\|neutral\|product/.test(badTone.stderr), `exit=${badTone.code}`);

  const wrongFill = runCli([flow, '-t', 'tech', '--style-fill', 'hachure', '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'wrong-fill')]);
  const wj = JSON.parse(wrongFill.stdout || '{}') as { warnings?: Array<{ code: string; message: string }> };
  record('cli/style-fill-warning', wrongFill.code === 0 && !!wj.warnings?.some((w) => /only applies to the excalidraw/.test(w.message)),
    `exit=${wrongFill.code} warnings=${(wj.warnings || []).length}`);

  const exMermaid = runCli([flow, '-t', 'excalidraw', '--engine', 'mermaid', '-f', 'png', '--json', '--quiet', '-o', path.join(outDir, 'ex-mermaid')]);
  const emj = JSON.parse(exMermaid.stdout || '{}') as { rendered?: number; failed?: number };
  record('cli/excalidraw-mermaid', exMermaid.code === 0 && emj.rendered === 1 && emj.failed === 0,
    `exit=${exMermaid.code} rendered=${emj.rendered} failed=${emj.failed}`);

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
