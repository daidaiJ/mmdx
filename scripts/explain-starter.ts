// Generate skill/explain/kit/starter-<register>.html — self-contained page
// starters (kit.css + defs.svg + the register's Latin fonts as data-URL
// @font-face). This IS the kit-inlining step of route D (docs/research-
// visual-explainer.md §5.3): no renderer ships, so the starter carries what
// render.mjs used to inline. CJK needs nothing here — mmdx injects Noto Sans
// SC / Noto Serif SC / LXGW WenKai at render time (src/render.ts).
// Run: bun run scripts/explain-starter.ts
import fs from 'node:fs';
import path from 'node:path';

const KIT = path.join(import.meta.dir, '..', 'skill', 'explain', 'kit');

type Face = { file: string; family: string; weight: string; style?: string };

// Latin families per register (visual-explainer v0.14.0 FONTS table); VF
// files carry the whole weight axis, weight ranges overclaim harmlessly
// (browsers clamp to the axis). IBM Plex Mono has no VF on Google Fonts.
const REGISTERS: Record<string, Face[]> = {
  instrument: [
    { file: 'Geist-VF.woff2', family: 'Geist', weight: '100 900' },
    { file: 'GeistMono-VF.woff2', family: 'Geist Mono', weight: '100 900' },
  ],
  blueprint: [
    { file: 'IBMPlexSans-VF.woff2', family: 'IBM Plex Sans', weight: '100 900' },
    { file: 'IBMPlexMono-400.woff2', family: 'IBM Plex Mono', weight: '400' },
    { file: 'IBMPlexMono-500.woff2', family: 'IBM Plex Mono', weight: '500' },
    { file: 'IBMPlexMono-600.woff2', family: 'IBM Plex Mono', weight: '600' },
  ],
  paper: [
    { file: 'Newsreader-VF.woff2', family: 'Newsreader', weight: '100 900' },
    { file: 'AtkinsonNext-VF.woff2', family: 'Atkinson Hyperlegible Next', weight: '100 900' },
    { file: 'AtkinsonMono-VF.woff2', family: 'Atkinson Hyperlegible Mono', weight: '100 900' },
  ],
  editorial: [
    { file: 'InstrumentSerif-Regular.woff2', family: 'Instrument Serif', weight: '400' },
    { file: 'InstrumentSerif-Italic.woff2', family: 'Instrument Serif', weight: '400', style: 'italic' },
    { file: 'InstrumentSans-VF.woff2', family: 'Instrument Sans', weight: '100 900' },
    { file: 'JetBrainsMono-VF.woff2', family: 'JetBrains Mono', weight: '100 900' },
  ],
};

const body = (register: string) => `  <!-- mmdx explain starter · register: ${register} · 由 scripts/explain-starter.ts 生成
       保留 head 与字体、kit 内联块不动；只编辑 main 元素里的内容（注意：本注释不含任何标签字面量，便于脚本拼接）。
       写作纪律与图型画法：references/style-guide.md + diagrams.md；本骨架源自 references/kit.md。 -->
  ${fs.readFileSync(path.join(KIT, 'defs.svg'), 'utf8').trim()}
  <main>
    <header>
      <p class="eyebrow">主题域（如：读路径）</p>
      <h1>一句话主张——标题即结论，不是话题</h1>
      <p class="lead">一段导语。<b>一个关键短语。</b>中文正文走内嵌黑体，无需处理。</p>
      <p class="meta">服务 · 来源 · 时间范围</p>
    </header>

    <figure>
      <div class="frame"><svg class="ve-svg" viewBox="0 0 800 300" role="img" aria-label="这张图说明什么"><path class="ve-e" d="M60 150H320" marker-end="url(#ve-ah)"/><g class="ve-n" transform="translate(40 110)"><rect class="sh" width="150" height="80" rx="6"/><text x="75" y="45">节点</text></g><!-- 按 references/diagrams.md 画 --></svg></div>
      <figcaption><span class="fig-n">Fig. 1</span>图的结论一句话（caption 是主张，不是描述）。</figcaption>
    </figure>

    <section>
      <div class="sec-head"><p class="ve-label caps">分组标签</p><h2>小节结论式标题</h2></div>
      <figure>
        <div class="kpis">
          <div class="kpi"><span class="ve-label">指标 · 7 天</span><span class="val">94<span class="unit">%</span></span>
            <svg class="ve-waffle" viewBox="0 0 200 100" role="img" aria-label="100 格中 94 格点亮"><rect width="100" height="90" fill="url(#ve-w-on)"/><rect y="90" width="40" height="10" fill="url(#ve-w-on)"/><rect x="40" y="90" width="60" height="10" fill="url(#ve-w-off)"/><path class="ann" d="M104 91H114"/><text x="118" y="91">6 未命中</text></svg></div>
        </div>
        <figcaption><span class="fig-n">Fig. 2</span>数字要有对应的形。</figcaption>
      </figure>
    </section>

    <section class="sources" aria-label="Sources">
      <p class="ve-label caps">Sources</p>
      <p><code>src/cache/user.ts:14–52</code> · 面板「读路径」，近 7 天。</p>
    </section>
  </main>
`;

for (const [register, faces] of Object.entries(REGISTERS)) {
  const fontCss = faces.map((f) => {
    const b64 = fs.readFileSync(path.join(KIT, 'fonts', f.file)).toString('base64');
    return `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:${f.style ?? 'normal'};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
  }).join('');
  const kitCss = fs.readFileSync(path.join(KIT, 'kit.css'), 'utf8');
  const html = `<!DOCTYPE html>
<html lang="zh-CN" data-register="${register}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>一句话主张</title>
<style data-ve-kit>
/* kit.css — visual-explainer v0.14.0 (MIT), verbatim */
${kitCss}</style>
<style data-ve-fonts>
${fontCss}
</style>
</head>
<body>
${body(register)}</body>
</html>
`;
  const out = path.join(KIT, `starter-${register}.html`);
  fs.writeFileSync(out, html);
  console.log(`${(html.length / 1024).toFixed(0).padStart(4)} KB  ${out}`);
}
