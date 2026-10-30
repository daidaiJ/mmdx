---
handoff_id: style-ports
status: active
---

> 本文件按用户要求随仓库提交，供跨会话/跨机器交接。评审图和原型脚本仍在本地 gitignored 的 `review/`、`.handoff/` 目录，不随仓库分发。
>
> 当前本地 `main` 比 `origin/main` 落后 21 个提交，且工作区有前序未提交的 v2 改动；本文档按独立分支推送，不直接改 `main`。合并前先对齐 `origin/main`。

## 1. 目标

把 Excalidraw 手绘风作为内置主题移植进 mmdx（`-t excalidraw`），覆盖 Mermaid 图与扩展块，跨机器字体一致，先目测审核再推送。此后按「新机制」而非「新配色」扩张：预设集合现为 `tech`（默认）/ `openai` / `excalidraw` / `ios` / `acnh` / `glass` / `epaper` 七套。

## 2. 当前进度与状态

- **当前阶段：** 七套主题全部落地（`excalidraw` 走 Pele + rough.js 与 `--style-fill solid|hachure`；`ios` 纯平面系统界面；`acnh` 奶油纸 + 点阵；`glass` Fluent 亚克力；`epaper` 电子纸 + 纸纹）。`--tone`（`paper` 另换网格纸）与 `mmdx card`（默认 `openai`）已落地。无障碍契约（对比度分档 + 色觉模拟 + 形态冗余）已由测试守住。OpenAI 编辑风与 5 套办公/工程主题的移植已放弃并移除。用户目测与推送仍待做。
- **状态：** in-progress
- **进度：** 调研 100% / 原型 100% / 生产实现 95% / 正式评审 0%
- **工作区：** 存在前序未提交改动（`src/themes.ts`、`src/cli.ts`、`src/render.ts`、`scripts/build.ts` 等），不是本轮产生；开工前先 `git diff` 确认归属。

## 3. 关键证据

- 决策与完整技术方案：`docs/STYLE_PORTS.md`。
- 本地评审图：`review/style-porting/review-sheet.png`（6 图对照）；`excalidraw-solid.png`、`excalidraw-hachure.png` 为最终方案与其可选档；`sketch-pele.png`、`sketch-mermaid.png` 是移植前基线；`acnh-*.png` 属动森原型的历史记录（`-t acnh` 已按它落地，见 `docs/gallery/acnh.md`）。
- 主题注册表：`src/themes.ts` 的 `PRESETS` 为 `tech` / `openai` / `excalidraw` / `ios` / `acnh` / `glass` / `epaper`，`DEFAULT_THEME = 'tech'`。
- Pele 形状类已核对：`rect / rounded / stadium / cyl / diam / circle / hex / lean-r / fr-rect / odd`。
- Mermaid handDrawn 问题已复现：子图斜线填满、右侧裁切、roughness 固定 `.7`。
- rough 后处理已跑通：圆柱的 `transform` 在 path 上，替换时必须复制。
- 手绘填色体积：同一张流程图 SVG 实心 55,009 B、hachure 79,973 B。

## 4. 排查方向（不适用）

非 debug 任务，跳过。

## 5. 验收标准

- [x] `-t excalidraw` 在 Pele 下渲染 flowchart / state / class / ER，线条手绘、文字不变形。
- [x] `-t excalidraw --style-fill hachure` 只改填色，不改布局。
- [x] `tech` / `openai` 输出不回归。
- [x] `--json` 无新增 warning；`--preset slide` 下描边与填色可分辨（5 米测试仍待目测）。
- [ ] 无系统手写字体的机器上，中文仍按内置字体渲染（Excalifont / LXGW WenKai 尚未随包）。
- [x] 信息卡按实际像素高度拆页，`--tone` 改变结构与像素输出。
- [x] `tests/run.ts` 全绿（189/189，含 `lint/theme-contrast` / `theme-shape-marks` / `theme-cvd` / `shape-form-redundant`）；`scripts/lint-visuals.ts` 14/14、`scripts/lint-a11y.ts` 全过。
- [x] 画廊：`docs/GALLERY.md` / `GALLERY.en.md` 用同一案例出分场景图 + 总览，README 已引用。
- [ ] 用户对正式 `review/` 图与 `docs/gallery/` 完成二次目测并明确同意后，才提交/推送。

## 6. 后续待完成的任务和步骤

1. ✅ 能力层：`ThemeSpec.style` / `blockCss` / `fonts`，`PageOpts.blockCss`，`peleCss` 形状覆盖补齐。
2. ✅ Excalidraw：rough.js 资产 + `src/engine/pele.ts` 后处理 + 预设 + `--style-fill`。
3. ✅ 信息卡场景：`mmdx card` + `--tone paper|neutral|product`。
4. ✅ 生成 `review/styles/` 三套主题对照图，并新增 `docs/GALLERY.md` 案例画廊在 README 引用。
5. ⏳ 生产字体子集（Excalifont / LXGW WenKai）尚未加入；等待用户目测后提交/推送。

已放弃：OpenAI 编辑风（`openai-editorial`）与办公/工程批次（`vercel` / `linear` / `stripe` / `notion` / `ibm`）。动森当时在调研阶段取消，2026-10 已按第 5.3 节重新落地为 `-t acnh`。参见 `docs/STYLE_PORTS.md` 第 6 节。

## 7. 资产与使用说明

| 资产 | 路径 / 引用 | 用途 |
| --- | --- | --- |
| 决策/技术方案 | `docs/STYLE_PORTS.md` | 实现前必读；包含色板、rough 参数、Pele 集成与已放弃的移植 |
| 评审图 | `review/style-porting/`、`review/styles/` | 本地目测；`review/` 被 gitignore，不随仓库分发 |
| 原型脚本 | `.handoff/style-ports-prototypes/` | 本地（gitignored）：theme-js、rough 后处理、review sheet 生成脚本 |
| 原始临时目录 | `C:\Users\sheng1.zhang\AppData\Local\Temp\mmdx-research\` | 可被清理；以 `.handoff/style-ports-prototypes/` 为准 |
| 主题注册表 | `src/themes.ts` | `PRESETS` / `ThemeSpec` / `peleCss` |
| Pele 引擎 | `src/engine/pele.ts` | rough 后处理插入点；flatten 逻辑 |
| 扩展块 | `src/blocks.ts` | `blockPage()` / `PAGE_CSS` |
| 字体构建 | `scripts/build.ts`、`src/embed.ts` | 新字体嵌入与注入（目前只有 Noto Sans SC） |
| 评审生成 | `scripts/make-review.ts`、`scripts/make-style-review.ts` | 正式 review 图；后者出三套主题的图表与块预览 |
| 案例画廊 | `scripts/make-gallery.ts`、`docs/gallery/` | 同一案例的三风格分场景对照；由 `docs/GALLERY*.md` 与 README 引用 |

## 8. 注意事项

- **已踩过的坑：** 圆柱的 `transform` 在 path 元素上，不在 node group 上；不复制会出现左上角飞出的形状。
- **已踩过的坑：** `peleCss()` 原先没覆盖 `rounded/stadium/hex/lean-r/fr-rect/odd`，`shapeCoverage` 打开后才有描边色。
- **已踩过的坑：** `flatten` 不烘焙 `filter`，做贴纸阴影要用复制轮廓，不要用 CSS `drop-shadow`。
- **已踩过的坑：** `blockPage()` 吃不到 `theme.css` / `--css`；必须走 `blockCss`，否则扩展块只有 token 颜色。
- **用户认同的稳定流程：** 先出 `review/` 图给用户目测，通过后才提交/推送；本轮不推送。
- **环境限制：** 本机 `bun` 命令损坏，测试与脚本用 `node --experimental-transform-types --no-warnings` 运行。
- **工作区状态：** 已有前序未提交改动（`src/themes.ts`、`src/cli.ts`、`src/render.ts`、`scripts/build.ts` 等），不是本轮产生；不要误回滚，先 `git diff` 确认归属。
- **字体许可：** Excalifont / LXGW WenKai 均为 OFL-1.1；若加入必须同步 `THIRD_PARTY_NOTICES.md` 与 `licenses/`。
- **移除的主题：** `openai-editorial` / `openai-dark` / `vercel` / `linear` / `stripe` / `notion` / `ibm` / `minimal` / `latte` / `mocha` / `sketch` 现在报 `unknown theme`；`docs/gallery/` 里对应的 PNG 是历史样张，不要据此恢复预设。

## 9. 用户偏好

- “这些效果必须给我目测审核效果，才能推送。”
- “风格移植先拍板。”
- 先定风格，CLI 瘦身暂缓。
- 默认方案要克制：实心填色；可选项后续单独加。

## 10. 建议使用的 Skill 和 MCP

- **Skill：** `control-ui`（渲染后用浏览器/截图做视觉验收）；`tdd`（rough 后处理和 CSS 覆盖的回归测试）。
- **MCP：** codebase-memory（查 Pele 选择器/调用链）；不需要联网 MCP。

## 11. 用户下个会话聚焦重点

- 先目测 `review/scenario/`（1 网格纸场景图 / 2 平面 iOS 场景图 / 3 iOS 流程图 / 4 电子纸纸纹 / 5 电子纸块页 / 6 玻璃 / 7 `--tone paper` 块页报告 / 8 七套总览）与 `review/styles/{ios,acnh,glass,epaper}/`，再看 `docs/gallery/` 的对应分页。重出画廊跑 `node --experimental-transform-types --no-warnings scripts/make-gallery.ts`。
- 决定是否补齐生产字体子集；不提前混入 CLI 瘦身。
- 任何提交/推送前，先让用户看正式图。

## 12. 明确标注为验证的事项（未完成勿删）

### 已执行、待验证

- [ ] 生产字体子集与跨机器渲染 — 目前只有系统字体原型，Excalifont / LXGW WenKai 子集尚未生成，`theme.fonts` 未接入渲染。
- [ ] rough 后处理覆盖全部图型 — 有 flowchart/state/class/ER 的渲染筛查与 selector 单测，但 sequence / pie / gantt 按设计不做手绘。
- [ ] Office/PPT 打开 hachure SVG — 未验证，需记录体积和兼容性（测试只比较了 SVG 文件大小）。

### 已完成且已验证

- [x] Excalidraw 实心/斜线原型出图 — PASS（本地 PNG 目测）。
- [x] Pele 形状类覆盖核对 — PASS（shape zoo SVG 检查）。
- [x] Mermaid handDrawn 右侧裁切/子图斜线问题复现 — PASS（本地样本）。
- [x] 七套主题的样式契约、双跑确定性与无障碍门槛 — PASS（`tests/run.ts` 189/189，node 24；`scripts/lint-a11y.ts` 全过）。
- [x] 本轮未改生产代码、未提交、未推送 — PASS（仅更新文档、CHANGELOG、AGENTS.md 与 `scripts/make-style-review.ts`；工作区另有前序未提交改动）。
