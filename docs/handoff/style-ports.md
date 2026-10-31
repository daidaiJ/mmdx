---
handoff_id: style-ports
status: active
---

> 本文件按用户要求随仓库提交，供跨会话/跨机器交接。评审图和原型脚本仍在本地 gitignored 的 `review/`、`.handoff/` 目录，不随仓库分发。
>
> 当前本地 `main` 与 `origin/main` 同点（`28e98f6`）；2026-10-31 的本轮改动（砍掉 `glass`、字体随包、门槛与画廊重出）在提交前。

## 1. 目标

把 Excalidraw 手绘风作为内置主题移植进 mmdx（`-t excalidraw`），覆盖 Mermaid 图与扩展块，跨机器字体一致，先目测审核再推送。此后按「新机制」而非「新配色」扩张：预设集合现为 `tech`（默认）/ `openai` / `excalidraw` / `ios` / `acnh` / `epaper` / `zed` / `zed-light` 八套，主题命名的字体全部随包。

## 2. 当前进度与状态

- **当前阶段：** 八套主题落地（`excalidraw` 走 Pele + rough.js 与 `--style-fill solid|hachure`；`ios` 纯平面系统界面，2026-10-30 加强系统感；`acnh` 奶油纸 + 点阵；`epaper` 电子纸 + 纸纹；`zed` / `zed-light` 取 Zed 的 One Dark / One Light，是第一套暗色预设，节点按 Zed 的 `node_counter % 8` 轮转 8 个 player 色、描边取 accent 原色、填充 accent 15% 混页面底色）。`--tone`（`paper` 另换网格纸）与 `mmdx card`（默认 `openai`）已落地。无障碍契约已由测试守住，2026-10-30 又加三条承载语义的门槛（连线对底、8 色系列两两色觉、系列色对底）。画廊案例改用满四个形状族的流程图并新增饼图场景。OpenAI 编辑风与 5 套办公/工程主题的移植已放弃并移除。2026-10-31 按用户判断砍掉 `glass`（亚克力依赖 `backdrop-filter`，Chromium 不渲染 SVG 形状上的该属性，与 `openai` / `ios` 区分不足），并把八套主题命名的字体全部随包（`src/fonts.ts` 注册表 + `assets/fonts/` 8 个家族约 7.3MB，`theme.fonts` 接入渲染，块页字体栈进 `blockCss` 的 `--font`），新增 `lint/theme-fonts` 门槛。用户已目测通过上一轮；正式评审仍待做。
- **状态：** in-progress
- **进度：** 调研 100% / 原型 100% / 生产实现 95% / 正式评审 0%
- **工作区：** 2026-10-30 的改动已提交为 `28e98f6` 并推送；2026-10-31 的改动（字体 + 砍 glass）在本轮提交前。开工前先 `git log -1` / `git diff` 确认起点。

## 3. 关键证据

- 决策与完整技术方案：`docs/STYLE_PORTS.md`。
- 本地评审图：`review/style-porting/review-sheet.png`（6 图对照）；`excalidraw-solid.png`、`excalidraw-hachure.png` 为最终方案与其可选档；`sketch-pele.png`、`sketch-mermaid.png` 是移植前基线；`acnh-*.png` 属动森原型的历史记录（`-t acnh` 已按它落地，见 `docs/gallery/acnh.md`）。
- 主题注册表：`src/themes.ts` 的 `PRESETS` 为 `tech` / `openai` / `excalidraw` / `ios` / `acnh` / `epaper` / `zed` / `zed-light`，`DEFAULT_THEME = 'tech'`；字体注册表为 `src/fonts.ts` 的 `BUNDLED_FONTS`（8 个家族）。
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
- [x] 无系统字体的机器上，中文与展示字体仍按内置字体渲染 — PASS（8 个家族随包，`lint/theme-fonts` 守住字体栈；`assets/fonts/` 共约 7.3MB）。
- [x] 信息卡按实际像素高度拆页，`--tone` 改变结构与像素输出。
- [x] `tests/run.ts` **201/201**（含 `lint/theme-contrast` / `theme-shape-marks` / `theme-cvd` / `shape-form-redundant` / `theme-connectors` / `theme-series-cvd` / `theme-series-contrast` / `theme-node-rotation` / `theme-fonts`；`cli/card-*` 那 4 条已随 `pngSize()` 的 `Buffer.from()` 修好）；`scripts/lint-visuals.ts` 16/16、`scripts/lint-a11y.ts` 全过。
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
- **环境限制：** 脚本可用 `bun`（1.4.2）或 `node --experimental-transform-types --no-warnings` 运行；`tests/run.ts` 走 `bun run test`。
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

- 先目测 `review/styles/before-after-2026-10-30.png`（glass 与 ios 的改前 / 改后）与 `review/styles/light-compare/review-sheet.png`（tech / openai / ios / glass 四套「浅色平面」并排，看同质化是否还成立）；再看 `review/styles/{tech,openai,excalidraw,ios,acnh,glass,epaper,zed,zed-light}/review-sheet.png`（每套 4 图 + 饼图 + 3 块），Zed 那一对另看 `review/styles/zed-compare/review-sheet.png`，最后看 `docs/gallery/` 的对应分页（每套主题五张：流程图 / 饼图 / KPI / 卡片 / 表格）。重出画廊跑 `node --experimental-transform-types --no-warnings scripts/make-gallery.ts`，重出评审图跑同参数的 `scripts/make-style-review.ts`。
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
- [x] 八套主题的样式契约、双跑确定性与无障碍门槛 — PASS（`tests/run.ts` 201/201；`scripts/lint-a11y.ts` 全过；新增的连线 / 系列色门槛实测连线最低 3.11、系列色觉最低 0.040、系列对底最低 3.00）。
- [x] 本轮（2026-10-30）的 glass 材质层重做与 ios 系统感加强已出改前 / 改后对照 — PASS（`review/styles/before-after-2026-10-30.png`，改前取 HEAD 的 `docs/gallery` 同名图）。
- [x] Zed 的节点轮转（`node_counter % 8`）与 chip 亮度配方已按 Zed 源码落地 — PASS（`crates/mermaid_render/src/postprocess/inject_css.rs` 的 `adjust_lightness` / `ACCENT_FILL_OPACITY` 与 `util.rs` 的 `text_color_for_background` 已核对；`lint/theme-node-rotation` 实测 3.00）。
- [x] 本轮（2026-10-30）的主题、门槛、画廊与文档改动已提交并推送 — PASS（`28e98f6`，`origin/main`）。
