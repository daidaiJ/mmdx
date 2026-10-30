# mmdx — Agent 入口

项目文档：`README.md`、`docs/AGENT_GUIDE.md`、`docs/HUMAN_GUIDE.md`。人类可读的完整方案见 `docs/STYLE_PORTS.md`。

## 🔄 Handoff 摘要

### 风格移植（主题集合）— in-progress

- **当前状态：** 主题集合为七套预设：`tech`（默认）/ `openai` / `excalidraw` / `ios` / `acnh` / `glass` / `epaper`。`excalidraw` 用 Pele + rough.js 后处理，`--style-fill solid|hachure` 已落地；`--tone paper|neutral|product` 与 `mmdx card`（默认 `openai`）已落地。`--tone paper` 把图与块页都换成编辑风网格纸（`paperize()`：`#FAFAF8` 纸底 + 24px 细格 / 96px 粗格，焦橙强调色 `#BF4520`，参考 diagram-design 的 editorial skin；暖黄底 `#FBF7EC` 已废弃）。`ios` 是**纯平面** iOS 系统界面（分组浅灰底 + 白卡片 + 发丝分隔线 + Apple 深色变体系统色，不画底不加投影——第一版的模糊色块「立体感」被判定为败笔后移除）。`acnh` 是动森风（奶油纸 + 点阵网格 + 粗棕描边 + 硬偏移贴纸阴影 + 圆体字）。`glass` 是 Fluent 亚克力（淡蓝灰画布 + 28px 网格 + 白色半透膜 0.30 + 4% 噪点，面板 `rgba(255,255,255,.72)`、8px 圆角、白描边；块页用真的 `backdrop-filter`）。`epaper` 是电子纸（`#F5F1EB` 纸底 + 5% `feTurbulence` 纸纹 + `#1A1A1A` 发丝黑描边 + 直角 + 灰阶形状族，参考 ui-ux-pro-max #56）。自带底的风格共用 `ThemeSpec.backdrop`：引擎往 SVG 插一层 `<g class="mmdx-backdrop">`（色块 + 高斯模糊 / 点阵 / 网格 `<pattern>` / 半透膜 + 噪点，外加内缩 14px 的圆角遮罩），PNG 走 `captureElement(..., fullBleed)` 整幅截取不裁边。flatten 会把 CSS `filter` 一起烘焙，所以 `acnh` 的贴纸硬阴影与 `glass` 的轻投影都能进 SVG。引擎只有 Pele 一套。
- **无障碍契约（新增）：** `src/color.ts` 提供 WCAG 亮度/对比、Machado 2009 色觉模拟、OKLab 感知距离；`tests/run.ts` 新增 `lint/theme-contrast`（fg ≥7 AAA、muted ≥4.5、accent/critical ≥3）、`lint/theme-shape-marks`（描边对底与对自己的填充各 ≥3）、`lint/theme-cvd`（红绿色盲模拟下形状族两两 ΔE ≥0.02）、`lint/shape-form-redundant`（四个形状族必须是四种形态）；`src/lint.ts` 的渲染态文本审计改为 WCAG 分档（小字 4.5 / 大字 3.0）。`scripts/lint-a11y.ts` 是逐主题的可读报告。为过门槛调过：`openai` state/store 填充调浅、`excalidraw` muted `#6C757D`、`acnh` muted `#7A6350`、`paper` store 描边 `#7A5AA8`、`ios` 换 Apple 深色变体系统色。当前 189/189 通过，`lint-visuals` 14/14、`lint-a11y` 全过。
- **关键证据：** `docs/gallery/overview.png` / `all-themes-overview.png`（七套主题同一案例的流程图对比）、`docs/gallery/tech-*.png` / `excalidraw-*.png` / `ios-*.png` / `acnh-*.png` / `glass-*.png` / `epaper-*.png`（流程图、KPI、卡片、表格）、`docs/gallery/scenario-paper.png` / `scenario-ios.png`（场景引导同一张状态图两档观感）、`docs/gallery/tone-paper-report.png`（`--tone paper` 的块页报告）、`docs/gallery/html-report-openai.png` / `info-card-openai.png`、`docs/gallery/card-tone-*.png`、`docs/gallery/vendored-*.png`（v1.4.2 手绘 HTML 原始样张）；`docs/GALLERY.md` 总览 + 分风格页（含 `gallery/glass.md`、`gallery/epaper.md`、`gallery/ios.md`、`gallery/acnh.md`、`gallery/scenario.md`）；`docs/STYLE_PORTS.md` 第 3.1b / 5.4 / 5.5 节记录色板、底与材质层、无障碍契约与放弃的移植。
- **验收标准：** 七套主题在 Pele 下渲染 flowchart/state/class/ER 且文字不变形；`scripts/lint-visuals.ts` 无 issue、`scripts/lint-a11y.ts` 无失败、PNG 四边留白左右差 ≤20px；`--style-fill hachure` 只改填色；自带底的风格其底在 SVG 与 PNG 里都在、`--background transparent` 时不画底；`ios` 保持纯平面（无 `mmdx-backdrop`、无 `filter`）；`tech` / `openai` / `excalidraw` 不回归；用户对 `review/` 与 `docs/gallery/` 目测通过后才推送。
- **详情指针：** [`docs/handoff/style-ports.md`](docs/handoff/style-ports.md)
- **未验证事项：**
  - [ ] 生产字体子集与跨机器渲染（Excalifont / LXGW WenKai / ZCOOL KuaiLe 尚未随包）
  - [ ] Office/PPT 打开 hachure SVG
  - [ ] 用户正式目测（本轮待看：`review/scenario/` 与 `review/styles/`）

### 质量门禁与发布 — in-progress

- **当前状态：** `src/lint.ts` 覆盖 DOM 几何、SVG 标签溢出、渲染态文本对比度（WCAG 分档：小字 4.5:1 / 大字 3:1）、PNG 边缘裁切、`diffPng` 确定性；叠加底部长空白规则与超长列表 fixture，当前 189/189。`scripts/lint-visuals.ts` 遍历七套主题输出可读报告（14/14，无 issue），`scripts/lint-a11y.ts` 输出逐主题的对比度与色觉报告。实测：44,548px 列表底部 51px、56,952px 流程图底部 22px、各主题双跑像素差 0。
- **规划：** 若引入 `foreignObject` 渲染路径需补文本度量、全图型确定性（HTML 块的文本对比度已是 4.5:1 档）、固定 CI 后的 pixelmatch 基准图；参考 Playwright / jest-image-snapshot / reg-suit 策略，详见 [`docs/QUALITY.md`](docs/QUALITY.md)。
- **发布前：** 第三方组件与字体清单在 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)，全文在 `licenses/`；发布包必须一并携带。传递依赖清单需从 lockfile 重新生成。

### Zed 的 Mermaid 渲染与「图 / 源码」切换 — parked

- **当前状态：** 只读 Zed 源码的调研，未动 mmdx 代码。Zed 分三层：交互层（每个 mermaid 块顶部「Preview / Code」两个 tab、渲染失败直接显示源码、按显示倍率重新栅格化的缩放、按源码内容缓存的图）值得先吸收，做法是给 CLI 加一个自包含 HTML 图块产物（内联 SVG + 源码 + 无 JS 的 tab）；样式层挑机制不照搬风格——强调色填充按 15% 混主题背景、文字色由底色在 OKLCH 推导并保 4.5:1、逐图型的 CSS 覆盖清单、SVG 归一化 pass，但不用它的「所有节点同一底色」（会抹掉形状分色语义）、不加第四套预设；引擎层（Zed 用纯 Rust 的 `merman` 出 parity SVG + usvg/resvg 栅格化，不跑浏览器）列为后续评估，换引擎要重做中文字体、rough 手绘、DOM lint 与 PNG 裁切。
- **详情指针：** [`docs/research-zed-mermaid.md`](docs/research-zed-mermaid.md)
- **未验证事项：**
  - [ ] merman 对 woff2 / 变量字体的支持（现有资产是 woff2 子集）
  - [ ] merman 的 `look: handDrawn` 与 rough.js 的差距
  - [ ] `@mermanjs/node` 在本机（Windows x64）可用性
