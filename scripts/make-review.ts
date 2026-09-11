// Generate one PNG per diagram type (mermaid + extensions) into review/
// for visual review. Extension samples are also written to docs/ext-*.png
// (the gallery in docs/EXTENSIONS.md). Run: bun scripts/make-review.ts
import fs from 'node:fs';
import path from 'node:path';
import { blockPage, htmlKindToInner, mergeCaption, type BlockKind } from '../src/blocks.ts';
import { chartToMermaid, parseChart } from '../src/chart.ts';
import { loadAssets } from '../src/embed.ts';
import { Renderer } from '../src/render.ts';
import { DEFAULT_THEME, PRESETS } from '../src/themes.ts';

const ROOT = path.join(import.meta.dir, '..');
const OUT = path.join(ROOT, 'review');
const DOCS = path.join(ROOT, 'docs');
fs.mkdirSync(OUT, { recursive: true });

const preset = PRESETS[DEFAULT_THEME as keyof typeof PRESETS];
const config = JSON.parse(JSON.stringify(preset.config)) as Record<string, unknown>;
const r = await Renderer.create(await loadAssets(), { layout: 'elk', scale: 2, width: 1200 });

for (const f of fs.readdirSync(path.join(ROOT, 'tests', 'diagrams')).filter((x) => x.endsWith('.md'))) {
  const src = fs.readFileSync(path.join(ROOT, 'tests', 'diagrams', f), 'utf8');
  const m = src.match(/```mermaid\n([\s\S]*?)```/);
  if (!m) continue;
  try {
    const { png } = await r.render(m[1], config, '#FFFFFF', true, undefined, undefined, preset.remap);
    if (png) fs.writeFileSync(path.join(OUT, `${f.replace('.md', '')}.png`), png);
    console.log('ok', f);
  } catch (e) { console.log('ERR', f, e instanceof Error ? e.message.slice(0, 60) : e); }
}

const EXT: Array<{ file: string; kind: BlockKind; out: string }> = [
  { file: 'table.md', kind: 'table', out: 'ext-table.png' },
  { file: 'list.md', kind: 'list', out: 'ext-list.png' },
  { file: 'card.md', kind: 'card', out: 'ext-card.png' },
  { file: 'chart-bar.md', kind: 'chart', out: 'ext-chart.png' },
  { file: 'kpi.md', kind: 'kpi', out: 'ext-kpi.png' },
  { file: 'compare.md', kind: 'compare', out: 'ext-compare.png' },
  { file: 'funnel.md', kind: 'funnel', out: 'ext-funnel.png' },
  { file: 'task.md', kind: 'task', out: 'ext-task.png' },
  { file: 'progress.md', kind: 'progress', out: 'ext-progress.png' },
  { file: 'swimlane.md', kind: 'swimlane', out: 'ext-swimlane.png' },
];

const fence = (file: string, kind: string): string | null => {
  const src = fs.readFileSync(path.join(ROOT, 'tests', 'edge', file), 'utf8');
  const m = src.match(new RegExp('```' + kind + String.raw`\r?\n([\s\S]*?)` + '```'));
  return m ? m[1] : null;
};

const writeExt = (name: string, png: Buffer): void => {
  fs.writeFileSync(path.join(OUT, name), png);
  fs.writeFileSync(path.join(DOCS, name), png);
};

for (const { file, kind, out } of EXT) {
  const code = fence(file, kind);
  if (!code) { console.log('skip', kind); continue; }
  try {
    if (kind === 'chart') {
      const spec = parseChart(code);
      const { svg } = await r.render(chartToMermaid(spec), config, '#FFFFFF', false, 'top', '', preset.remap);
      const cap = mergeCaption({}, { title: spec.title, source: spec.source, unit: spec.unit });
      const png = await r.renderHtml(blockPage(`<div class="fig">${svg}</div>`, { caption: cap }), '#FFFFFF');
      writeExt(out, png);
    } else {
      const png = await r.renderHtml(blockPage(htmlKindToInner(kind, code)), '#FFFFFF');
      writeExt(out, png);
    }
    console.log('ok', out);
  } catch (e) {
    console.log('ERR', out, e instanceof Error ? e.message.slice(0, 80) : e);
  }
}

await r.close();
console.log('done →', OUT, '+ docs/ext-*.png');
