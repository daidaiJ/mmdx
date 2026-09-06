// Generate one PNG per diagram type (mermaid + extensions) into review/
// for visual review. Run: bun scripts/make-review.ts
import fs from 'node:fs';
import path from 'node:path';
import { blockPage, cardToHtml, listToHtml, tableToHtml } from '../src/blocks.ts';
import { loadAssets } from '../src/embed.ts';
import { Renderer } from '../src/render.ts';
import { DEFAULT_THEME, PRESETS } from '../src/themes.ts';

const ROOT = path.join(import.meta.dir, '..');
const OUT = path.join(ROOT, 'review');
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
// extensions
const ext = async (file: string, kind: string, out: string): Promise<void> => {
  const src = fs.readFileSync(path.join(ROOT, 'tests', 'edge', file), 'utf8');
  const m = src.match(new RegExp('```' + kind + String.raw`\r?\n([\s\S]*?)` + '```'));
  if (!m) { console.log('skip', kind); return; }
  const inner = kind === 'table' ? tableToHtml(m[1]) : kind === 'card' ? cardToHtml(m[1]) : listToHtml(m[1]);
  const png = await r.renderHtml(blockPage(inner), '#FFFFFF');
  fs.writeFileSync(path.join(OUT, out), png);
  console.log('ok', out);
};
await ext('table.md', 'table', 'ext-table.png');
await ext('list.md', 'list', 'ext-list.png');
await ext('card.md', 'card', 'ext-card.png');
await r.close();
console.log('done →', OUT);
