---
handoff_id: style-ports
status: active
---

> 本文件按用户要求随仓库提交，供跨会话/跨机器交接。评审图和原型脚本仍在本地 gitignored 的 `review/`、`.handoff/` 目录，不随仓库分发。
>
> 当前本地 `main` 比 `origin/main` 落后 21 个提交，且工作区有前序未提交的 v2 改动；本文档按独立分支推送，不直接改 `main`。合并前先对齐 `origin/main`。

## 1. 目标

把 Excalidraw 手绘风和动森风作为两套内置主题移植进 mmdx：`-t excalidraw`、`-t acnh`，覆盖 Mermaid 图与扩展块，跨机器字体一致，先目测审核再推送。

## 2. 当前进度与状态

- **当前阶段：** 方案已拍板，原型已出图；本轮未改生产代码。
- **状态：** in-progress
- **进度：** 调研 100% / 原型 100% / 生产实现 0% / 正式评审 0%
- **工作区：** 存在前序未提交改动（`src/themes.ts`、`src/cli.ts`、`src/render.ts`、`scripts/build.ts` 等），不是本轮产生；开工前先 `git diff` 确认归属。

## 3. 关键证据

- 决策与完整技术方案：`docs/STYLE_PORTS.md`。
- 本地评审图：`review/style-porting/review-sheet.png`（6 图对照）；`excalidraw-solid.png`、`excalidraw-hachure.png`、`acnh-diagram.png`、`acnh-blocks.png`、`sketch-pele.png`、`sketch-mermaid.png` 同目录。
- Pele 形状类已核对：`rect / rounded / stadium / cyl / diam / circle / hex / lean-r / fr-rect / odd`。
- Mermaid handDrawn 问题已复现：子图斜线填满、右侧裁切、roughness 固定 `.7`。
- 原型的 rough 后处理已跑通：7 节点 / 2 子图 / 5 边；圆柱的 `transform` 在 path 上，必须在替换时复制。
- 动森扩展块原型使用真实 `blockPage()` 标记，CSS 是外部注入；生产需要 `blockCss` 管线。

## 4. 排查方向（不适用）

非 debug 任务，跳过。

## 5. 验收标准

- [ ] `-t excalidraw` 在 Pele 下渲染 flowchart / state / class / ER，线条手绘、文字不变形。
- [ ] `-t excalidraw --style-fill hachure` 只改填色，不改布局。
- [ ] `-t acnh` 覆盖 flowchart、card、kpi、task、table，视觉符合 `docs/STYLE_PORTS.md` 第 4.2 节。
- [ ] 旧主题（至少 `tech` / `sketch`）输出不回归。
- [ ] `--json` 无新增 warning；`--preset slide` 通过 5 米测试。
- [ ] 无 Segoe Print / 楷体 / 幼圆的机器上，中文仍按内置字体渲染。
- [ ] `tests/run.ts` 全绿；`scripts/make-review.ts` 生成正式对照图。
- [ ] 用户对正式 `review/` 图完成二次目测并明确同意后，才提交/推送。

## 6. 后续待完成的任务和步骤

1. 能力层：`ThemeSpec.style` / `blockCss` / `fonts`，`PageOpts.blockCss`，字体注入，`peleCss` 形状覆盖补齐。
2. Excalidraw：rough.js 资产 + `src/engine/pele.ts` 后处理 + 预设 + `--style-fill`。
3. 生成 Excalidraw 正式 `review/` 图，交用户目测。
4. 动森：预设 + 贴纸阴影 + `blockCss` + 字体。
5. 生成动森正式 `review/` 图，交用户目测。
6. 测试、文档、skill 同步；用户确认后才提交/推送。

## 7. 资产与使用说明

| 资产 | 路径 / 引用 | 用途 |
| --- | --- | --- |
| 决策/技术方案 | `docs/STYLE_PORTS.md` | 实现前必读；包含色板、rough 参数、CSS 配方、代码清单 |
| 评审图 | `review/style-porting/` | 本地目测；`review/` 被 gitignore，不随仓库分发 |
| 原型脚本 | `.handoff/style-ports-prototypes/` | 本地（gitignored）：theme-js、rough 后处理、ACNH 阴影、review sheet 生成脚本 |
| 原始临时目录 | `C:\Users\sheng1.zhang\AppData\Local\Temp\mmdx-research\` | 可被清理；以 `.handoff/style-ports-prototypes/` 为准 |
| 现有主题 | `src/themes.ts` | `PRESETS` / `ThemeSpec` / `peleCss` |
| Pele 引擎 | `src/engine/pele.ts` | rough 后处理插入点；flatten 逻辑 |
| 扩展块 | `src/blocks.ts` | `blockPage()` / `PAGE_CSS` |
| 字体构建 | `scripts/build.ts`、`src/embed.ts` | 新字体嵌入与注入 |
| 评审生成 | `scripts/make-review.ts` | 正式 review 图 |

## 8. 注意事项

- **已踩过的坑：** 圆柱的 `transform` 在 path 元素上，不在 node group 上；不复制会出现左上角飞出的形状。
- **已踩过的坑：** `peleCss()` 目前没覆盖 `rounded/stadium/hex/lean-r/fr-rect/odd`，做新主题前先补齐，否则描边仍是默认灰。
- **已踩过的坑：** `flatten` 不烘焙 `filter`，所以动森不要用 CSS `drop-shadow`，用复制轮廓。
- **已踩过的坑：** `blockPage()` 吃不到 `theme.css` / `--css`；必须加 `blockCss`，否则扩展块只有 token 颜色。
- **用户认同的稳定流程：** 先出 `review/` 图给用户目测，通过后才提交/推送；本轮不推送。
- **环境限制：** 本机 `bun` 命令损坏，原型用 `dist/mmdx-windows-x64.exe` + Node/puppeteer 脚本；正式实现后要用可用构建路径补跑测试并说明跑了什么。
- **工作区状态：** 已有前序未提交改动（`src/themes.ts`、`src/cli.ts`、`src/render.ts`、`scripts/build.ts` 等），不是本轮产生；不要误回滚，先 `git diff` 确认归属。
- **字体许可：** Excalifont / LXGW WenKai / ZCOOL KuaiLe / Baloo 2 均为 OFL；不要打包动森官方 FOT-Rodin。

## 9. 用户偏好

- “这些效果必须给我目测审核效果，才能推送。”
- “风格移植先拍板。”
- 先定风格，CLI 瘦身暂缓。
- 默认方案要克制：实心填色、动森当前强度；可选项后续单独加。

## 10. 建议使用的 Skill 和 MCP

- **Skill：** `control-ui`（渲染后用浏览器/截图做视觉验收）；`tdd`（rough 后处理和 CSS 覆盖的回归测试）。
- **MCP：** codebase-memory（查 Pele 选择器/调用链）；不需要联网 MCP。

## 11. 用户下个会话聚焦重点

- 先实现能力层 + Excalidraw，产出正式 `review/` 图。
- 目测通过后再做动森；不要提前混入 CLI 瘦身。
- 任何提交/推送前，先让用户看正式图。

## 12. 明确标注为验证的事项（未完成勿删）

### 已执行、待验证

- [ ] 生产字体子集与跨机器渲染 — 目前只有系统字体原型，LXGW WenKai 子集尚未生成。
- [ ] rough 后处理覆盖全部图型 — 原型只覆盖 flowchart 的节点/子图/边；class/ER/state 选择器待验证。
- [ ] 动森 `blockCss` 对 12 种扩展块的覆盖 — 原型只做了 card/kpi/task。
- [ ] Office/PPT 打开 hachure SVG — 未验证，需记录体积和兼容性。
- [ ] `--engine mermaid` + `excalidraw` 的观感差异 — 未做正式对比图。

### 已完成且已验证

- [x] Excalidraw 实心/斜线原型出图 — PASS（本地 PNG 目测）。
- [x] 动森图表/扩展块原型出图 — PASS（本地 PNG 目测）。
- [x] Pele 形状类覆盖核对 — PASS（shape zoo SVG 检查）。
- [x] Mermaid handDrawn 右侧裁切/子图斜线问题复现 — PASS（本地样本）。
- [x] 本轮未改生产代码、未提交、未推送 — PASS（仅新增文档/AGENTS.md/.gitignore 条目；工作区另有前序未提交改动）。
