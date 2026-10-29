# 后续：移植 Zed 的 Mermaid 渲染与「图 / 源码」切换

> 状态：调研 · 2026-10-29（只读源码，未动 mmdx 代码）
> 对象：Zed 的 mermaid 支持（`crates/mermaid_render`，GPL-3.0-or-later，只读设计、不搬代码）、上游引擎 [Latias94/merman](https://github.com/Latias94/merman)（MIT OR Apache-2.0）
> 前提：mmdx 引擎固定 Pele（浏览器内渲染 → SVG 序列化 / PNG 截图裁切），产物是 PNG 与 SVG 文件，没有 HTML 产物

## 结论先行

Zed 的 mermaid 支持是两层，价值差别很大：

1. **交互层（值得先做）**——每个 mermaid 块是一个小状态机：顶部「Preview / Code」两个 tab、悬停出现的复制按钮、只在偏离自然尺寸时才出现的「Zoom NNN% + 复位」、渲染失败直接显示源码、缩放时先沿用旧栅格不闪白。这一层不依赖换引擎，mmdx 缺的正是它：把「图 / 源码」切换做成 HTML 图块产物，博客与文档站点贴上去就有（§3）。
2. **引擎层（列为后续）**——Zed 不跑浏览器：纯 Rust 的 `merman` 出 Mermaid parity SVG，再用 usvg/resvg 栅格化，GPUI 原生绘制。换成这套要重做中文字体、手绘、lint 与 PNG 裁切，且扩展块与 HTML 整页截图仍需 Chromium，去不掉浏览器依赖（§4）。

一句话：**先吸收交互，引擎换 merman 留作后续评估**。

## 1. Zed 的实现事实

### 1.1 引擎：headless merman，不是浏览器

| 事实 | 证据（zed-industries/zed，main 分支 2026-10-29 读） |
| --- | --- |
| markdown crate 依赖自研的 `mermaid_render` | `crates/markdown/Cargo.toml` |
| `mermaid_render` 依赖 `merman`（features `layout-cytoscape` + `svg`）、`quick-xml`、`serde_json`；dev-dep `usvg` | `crates/mermaid_render/Cargo.toml` |
| 两段式：`render_to_svg = merman 出图 → quick-xml 事件流后处理` | `crates/mermaid_render/src/mermaid_render.rs:179` |
| 后处理只做主题：注入 `zed-accent-N` class 与对应 CSS；颜色规则留在自己的 crate | `mermaid_render.rs` 头注释 §Color handling |
| 假设输出会被 usvg/resvg 栅格化，并针对 usvg/resvg 的怪癖做过调整；merman 0.6 起改用其 raster-safe SVG pipeline | `mermaid_render.rs:20-28` |
| 主题是 40+ 色槽的结构体（背景 / 主色 / 边 / 集群 / note / actor / activation / git 分支 8 色 / ER 奇偶行 / error / warning）外加 `accent_colors`（取自主题的 player colors） | `mermaid_render.rs:79-106` |
| 历史：更早用的是 `mermaid-rs` | `mermaid_render.rs:17` |
| 栅格化在 `SvgRenderer::render_parsed`，按显示倍率重新栅格（`SMOOTH_SVG_SCALE_FACTOR` × 缩放） | `crates/markdown/src/mermaid.rs:510-524` |

上游 `merman` 的对外事实（merman 仓库文档）：

- 「Mermaid.js, but headless, in Rust」，发布版 `0.9.2` 对齐 Mermaid 12.1，开发分支目标 12.2（对齐仪表盘里另有一份 11.16 对比基线——口径不一致，落地前以 `merman-cli capabilities --json` 为准）。
- CLI 叫 `merman-cli`（不装 `mmdc` 别名）；`render` 直接出 `svg|png|jpg|pdf`；Node 侧是实验性的 `@mermanjs/node`（N-API，只出 SVG，不出 PNG）。
- 默认确定性文本度量；要真实字体度量得显式给 `--font-file` / `--font-dir`（ttf/otf），或 `--font-measurement native` / `--font-system on`。**不随附字体，SVG 既不嵌字体也不转轮廓。**
- 手绘由 Rust 的 `roughr` 实现；官方把「JS RoughJS vs Rust roughr 的路径几何差异」列为 documented residual。
- 默认 features 带 ELK（EPL-2.0）与对应 notice 义务；只出 SVG 可 `default-features = false, features = ["all-diagrams","svg"]` 绕开。
- 被 Zed 采用：merman README 标注「Used by Zed」，指向合并的 zed-industries/zed#57644。

### 1.2 交互：每个 mermaid 块一个状态机

| 设计点 | 行为 | 证据 |
| --- | --- | --- |
| 图 / 源码两个 tab | 块顶部「Preview」「Code」两个 toggle 按钮，选中态用强调色 tint | `crates/markdown/src/mermaid.rs:807` |
| 状态按源码偏移隔离 | `mermaid_views: HashMap<usize, MermaidViewState>`，同页多图各切各的 | `markdown.rs:511`、`markdown.rs:804` |
| 渲染失败 → 只显示源码 | 失败分支不出 tab、不出空图，直接渲染源码块（仍保留复制按钮） | `mermaid.rs:646` |
| 渲染中 → 沿用旧栅格 | `fallback_image` + `rasterized_scale`：换图时按同样逻辑尺寸显示旧图，避免闪白 | `mermaid.rs:46-56`、`mermaid.rs:660` |
| 缩放 | 滚动手势步进 0.1、上限 2.0、接近 1.0 吸附、300ms 防抖后按显示倍率从缓存的 parsed SVG 重新栅格化 | `markdown.rs:59-63`、`markdown.rs:839` |
| 缩放读数 | 只有偏离自然尺寸时才出现「Zoom NNN%」+ 复位按钮，兼作「可复位」的提示 | `mermaid.rs:886` |
| 复制 | 悬停出现复制按钮，复制的是 mermaid 源码 | `mermaid.rs:924` |
| 缓存 | 按源码内容 keyed（重复图共用一份）；订阅主题变化后清缓存重渲染 | `markdown.rs:778` |
| 图型白名单 | 15 种（flowchart / graph / sequence / class / state / state-v2 / er / gantt / pie / gitGraph / mindmap / timeline / quadrant / xychart / journey）；**merman 支持的其它图型故意不渲染**，因为还没写自定义 CSS 保证文字可读 | `mermaid.rs:429` |
| fence info 参数 | fence 写成 `mermaid 150` 时，第二个 token 是缩放百分比（默认 100，clamp 10–500） | `mermaid.rs:414` |
| 引用外部文件 | fence 的 info 是路径（含 `/`）且扩展名是 `.mermaid` / `.mmd` 时按图渲染 | `parser.rs:431`、`mermaid.rs:479` |
| 设置 | `render_mermaid_diagrams`（默认 true）、`mermaid_font_family`（markdown preview 与 agent panel 共用） | `assets/settings/default.json:82`、`markdown_preview_view.rs:398` |

交互长这样（按源码复刻，非截图）：

```
[Preview] [Code]                     ← tab 常驻，默认选中 Preview
Zoom 140% ⟲                          ← 只在偏离 100% 时出现
图 或 源码                            ← 渲染失败时这里只有源码，且没有 tab
```

## 2. mmdx 现状对照

| Zed 的设计 | mmdx 现状 | 可移植性 |
| --- | --- | --- |
| 引擎 headless | Pele 在 Chromium 页面内渲染；PNG 走整页截图 + 像素裁切（`src/render.ts`、`src/engine/pele.ts`、`src/capture.ts`） | 需换引擎，见 §4 |
| 图 / 源码切换 | 无：产物是 PNG / SVG 文件，读者只能看到图 | ✅ HTML 图块产物，见 §3 |
| 失败回退源码 | 解析失败直接 exit 1（AGENT_GUIDE：`Parsing error`） | ✅ HTML 产物里可保留源码 + 一行错误 |
| 图型白名单 | 隐式：Pele 的支持范围就是白名单 | ✅ 在 HTML 产物里显式化 |
| 每块缩放 | 只有全局 `--scale`；`FENCE_RE` 只取 info 的第一个 token，其余忽略（`src/cli.ts:254`） | ✅ 可加 info 参数 |
| 引用外部 `.mmd` | 无 | ⚠️ 可选，文档站点收益一般 |
| 复制按钮 | 无 | ✅ HTML 产物里可加 |
| 主题跟随宿主 | `--svg-themeable` 保留 `--pele-*` 变量，默认烘焙成 hex | ✅ 博客暗色模式可用一份 SVG 切换 |

## 3. 可落地方案：HTML 图块产物（图 / 源码切换）

### 3.1 产物形态

给 CLI 加一个 HTML 产物档（例如 `-f html`），每张图产出一个自包含 figure：内联 SVG + 源码 + 两个无 JS 的 tab。

```html
<figure class="mmdx-fig">
  <input type="radio" name="mmdx-1" id="mmdx-1-diagram" checked>
  <input type="radio" name="mmdx-1" id="mmdx-1-source">
  <div class="mmdx-tabs">
    <label for="mmdx-1-diagram">图</label>
    <label for="mmdx-1-source">源码</label>
  </div>
  <div class="mmdx-pane mmdx-diagram"><!-- 内联 SVG --></div>
  <pre class="mmdx-pane mmdx-source"><code><!-- mermaid 源码 --></code></pre>
</figure>
```

要点（每条都对齐 Zed 的一个决定）：

- **默认选中「图」**，对齐 Zed 的 `toggle_state(!showing_code)`；源码是第二落点。
- **零 JS**：radio + `label` + `#mmdx-1-source:checked ~ .mmdx-source` 兄弟选择器。radio 用 `position:absolute;opacity:0` 隐藏（不要 `display:none`），保住键盘焦点与方向键切换。
- **内联 SVG，不用 `<img>`**：才能跟随站点 CSS 与 `prefers-color-scheme`。代价是文档里多份 SVG 的 id 可能互撞——现有 `idPrefix` 是随机串（`src/engine/pele.ts:16`），顺带记一条：`-f svg` 今天双跑就不逐字节相同，HTML 产物若要进文档仓库，前缀应改成按块序号固定。
- **失败 / 不支持的图型只出源码块**（对齐 `mermaid.rs:646`）：不出空图，附一行原因。
- **降级**：目标平台会洗掉 `<input>` 时，退回 `<details><summary>源码</summary><pre>…</pre></details>`，同样无 JS。
- **不引前端依赖**：源码块不接高亮库，保持 mmdx 现在零前端运行时的纪律。
- **办公档不变**：贴 PPT / Word / 飞书仍走 PNG；HTML 档只服务博客与文档站点。

### 3.2 暗色模式：Zed 主题订阅的静态等价物

Zed 在主题变化时清缓存重渲染（`markdown.rs:699`），静态产物做不到。但 Pele 的输出本来就是 CSS 变量，`--svg-themeable` 会保留 `--pele-*`，于是可以在内联 SVG 里放两套变量、用 `@media (prefers-color-scheme: dark)` 切换——一份文件同时服务浅色与深色博客。注意默认 `-f svg` 会把变量烘焙成 hex（HUMAN_GUIDE），HTML 档必须走 `--svg-themeable` 路径。

### 3.3 验收标准（提案）

- 一个 md 里 3 个 mermaid 块 → HTML 产物 3 个独立图块，切换互不影响（对齐 Zed 的 per-offset 状态）。
- 关掉 JS 仍可切换；键盘可切换。
- 暗色模式下图的文字与源码都过现有对比度阈值（3:1，`src/lint.ts:139`）。
- 渲染失败的块只出源码，不出空框。
- 与 `-f png` 并存：PNG 仍是办公默认，HTML 档 opt-in。

## 4. 引擎线：换 merman 去 Chromium（后续评估）

### 4.1 收益

- 去掉 `vendor/pele.global.js`（~700KB）与 mermaid 图型这条路径上的浏览器冷启动；merman 是原生二进制，无 Node / Chromium 进程。
- SVG 结构对齐社区 mermaid（12.1 parity），「本地看起来一样」这件事从 Pele 的自研布局换成上游口径。
- 默认确定性度量与资源上限（不读系统时钟 / 随机 / 时区），CI 里可复现。

### 4.2 代价（每条都要能验收）

| 项 | 事实 | 对 mmdx 的影响 |
| --- | --- | --- |
| 中文字体 | merman 不随附字体；SVG 不嵌字体也不转轮廓；要 `--font-file` / `--font-dir` 显式给 ttf/otf，并按 `fontFamily` 选族 | 现有资产是 woff2 子集（`assets/fonts/NotoSansSC-Subset.woff2` 等），**能否被读取未测**；交付出去的 SVG 在下游缺字风险高 |
| 文本度量 | 默认 deterministic，不是浏览器度量；native 模式与浏览器也不保证一致 | 现有 lint（SVG 标签溢出、贴边、贴靠）依赖 Pele 实测几何，需要整批重跑 |
| 手绘主题 | merman 用 Rust `roughr`；官方把「JS RoughJS vs Rust roughr 路径几何」列为 residual | `excalidraw` 主题现在是 rough.js 在 DOM 上后处理（`src/engine/pele.ts:99`），换引擎要重做抖动手感 |
| PNG 栅格 | Node 包只出 SVG；PNG 要 `merman-cli` 或自接 resvg；官方明说 raster 输出是 best-effort，不是像素对齐层 | 像素裁切（`src/capture.ts:46`）、`diffPng` 确定性、PNG 边缘规则（`src/lint.ts:231`）要重建 |
| lint 几何 | 现在全部走 DOM（`getBoundingClientRect`，`src/lint.ts` + `render.ts` 的 `figureLint`） | 要么保留 Chromium 只做 lint（浏览器依赖没去掉），要么把几何检查改成解析 SVG 坐标 |
| Office / PPT | parity SVG 含 `<foreignObject>` HTML 标签，Office 打不开；要用 `resvg-safe` pipeline 去掉并补 `<text>` 回退 | 现在的 hex 烘焙 + `--svg-themeable` 两条 Office 路径都要重测 |
| 许可 | merman 本体 MIT OR Apache-2.0，但默认 features 带 ELK（EPL-2.0）与 notice 义务；Zed 的 `crates/mermaid_render` 是 GPL-3.0-or-later | 只出 SVG 可关掉 ELK 相关 features；**不要复制 Zed 的 crate 代码**（与 mmdx 的 MIT 不兼容） |

### 4.3 分阶段验证（决定做才执行）

1. **旁路对比**：同一批 `tests/diagrams` 用 `merman-cli` 出 SVG，与现 Pele SVG 并排目测 + 跑一遍现有 lint，记录几何差异面。
2. **字体**：把 `NotoSansSC-VF.ttf`（或 woff2 子集）喂给 `--font-file`，确认族名、权重与变量字体实例化是否生效。
3. **手绘**：跑 `excalidraw` 主题样例，对比抖动与填色。
4. **PNG**：接 resvg，重建裁切与边缘 lint。
5. 1–4 全过，才谈替换 Pele。

## 明确不做

- 不复制 Zed 的 Rust 代码（`crates/mermaid_render` GPL-3.0-or-later），只吸收设计与交互。
- 不引 merman 的周边（LSP、tree-sitter 语法、ASCII、rustdoc 片段）：mmdx 的输入是围栏，不需要编辑器壳。
- 不为「图 / 源码切换」引前端框架或 JS 运行时。

## 未验证事项

- [ ] merman 对 woff2 / 变量字体的支持（本仓库未测）
- [ ] merman 的 `look: handDrawn` 在 flowchart 上的输出与 rough.js 的差距（官方只把 ishikawa / venn 的手绘列入 residual 说明）
- [ ] merman 的 Mermaid 版本口径（README 的 12.1 / 开发分支 12.2 与对齐仪表盘的 11.16 基线不一致）
- [ ] `@mermanjs/node` 在本机（Windows x64）的可用性
- [ ] Zed 的 tab / 缩放交互实机目测（本文结论来自源码与默认设置，未跑 Zed）

## 来源（均已读）

- Zed：`crates/markdown/Cargo.toml`、`crates/mermaid_render/Cargo.toml`、`crates/mermaid_render/src/mermaid_render.rs`、`crates/markdown/src/mermaid.rs`、`crates/markdown/src/markdown.rs`、`crates/markdown/src/parser.rs`、`crates/markdown_preview/src/markdown_preview_view.rs`、`assets/settings/default.json`
- merman：README、`docs/FEATURES.md`、`docs/rendering/SVG_OUTPUT_PIPELINE.md`、`docs/alignment/STATUS.md`、`crates/merman-cli/README.md`、`platforms/node/README.md`
- 本仓库：`src/cli.ts`、`src/render.ts`、`src/engine/pele.ts`、`src/capture.ts`、`src/lint.ts`、`src/themes.ts`、[research-pele.md](research-pele.md)、[HUMAN_GUIDE.md](HUMAN_GUIDE.md)
