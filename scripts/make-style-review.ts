// Generate style review images for the three built-in presets.
// Run: node --experimental-transform-types --no-warnings scripts/make-style-review.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockPage, htmlKindToInner, type BlockKind } from '../src/blocks.ts';
import { parseCardMarkdown, renderCardDoc } from '../src/card.ts';
import { chartToMermaid, parseChart } from '../src/chart.ts';
import { loadAssets } from '../src/embed.ts';
import { Renderer } from '../src/render.ts';
import { getTheme, type ThemeSpec } from '../src/themes.ts';
import { accentTint, type Tokens } from '../src/tokens.ts';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'review', 'styles');
fs.mkdirSync(OUT, { recursive: true });

const r = await Renderer.create(await loadAssets(), { scale: 2, width: 1200 });
const themes = ['tech', 'openai', 'excalidraw', 'ios', 'acnh', 'glass', 'epaper', 'zed', 'zed-light'] as const;
const diagrams = ['flowchart', 'state', 'class', 'er'] as const;
const blocks: Array<[BlockKind, string]> = [['card', 'card.md'], ['kpi', 'kpi.md'], ['table', 'table.md']];
const galleryCase = fs.readFileSync(path.join(ROOT, 'examples', 'gallery', 'release-review.md'), 'utf8');
const pie = chartToMermaid(parseChart(galleryCase.match(/```chart\r?\n([\s\S]*?)```/)![1]));

const tokensFor = (t: ThemeSpec): Tokens => ({
  paper: t.vars.bg, ink: t.vars.fg, muted: t.vars.muted, rule: t.vars.border,
  accent: t.vars.accent, accentTint: accentTint(t.vars.accent, t.vars.bg), paper2: t.vars.surfaceAlt,
});

const src = (f: string): string => fs.readFileSync(path.join(ROOT, 'tests', 'diagrams', `${f}.md`), 'utf8')
  .match(/```mermaid\r?\n([\s\S]*?)```/)![1];

const fence = (file: string, kind: string): string =>
  fs.readFileSync(path.join(ROOT, 'tests', 'edge', file), 'utf8')
    .match(new RegExp('```' + kind + String.raw`\r?\n([\s\S]*?)` + '```'))![1];

const renderDiagram = async (theme: ThemeSpec, code: string, hachure = false): Promise<Buffer> => {
  const spec: ThemeSpec = hachure
    ? { ...theme, style: { ...(theme.style ?? {}), fillStyle: 'hachure' } }
    : theme;
  const { png } = await r.render({
    code, background: theme.background, needPng: true, scale: 2, width: 1200,
    theme: spec, mermaidConfig: {}, fontSize: 15, padding: 0,
    svgThemeable: false, titlePos: 'top', titleText: '',
  });
  if (!png) throw new Error('no png');
  return png;
};

const writeSheet = async (themeName: string, items: Array<{ file: string; caption: string }>, dir: string, cols = 2): Promise<void> => {
  const tiles = items.map(({ file, caption }) => {
    const b64 = fs.readFileSync(file).toString('base64');
    return `<figure><figcaption>${caption}</figcaption><img src="data:image/png;base64,${b64}"></figure>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#F4F6F8}
.wrap{display:block;padding:28px;background:#F4F6F8;font-family:"Noto Sans SC",-apple-system,"Segoe UI",sans-serif;color:#1B1F26}
h1{font-size:22px;margin:0 0 6px}p{font-size:13px;color:#5B6470;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:18px}
figure{margin:0;background:#fff;border:1px solid #DCE1E7;border-radius:10px;padding:12px;min-width:0;overflow:hidden}
figcaption{font-size:13px;font-weight:600;margin-bottom:8px}
img{display:block;width:100%;max-width:100%;height:auto;border-radius:6px}
</style></head><body><div class="wrap">
<h1>mmdx 样式预览 — ${themeName}</h1>
<p>主题日常出图，2x 渲染，供目测审核。</p>
<div class="grid">${tiles}</div>
</div></body></html>`;
  const sheet = await r.renderHtml(html, '#F4F6F8');
  const out = path.join(dir, 'review-sheet.png');
  fs.writeFileSync(out, sheet);
  console.log('sheet →', path.relative(ROOT, out));
};

for (const name of themes) {
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  const theme = getTheme(name);
  const items: Array<{ file: string; caption: string }> = [];
  for (const d of diagrams) {
    const file = path.join(dir, `${d}.png`);
    fs.writeFileSync(file, await renderDiagram(theme, src(d)));
    items.push({ file, caption: `${name} · ${d}` });
    console.log('ok', path.relative(ROOT, file));
  }
  {
    const file = path.join(dir, 'pie.png');
    fs.writeFileSync(file, await renderDiagram(theme, pie));
    items.push({ file, caption: `${name} · pie（系列色）` });
    console.log('ok', path.relative(ROOT, file));
  }
  for (const [kind, file] of blocks) {
    const inner = htmlKindToInner(kind, fence(file, kind));
    const png = await r.renderHtml(
      blockPage(inner, { blockCss: theme.blockCss, tokens: tokensFor(theme) }),
      theme.background,
    );
    const out = path.join(dir, `${kind}.png`);
    fs.writeFileSync(out, png);
    items.push({ file: out, caption: `${name} · ${kind}` });
    console.log('ok', path.relative(ROOT, out));
  }
  if (name === 'excalidraw') {
    const file = path.join(dir, 'flowchart-hachure.png');
    fs.writeFileSync(file, await renderDiagram(theme, src('flowchart'), true));
    items.push({ file, caption: `${name} · flowchart (hachure)` });
    console.log('ok', path.relative(ROOT, file));
  }
  await writeSheet(name, items, dir);
}

// One sheet with a column per theme, so the Zed pair can be judged against the
// default in a single look instead of across five per-theme sheets.
{
  const dir = path.join(OUT, 'zed-compare');
  fs.mkdirSync(dir, { recursive: true });
  const names = ['tech', 'zed', 'zed-light'] as const;
  const items: Array<{ file: string; caption: string }> = [];
  const row = async (label: string, render: (t: ThemeSpec, file: string) => Promise<void>): Promise<void> => {
    for (const name of names) {
      const file = path.join(dir, `${label}-${name}.png`);
      await render(getTheme(name), file);
      items.push({ file, caption: `${name} · ${label}` });
    }
  };
  await row('flowchart', async (theme, file) => {
    fs.writeFileSync(file, await renderDiagram(theme, src('flowchart')));
  });
  await row('card', async (theme, file) => {
    const inner = htmlKindToInner('card', fence('card.md', 'card'));
    fs.writeFileSync(file, await r.renderHtml(
      blockPage(inner, { blockCss: theme.blockCss, tokens: tokensFor(theme) }), theme.background));
  });
  await writeSheet('zed vs tech', items, dir, 3);
}

// The five light presets side by side: these are the ones that can read as each
// other at thumbnail size, so they get their own sheet.
{
  const dir = path.join(OUT, 'light-compare');
  fs.mkdirSync(dir, { recursive: true });
  const names = ['tech', 'openai', 'ios', 'glass', 'zed-light'] as const;
  const items: Array<{ file: string; caption: string }> = [];
  const row = async (label: string, render: (t: ThemeSpec, file: string) => Promise<void>): Promise<void> => {
    for (const name of names) {
      const file = path.join(dir, `${label}-${name}.png`);
      await render(getTheme(name), file);
      items.push({ file, caption: `${name} · ${label}` });
    }
  };
  await row('flowchart', async (theme, file) => {
    fs.writeFileSync(file, await renderDiagram(theme, src('flowchart')));
  });
  await row('pie', async (theme, file) => {
    fs.writeFileSync(file, await renderDiagram(theme, pie));
  });
  await row('card', async (theme, file) => {
    const inner = htmlKindToInner('card', fence('card.md', 'card'));
    fs.writeFileSync(file, await r.renderHtml(
      blockPage(inner, { blockCss: theme.blockCss, tokens: tokensFor(theme) }), theme.background));
  });
  await writeSheet('light presets', items, dir, 5);
}

await r.close();
