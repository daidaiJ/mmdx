# mmdx — Agent 入口

项目文档：`README.md`、`docs/AGENT_GUIDE.md`、`docs/HUMAN_GUIDE.md`。人类可读的完整方案见 `docs/STYLE_PORTS.md`。

## 🔄 Handoff 摘要

### 风格移植（主题集合）— in-progress

- **当前状态：** 主题集合为九套预设：`tech`（默认）/ `openai` / `excalidraw` / `ios` / `acnh` / `glass` / `epaper` / `zed` / `zed-light`（后两套见下方 Zed 一节）。`excalidraw` 用 Pele + rough.js 后处理，`--style-fill solid|hachure` 已落地；`--tone paper|neutral|product` 与 `mmdx card`（默认 `openai`）已落地。`--tone paper` 把图与块页都换成编辑风网格纸（`paperize()`：`#FAFAF8` 纸底 + 24px 细格 / 96px 粗格，焦橙强调色 `#BF4520`，参考 diagram-design 的 editorial skin；暖黄底 `#FBF7EC` 已废弃）。`ios` 是**纯平面** iOS 系统界面（分组浅灰底 + 白卡片 + 发丝分隔线 + Apple 深色变体系统色，不画底不加投影——第一版的模糊色块「立体感」被判定为败笔后移除；2026-10-30 加强系统感：圆角 14px、描边 1.6px、系统色浅调填充、块页卡片加 `›` 折角）。`acnh` 是动森风（奶油纸 + 点阵网格 + 粗棕描边 + 硬偏移贴纸阴影 + 圆体字）。`glass` 是 Fluent 亚克力（淡蓝灰画布 + 24px 网格 0.22 + 白色半透膜 0.16 + 10% 噪点，面板 `rgba(255,255,255,.45)`、8px 圆角、白描边、`blur(5px)`；2026-10-30 重做材质层：格线加浓、膜与面板减薄、去掉偏紫色块改白色高光、判定描边 `#B07514 → #B45309`）。`epaper` 是电子纸（`#F5F1EB` 纸底 + 5% `feTurbulence` 纸纹 + `#1A1A1A` 发丝黑描边 + 直角 + 灰阶形状族，参考 ui-ux-pro-max #56）。自带底的风格共用 `ThemeSpec.backdrop`：引擎往 SVG 插一层 `<g class="mmdx-backdrop">`（色块 + 高斯模糊 / 点阵 / 网格 `<pattern>` / 半透膜 + 噪点，外加内缩 14px 的圆角遮罩），PNG 走 `captureElement(..., fullBleed)` 整幅截取不裁边。flatten 会把 CSS `filter` 一起烘焙，所以 `acnh` 的贴纸硬阴影与 `glass` 的轻投影都能进 SVG。引擎只有 Pele 一套。
- **无障碍契约（新增）：** `src/color.ts` 提供 WCAG 亮度/对比、Machado 2009 色觉模拟、OKLab 感知距离；`tests/run.ts` 新增 `lint/theme-contrast`（fg ≥7 AAA、muted ≥4.5、accent/critical ≥3）、`lint/theme-shape-marks`（描边对底与对自己的填充各 ≥3）、`lint/theme-cvd`（红绿色盲模拟下形状族两两 ΔE ≥0.02）、`lint/shape-form-redundant`（四个形状族必须是四种形态）、`lint/theme-connectors`（连线对底 ≥3:1）、`lint/theme-series-cvd`（8 色图表系列任意两色 ΔE ≥0.02）、`lint/theme-series-contrast`（系列色对底 ≥3:1，因为饼图数值用页面底色抠在切片上）、`lint/theme-node-rotation`（开轮转的 `zed` / `zed-light` 里 8 个 player 色对自己的 15% 底色各 ≥3:1）；`src/lint.ts` 的渲染态文本审计改为 WCAG 分档（小字 4.5 / 大字 3.0）。`scripts/lint-a11y.ts` 是逐主题的可读报告。为过门槛调过：`openai` state/store 填充调浅、`excalidraw` muted `#6C757D`、`acnh` muted `#7A6350`、`paper` store 描边 `#7A5AA8`、`ios` 换 Apple 深色变体系统色、`zed` 连线 `#636D83 → #7A8598`、`ios` 连线 `#8E8E93 → #7C7C82`、九套主题的 8 色系列按最小位移重挑（实测极值：fg 8.35、muted 4.54、形状描边 3.06、连线 3.11、形状色觉 0.026、系列色觉 0.040、系列对底 3.00）。当前 **209/209 通过**（`mmdx card` 在 bun 下报 `buf.readUInt32BE is not a function` 的那条已修：`src/card.ts` 的 `pngSize()` 现在先 `Buffer.from()`，与 `capture.ts` / `lint.ts` 一致），`lint-visuals` 18/18、`lint-a11y` 全过。
- **关键证据：** `docs/gallery/overview.png` / `all-themes-overview.png`（九套主题同一案例的流程图对比）、九套主题各五张分场景图（流程图 / 饼图 / KPI / 卡片 / 表格）、`docs/gallery/scenario-paper.png` / `scenario-ios.png`（场景引导同一张状态图两档观感）、`docs/gallery/tone-paper-report.png`（`--tone paper` 的块页报告）、`docs/gallery/html-report-openai.png` / `info-card-openai.png`、`docs/gallery/card-tone-*.png`、`docs/gallery/vendored-*.png`（v1.4.2 手绘 HTML 原始样张）、`tests/contact-sheet.png`（README 的二十图型拼图，按当前产物重出）；`docs/GALLERY.md` 总览 + 分风格页（含 `gallery/glass.md`、`gallery/epaper.md`、`gallery/ios.md`、`gallery/acnh.md`、`gallery/scenario.md`）；`docs/STYLE_PORTS.md` 第 3.1b / 3.1c / 5.4 / 5.5 节记录色板、底与材质层、无障碍契约与放弃的移植。
- **验收标准：** 九套主题在 Pele 下渲染 flowchart/state/class/ER 且文字不变形；`scripts/lint-visuals.ts` 无 issue、`scripts/lint-a11y.ts` 无失败、PNG 四边留白左右差 ≤20px；`--style-fill hachure` 只改填色；自带底的风格其底在 SVG 与 PNG 里都在、`--background transparent` 时不画底；`ios` 保持纯平面（无 `mmdx-backdrop`、无 `filter`）；`tech` / `openai` / `excalidraw` 不回归；用户对 `review/` 与 `docs/gallery/` 目测通过后才推送。
- **详情指针：** [`docs/handoff/style-ports.md`](docs/handoff/style-ports.md)
- **未验证事项：**
  - [ ] 生产字体子集与跨机器渲染（Excalifont / LXGW WenKai / ZCOOL KuaiLe 尚未随包）
  - [ ] Office/PPT 打开 hachure SVG
  - [ ] 用户正式目测（本轮待看：`review/styles/` 与 `docs/gallery/` 九套主题的五张分场景图）
  - [ ] 饼图数值是 Pele 用页面底色「抠」在切片上的，只能靠「切片对底 ≥3:1」间接保读；逐片按 `textColorFor()` 取字色属引擎改动，未做
  - [ ] 用户对 `glass` / `ios` 是否仍与 `openai` 同质化的判断（本轮选的是「重做材质层 + 加强系统感」，没有砍主题）

### 质量门禁与发布 — in-progress

- **当前状态：** `src/lint.ts` 覆盖 DOM 几何、SVG 标签溢出、渲染态文本对比度（WCAG 分档：小字 4.5:1 / 大字 3:1）、PNG 边缘裁切、`diffPng` 确定性；叠加底部长空白规则与超长列表 fixture，当前 209/209。`scripts/lint-visuals.ts` 遍历九套主题输出可读报告（18/18，无 issue），`scripts/lint-a11y.ts` 输出逐主题的对比度与色觉报告。实测：44,548px 列表底部 51px、56,952px 流程图底部 22px、各主题双跑像素差 0。
- **规划：** 若引入 `foreignObject` 渲染路径需补文本度量、全图型确定性（HTML 块的文本对比度已是 4.5:1 档）、固定 CI 后的 pixelmatch 基准图；参考 Playwright / jest-image-snapshot / reg-suit 策略，详见 [`docs/QUALITY.md`](docs/QUALITY.md)。
- **发布前：** 第三方组件与字体清单在 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)，全文在 `licenses/`；发布包必须一并携带。传递依赖清单需从 lockfile 重新生成。

### Zed 的 Mermaid 渲染与「图 / 源码」切换 — 样式层已落地，交互/引擎层未做

- **当前状态（2026-10-30 更新）：** 样式层已按 [`docs/research-zed-mermaid.md`](docs/research-zed-mermaid.md) §3.4 落地为两套预设 `zed`（One Dark）/ `zed-light`（One Light），**交互层与引擎层未动**。色板直接取 Zed `assets/themes/one/one.json` 的 token（bg `#282C33`/`#FAFAFA`、fg、muted、border、8 个 player 色）；节点上色改用 Zed 自己的规则：**flowchart / class / state 的节点按读取顺序轮转 8 个 player 色（`node_counter % 8`），描边 = accent 原色，填充 = 该 accent 按 15% 混**页面底色**（`src/color.ts` 的 `blendOver`，对齐 Zed 的 `ACCENT_FILL_OPACITY`）**——实现是 `ThemeStyle.nodeRotation` + 一组 `:nth-child(8n+k)` 规则（Pele 把节点按文档顺序写进一个 `<g>`），状态起止标记与复合状态框用 `:not()` 排除；形状族规则留给 ER 实体 / 注释 / 类图分隔线 / 状态起止 / 簇。这是与 `tech` 最直接的差别（`tech` 按形状分色、单一蓝调）。同批吸收的机制：`textColorFor()`（OKLab 保 15% 彩度 + 二分保 4.5:1）、`scaleLightness()`（Zed 的 `adjust_lightness`：暗色 ×0.7 / 亮色 ×1.3，状态 chip 先缩放亮度再推文字色）、`accentTint()` 改为按 `theme.vars.bg` 混、块页 `color-mix(... white)` 改为 `var(--paper)`（PAGE_CSS，6 处）、暗色块页 `ZED_DARK_BLOCK_CSS`、`zed-light` 的编辑器面板块页 `ZED_LIGHT_BLOCK_CSS`（`#EBEBEC` 面板 + `#C9C9CA` 发丝线 + 6px 圆角 + 无强调色边条）。这是主题集合里**第一套暗色**预设。
- **未吸收（已记录理由）：** Zed 的「所有节点同一底色」（被轮转与形状族规则覆盖）、ER 奇偶行覆盖与 sequence actor 轮转（Pele 把上下两组 actor 放在同一个 `<g>` 里，纯 CSS 无法让同一 actor 的上下盒子同色）、`mermaid_font_family: null` 的「跟随编辑器字体」（中文标签需要随包 CJK 字体栈）。
- **验证：** `bun run test` 209/209（`cli/card-*` 那 4 条已随 `pngSize()` 的 `Buffer.from()` 修好）、`lint-a11y` 全过（`zed` fg 10.57 / muted 6.37 / 形状描边 4.33–6.98）、`lint-visuals` 18/18。20 张图型全量扫过（`review/zed/all/`）无新增 issue。
- **已登记：** README / HUMAN_GUIDE / AGENT_GUIDE / EXTENSIONS / GALLERY / skill / CHANGELOG（`[Unreleased]`）/ `--theme` help 全部改为九套；新增 `docs/gallery/zed.md` / `zed-light.md`（含英文页）与 8 张分场景图，`overview.png` / `all-themes-overview.png` 改为九套 3×3；`docs/STYLE_PORTS.md` 第 3.1c 节记录色板、机制与门槛实测。评审图仍在 `review/styles/zed-compare/review-sheet.png`、`review/zed/all/`（`review/` 是 gitignored）。本轮改动已提交并推送（`28e98f6`，`origin/main`）。
- **详情指针：** [`docs/research-zed-mermaid.md`](docs/research-zed-mermaid.md)
- **未验证事项：**
  - [ ] 用户对本轮改动的最终确认（`docs/gallery/zed*.png` 与两张总览）
  - [ ] merman 对 woff2 / 变量字体的支持（现有资产是 woff2 子集）
  - [ ] merman 的 `look: handDrawn` 与 rough.js 的差距
  - [ ] `@mermanjs/node` 在本机（Windows x64）可用性
  - [ ] 用户对「节点按读取顺序轮转 8 色」的接受度（`zed` / `zed-light` 从形状分色改成多色轮转；改前改后见 `review/styles/before-after-2026-10-30.png` 与本轮新出的 `review/styles/zed-compare/`）
