# mmdx — Agent 入口

项目文档：`README.md`、`docs/AGENT_GUIDE.md`、`docs/HUMAN_GUIDE.md`。人类可读的完整方案见 `docs/STYLE_PORTS.md`。

## 🔄 Handoff 摘要

### 风格移植（Excalidraw 手绘）— in-progress

- **当前状态：** 主题收敛为三套预设：`tech`（默认）/ `openai` / `excalidraw`。`excalidraw` 用 Pele + rough.js 后处理，`--style-fill solid|hachure` 已落地；`--tone paper|neutral|product` 与 `mmdx card`（默认 `openai`）已落地。OpenAI 编辑风与 5 套办公/工程主题的移植已放弃，`openai` 是唯一保留的近单色风格。当前 146/146 通过。工作区另有前序未提交改动，提交前先 `git diff` 确认归属。
- **关键证据：** `docs/gallery/overview.png`（三套主题同一案例的流程图对比）、`docs/gallery/tech-*.png` / `docs/gallery/excalidraw-*.png`（流程图、KPI、卡片、表格）、`docs/gallery/html-report-openai.png` / `docs/gallery/info-card-openai.png`（`openai` 在两个 HTML 场景下的代表图）、`docs/gallery/html-report-*.png` / `info-card-*.png`（跨风格对照，含已移除主题的历史样张）、`docs/gallery/card-tone-*.png`（同一模板三种 tone）、`docs/gallery/vendored-*.png`（v1.4.2 手绘 HTML 原始样张，不属主题预设）；`docs/GALLERY.md` 总览 + 分风格页；`docs/STYLE_PORTS.md` 记录决策、色板、rough 参数与放弃的移植。
- **验收标准：** `tech` / `openai` / `excalidraw` 在 Pele 下渲染 flowchart/state/class/ER 且文字不变形；`excalidraw` 有手绘抖动与板式卡片，`--style-fill hachure` 只改填色；`tech` 与 `openai` 不回归；用户对 `review/styles/` 与 `docs/gallery/` 二次目测通过后才推送。
- **详情指针：** [`docs/handoff/style-ports.md`](docs/handoff/style-ports.md)
- **未验证事项：**
  - [ ] 生产字体子集与跨机器渲染（Excalifont / LXGW WenKai 尚未随包）
  - [ ] Office/PPT 打开 hachure SVG
  - [ ] `--engine mermaid` + `excalidraw` 观感对比
  - [ ] 用户正式目测

### 质量门禁与发布 — in-progress

- **当前状态：** `src/lint.ts` 覆盖 DOM 几何、SVG 标签溢出、渲染态文本对比度（3:1）、PNG 边缘裁切、`diffPng` 确定性；叠加底部长空白规则与超长列表 fixture，当前 146/146。`scripts/lint-visuals.ts` 遍历 `tech` / `openai` / `excalidraw` 输出可读报告。实测：44,548px 列表底部 51px、56,952px 流程图底部 22px、三套主题双跑像素差 0。
- **规划：** Mermaid `foreignObject` 文本度量、全图型确定性、HTML 块 4.5:1 档、固定 CI 后的 pixelmatch 基准图；参考 Playwright / jest-image-snapshot / reg-suit 策略，详见 [`docs/QUALITY.md`](docs/QUALITY.md)。
- **发布前：** 第三方组件与字体清单在 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)，全文在 `licenses/`；发布包必须一并携带。传递依赖清单需从 lockfile 重新生成。
