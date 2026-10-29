# mmdx — Agent 入口

项目文档：`README.md`、`docs/AGENT_GUIDE.md`、`docs/HUMAN_GUIDE.md`。人类可读的完整方案见 `docs/STYLE_PORTS.md`。

## 🔄 Handoff 摘要

### 风格移植（Excalidraw 手绘）— in-progress

- **当前状态：** 主题收敛为三套预设：`tech`（默认）/ `openai` / `excalidraw`。`excalidraw` 用 Pele + rough.js 后处理，`--style-fill solid|hachure` 已落地；`--tone paper|neutral|product` 与 `mmdx card`（默认 `openai`）已落地。OpenAI 编辑风与 5 套办公/工程主题的移植已放弃，`openai` 是唯一保留的近单色风格。引擎已收敛为 Pele 一套（`--engine` / `--layout` / Mermaid+ELK 回退全部移除）。当前 148/148 通过。工作区另有前序未提交改动，提交前先 `git diff` 确认归属。
- **关键证据：** `docs/gallery/overview.png`（三套主题同一案例的流程图对比）、`docs/gallery/tech-*.png` / `docs/gallery/excalidraw-*.png`（流程图、KPI、卡片、表格）、`docs/gallery/html-report-openai.png` / `docs/gallery/info-card-openai.png`（`openai` 在两个 HTML 场景下的代表图）、`docs/gallery/html-report-*.png` / `info-card-*.png`（跨风格对照，含已移除主题的历史样张）、`docs/gallery/card-tone-*.png`（同一模板三种 tone）、`docs/gallery/vendored-*.png`（v1.4.2 手绘 HTML 原始样张，不属主题预设）；`docs/GALLERY.md` 总览 + 分风格页；`docs/STYLE_PORTS.md` 记录决策、色板、rough 参数与放弃的移植。
- **验收标准：** `tech` / `openai` / `excalidraw` 在 Pele 下渲染 flowchart/state/class/ER 且文字不变形；`excalidraw` 有手绘抖动与板式卡片，`--style-fill hachure` 只改填色；`tech` 与 `openai` 不回归；用户对 `review/styles/` 与 `docs/gallery/` 二次目测通过后才推送。
- **详情指针：** [`docs/handoff/style-ports.md`](docs/handoff/style-ports.md)
- **未验证事项：**
  - [ ] 生产字体子集与跨机器渲染（Excalifont / LXGW WenKai 尚未随包）
  - [ ] Office/PPT 打开 hachure SVG
  - [ ] 用户正式目测

### 质量门禁与发布 — in-progress

- **当前状态：** `src/lint.ts` 覆盖 DOM 几何、SVG 标签溢出、渲染态文本对比度（3:1）、PNG 边缘裁切、`diffPng` 确定性；叠加底部长空白规则与超长列表 fixture，当前 148/148。`scripts/lint-visuals.ts` 遍历 `tech` / `openai` / `excalidraw` 输出可读报告。实测：44,548px 列表底部 51px、56,952px 流程图底部 22px、三套主题双跑像素差 0。
- **规划：** 若引入 `foreignObject` 渲染路径需补文本度量、全图型确定性、HTML 块 4.5:1 档、固定 CI 后的 pixelmatch 基准图；参考 Playwright / jest-image-snapshot / reg-suit 策略，详见 [`docs/QUALITY.md`](docs/QUALITY.md)。
- **发布前：** 第三方组件与字体清单在 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)，全文在 `licenses/`；发布包必须一并携带。传递依赖清单需从 lockfile 重新生成。

### Zed 的 Mermaid 渲染与「图 / 源码」切换 — parked

- **当前状态：** 只读 Zed 源码的调研，未动 mmdx 代码。Zed 分三层：交互层（每个 mermaid 块顶部「Preview / Code」两个 tab、渲染失败直接显示源码、按显示倍率重新栅格化的缩放、按源码内容缓存的图）值得先吸收，做法是给 CLI 加一个自包含 HTML 图块产物（内联 SVG + 源码 + 无 JS 的 tab）；样式层挑机制不照搬风格——强调色填充按 15% 混主题背景、文字色由底色在 OKLCH 推导并保 4.5:1、逐图型的 CSS 覆盖清单、SVG 归一化 pass，但不用它的「所有节点同一底色」（会抹掉形状分色语义）、不加第四套预设；引擎层（Zed 用纯 Rust 的 `merman` 出 parity SVG + usvg/resvg 栅格化，不跑浏览器）列为后续评估，换引擎要重做中文字体、rough 手绘、DOM lint 与 PNG 裁切。
- **详情指针：** [`docs/research-zed-mermaid.md`](docs/research-zed-mermaid.md)
- **未验证事项：**
  - [ ] merman 对 woff2 / 变量字体的支持（现有资产是 woff2 子集）
  - [ ] merman 的 `look: handDrawn` 与 rough.js 的差距
  - [ ] `@mermanjs/node` 在本机（Windows x64）可用性
