// Render one case in each built-in theme and build the overview strips.
// Writes the per-theme scene pages (flow / kpi / cards / table), the HTML report
// card and info card samples, the three info-card tones, plus overview.png and
// all-themes-overview.png.
// Run: node --experimental-transform-types --no-warnings scripts/make-gallery.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockPage, htmlKindToInner, type Caption } from '../src/blocks.ts';
import { parseCardMarkdown, renderCardDoc } from '../src/card.ts';
import { loadAssets } from '../src/embed.ts';
import { Renderer } from '../src/render.ts';
import { getTheme, PRESETS, type ThemeSpec } from '../src/themes.ts';
import type { ToneName } from '../src/tone.ts';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'docs', 'gallery');
const CASE = path.join(ROOT, 'examples', 'gallery', 'release-review.md');

const THEMES = ['tech', 'openai', 'excalidraw'] as const;

const THEME_LABELS: Record<string, string> = {
  tech: '通用方案文档',
  openai: '近单色 / 薄荷点缀',
  excalidraw: '白板讨论',
};

type SceneKind = 'mermaid' | 'kpi' | 'card' | 'table';

interface Scene {
  key: string;
  kind: SceneKind;
  caption: Caption;
}

const SCENES: Scene[] = [
  {
    key: 'flow',
    kind: 'mermaid',
    caption: { title: '发布流程', subtitle: '灰度、校验、回滚在同一条流水线上' },
  },
  {
    key: 'kpi',
    kind: 'kpi',
    caption: { title: '核心指标', subtitle: '发布后 24 小时', source: '线上监控' },
  },
  {
    key: 'cards',
    kind: 'card',
    caption: { title: '运行机制', subtitle: '把发布风险拆成四道闸门' },
  },
  {
    key: 'table',
    kind: 'table',
    caption: { title: '遗留项', subtitle: '复盘后两周内关闭', source: '发布复盘 2026-10' },
  },
];

const md = fs.readFileSync(CASE, 'utf8');
const fence = (lang: string): string => {
  const m = md.match(new RegExp('```' + lang + String.raw`\r?\n([\s\S]*?)` + '```'));
  if (!m) throw new Error(`missing ${lang} fence in ${path.relative(ROOT, CASE)}`);
  return m[1];
};

const code: Record<SceneKind, string> = {
  mermaid: fence('mermaid'),
  kpi: fence('kpi'),
  card: fence('card'),
  table: fence('table'),
};

fs.mkdirSync(OUT, { recursive: true });
const r = await Renderer.create(await loadAssets(), { scale: 2, width: 1200 });

const renderRaw = async (theme: ThemeSpec, diagram: string): Promise<Buffer> => {
  const { png } = await r.render({
    code: diagram, background: theme.background, needPng: true,
    scale: 2, width: 1200, theme,
    mermaidConfig: (PRESETS[theme.name]?.config ?? {}) as Record<string, unknown>,
    fontSize: 15, padding: 0, svgThemeable: false, titlePos: 'top', titleText: '',
    remap: PRESETS[theme.name]?.remap,
  });
  if (!png) throw new Error(`no PNG for ${theme.name}`);
  return png;
};

const renderDiagram = async (theme: ThemeSpec, scene: Scene): Promise<Buffer> => {
  const { svg } = await r.render({
    code: code.mermaid, background: theme.background, needPng: false,
    scale: 2, width: 1200, theme,
    mermaidConfig: (PRESETS[theme.name]?.config ?? {}) as Record<string, unknown>,
    fontSize: 15, padding: 0, svgThemeable: false, titlePos: 'top', titleText: '',
    remap: PRESETS[theme.name]?.remap,
  });
  return r.renderHtml(
    blockPage(`<div class="fig">${svg}</div>`, { blockCss: theme.blockCss, caption: scene.caption }),
    theme.background,
  );
};

const renderBlock = async (theme: ThemeSpec, scene: Scene): Promise<Buffer> => {
  const kind = scene.kind as Exclude<SceneKind, 'mermaid'>;
  const inner = htmlKindToInner(kind, code[kind]);
  return r.renderHtml(
    blockPage(inner, { blockCss: theme.blockCss, caption: scene.caption }),
    theme.background,
  );
};

for (const name of THEMES) {
  const theme = getTheme(name);
  for (const scene of SCENES) {
    const png = scene.kind === 'mermaid'
      ? await renderDiagram(theme, scene)
      : await renderBlock(theme, scene);
    const out = path.join(OUT, `${name}-${scene.key}.png`);
    fs.writeFileSync(out, png);
    console.log('ok', path.relative(ROOT, out));
  }
}

// The two imported HTML skills, shown across the built-in themes:
//  - a composite HTML report (card + KPI + table fences)
//  - the same Markdown info card through `mmdx card`
const HTML_SKILL_THEMES: Array<{ name: string; tone: ToneName }> = [
  { name: 'tech', tone: 'neutral' },
  { name: 'openai', tone: 'neutral' },
  { name: 'excalidraw', tone: 'neutral' },
];

const reportCaption: Caption = {
  title: '发布复盘报告',
  subtitle: 'HTML 报告卡 skill · 同一组 card / KPI / table 块',
  source: 'Open Design · mmdx',
  unit: '示例数据',
};

const reportInner =
  '<div style="display:flex;flex-direction:column;gap:22px;align-items:flex-start">' +
  htmlKindToInner('kpi', code.kpi) +
  htmlKindToInner('card', code.card) +
  htmlKindToInner('table', code.table) +
  '</div>';

{
  const doc = parseCardMarkdown(fs.readFileSync(path.join(ROOT, 'examples', 'gallery', 'info-card.md'), 'utf8'));
  for (const { name, tone } of HTML_SKILL_THEMES) {
    const theme = getTheme(name);
    const report = await r.renderHtml(
      blockPage(reportInner, {
        blockCss: theme.blockCss,
        caption: reportCaption,
        tone: 'neutral',
      }),
      theme.background,
    );
    const reportFile = path.join(OUT, `html-report-${name}.png`);
    fs.writeFileSync(reportFile, report);
    console.log('ok', path.relative(ROOT, reportFile));

    const pages = await renderCardDoc(r, doc, {
      themeName: name, tone, width: 600, scale: 2, maxHeight: 1200,
    });
    const cardFile = path.join(OUT, `info-card-${name}.png`);
    fs.writeFileSync(cardFile, pages[0]);
    console.log('ok', path.relative(ROOT, cardFile));
  }
}

// Tone comparison for the imported info-card template: same palette, three
// structural directions.
{
  const doc = parseCardMarkdown(fs.readFileSync(path.join(ROOT, 'examples', 'gallery', 'info-card.md'), 'utf8'));
  for (const tone of ['paper', 'neutral', 'product'] as ToneName[]) {
    const pages = await renderCardDoc(r, doc, {
      themeName: 'openai', tone, width: 600, scale: 2, maxHeight: 1200,
    });
    const out = path.join(OUT, `card-tone-${tone}.png`);
    fs.writeFileSync(out, pages[0]);
    console.log('ok', path.relative(ROOT, out));
  }
}

// The overview stays readable at README width: a compact top-down version of
// the same release flow, rendered raw (no caption chrome) per style.
const OVERVIEW_FLOW = `flowchart TD
  A[需求冻结] --> B[灰度 5%]
  B --> C{错误率 < 1%?}
  C -- 是 --> D[全量发布]
  C -- 否 --> E[自动回滚]
`;

const overviewThemes = THEMES.slice(0, 3);
const overviewPng: Record<string, Buffer> = {};
for (const name of overviewThemes) {
  overviewPng[name] = await renderRaw(getTheme(name), OVERVIEW_FLOW);
  console.log('overview tile', name, `${overviewPng[name].readUInt32BE(16)}x${overviewPng[name].readUInt32BE(20)}`);
}

const strip = overviewThemes.map((name) =>
  `<figure><figcaption><b>${name}</b><span>${THEME_LABELS[name]}</span></figcaption>` +
  `<img src="data:image/png;base64,${overviewPng[name].toString('base64')}"></figure>`,
).join('');

const overview = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#F6F7F9}
.wrap{width:1080px;box-sizing:border-box;padding:24px 26px 26px;background:#F6F7F9;
  font-family:"Inter","Segoe UI","Noto Sans SC",sans-serif;color:#1B1F26}
h1{margin:0 0 4px;font-size:18px;font-weight:600}
p{margin:0 0 18px;font-size:12px;color:#5B6470}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
figure{margin:0;background:#fff;border:1px solid #DCE1E7;border-radius:12px;padding:10px;overflow:hidden}
figcaption{display:flex;justify-content:space-between;align-items:baseline;
  font-size:12px;padding:0 2px 8px;color:#1B1F26}
figcaption span{color:#8A919C;font-size:10px;font-family:"Cascadia Code",Consolas,monospace}
img{display:block;width:auto;max-width:100%;height:auto;margin:0 auto;border-radius:6px}
</style></head><body><div class="wrap">
<h1>一个案例，三种风格</h1>
<p>灰度发布复盘 · 流程图快速对比 — 完整四场景见各风格分页。</p>
<div class="grid">${strip}</div>
</div></body></html>`;

const hero = await r.renderHtml(overview, '#F6F7F9');
const heroFile = path.join(OUT, 'overview.png');
fs.writeFileSync(heroFile, hero);
console.log('ok', path.relative(ROOT, heroFile));

// All built-in themes in one grid. The per-theme pages have larger samples;
// this is the "nothing is missing" overview.
{
  const names = THEMES;
  const tiles: Record<string, Buffer> = {};
  for (const name of names) tiles[name] = await renderRaw(getTheme(name), OVERVIEW_FLOW);
  const strip = names.map((name) =>
    `<figure><figcaption><b>${name}</b><span>${THEME_LABELS[name] ?? ''}</span></figcaption>` +
    `<img src="data:image/png;base64,${tiles[name].toString('base64')}"></figure>`,
  ).join('');
  const allOverview = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#F6F7F9}
.wrap{width:1440px;box-sizing:border-box;padding:28px 30px 30px;background:#F6F7F9;
  font-family:"Inter","Segoe UI","Noto Sans SC",sans-serif;color:#1B1F26}
h1{margin:0 0 4px;font-size:20px;font-weight:600}
p{margin:0 0 20px;font-size:13px;color:#5B6470}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
figure{margin:0;background:#fff;border:1px solid #DCE1E7;border-radius:12px;padding:10px;overflow:hidden}
figcaption{display:flex;flex-direction:column;gap:2px;font-size:13px;padding:0 2px 9px;color:#1B1F26}
figcaption span{color:#8A919C;font-size:10px;line-height:1.3}
img{display:block;width:auto;max-width:100%;height:auto;margin:0 auto;border-radius:6px}
</style></head><body><div class="wrap">
<h1>3 套内置主题总览</h1>
<p>同一份灰度发布流程 · tech（默认）/ openai / excalidraw 各一张 · 分页中有更大的流程图与块版式样例。</p>
<div class="grid">${strip}</div>
</div></body></html>`;
  const png = await r.renderHtml(allOverview, '#F6F7F9');
  const f = path.join(OUT, 'all-themes-overview.png');
  fs.writeFileSync(f, png);
  console.log('ok', path.relative(ROOT, f));
}

await r.close();
