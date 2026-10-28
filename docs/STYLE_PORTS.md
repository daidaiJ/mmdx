# 风格移植方案：Excalidraw 手绘

> 状态：**`excalidraw` 已实现；OpenAI 编辑风与办公/工程批次已放弃；主题集合固定为 `tech` / `openai` / `excalidraw` 三套** · 更新：2026-10-28 · 范围：mmdx 2.x 主题与渲染管线
>
> 本文是风格移植的决策与交接文档。色板与 rough 参数见第 3 节，Pele 集成见第 5 节，放弃的移植见第 6 节，未决问题见第 7 节。

## 1. 决策摘要

| 项 | 决定 |
| --- | --- |
| 范围 | 只保留 Excalidraw 手绘风；OpenAI 编辑风与办公/工程批次放弃（见第 6 节） |
| 主题名 | `-t excalidraw`；默认主题仍是 `tech` |
| 填色 | **实心填色为默认**；`--style-fill hachure` 作为可选项，不单独拆主题 |
| Pele 引擎 | Excalidraw 走 **Pele + rough.js 后处理**；不自动切 Mermaid |
| Mermaid 回退 | 允许 `--engine mermaid`，但手绘观感不同（Mermaid 自有 handDrawn），需在输出里说明 |
| 字体 | 目标为随包的 Excalifont + LXGW WenKai 子集；**当前实际字体栈回退到系统字体**（见第 7 节） |
| `--brand` | 仍只改强调色，不覆盖形状分色 |
| 推送 | 出正式 `review/` 图，用户二次目测通过后才提交、推送 |

### 为什么是这套

- **实心填色胜出**：斜线填色（hachure）更像 Excalidraw 原生，但缩略图和投影会显脏；实心填色保留手绘轮廓，办公可读性更好。hachure 作为一档可选项即可（实测同一张流程图 SVG 由 55,009 B 涨到 79,973 B）。
- **Pele + rough.js 胜出**：Mermaid 的 `look: handDrawn` 会斜线填满子图、右侧在本样本中被裁切、roughness 硬编码 `.7`，且会把默认引擎从 Pele 切走。CSS 位移滤镜会啃缺箭头，且 `src/engine/pele.ts` 的 flatten 会丢掉 CSS `filter`。

## 2. 评审资产

本地评审图（`review/` 已被 gitignore，不随仓库分发）：

| 文件 | 内容 |
| --- | --- |
| `review/style-porting/review-sheet.png` | 6 图对照总表 |
| `review/style-porting/excalidraw-solid.png` | 候选 A：Excalidraw 实心填色（最终默认） |
| `review/style-porting/excalidraw-hachure.png` | 候选 A2：Excalidraw 斜线填色（可选档） |
| `review/style-porting/sketch-pele.png` | 移植前基线：`-t sketch`（Pele，无线条抖动） |
| `review/style-porting/sketch-mermaid.png` | 移植前基线：`-t sketch --engine mermaid`（handDrawn，右侧裁切） |

`acnh-*.png` 是已取消的动森原型，仅作历史记录，不再维护。

原型脚本已复制到 `.handoff/style-ports-prototypes/`（本地，gitignored）；原始临时目录在 `C:\Users\sheng1.zhang\AppData\Local\Temp\mmdx-research\`。

## 3. 主题规格

### 3.1 Excalidraw 色板

| 角色 | 值 |
| --- | --- |
| 画布 | `#FFFFFF` |
| 墨线 / 主文字 | `#1E1E1E` |
| 次要文字 | `#868E96` |
| 流程 | `#A5D8FF` 填充 / `#1E1E1E` 描边 |
| 判定 | `#FFEC99` / `#1E1E1E` |
| 状态 | `#B2F2BB` / `#1E1E1E` |
| 存储 | `#D0BFFF` / `#1E1E1E` |
| 子图 | `#F8F9FA` / `#ADB5BD`，虚线 |
| 强调 | `#1971C2` |
| 警示 | `#E03131` |
| 系列色 | `#1971C2, #2F9E44, #F08C00, #E03131, #7950F2, #0C8599, #E8590C, #868E96` |
| 字体栈 | `"Excalifont", "LXGW WenKai", "Noto Sans SC", sans-serif`（源码里另带系统手写体回退） |
| 圆角 | 12–14px（rect）；stadium 按高度取半 |
| 描边 | 1.5px；slide 预设 2px |

### 3.2 rough 参数（默认）

```json
{
  "roughness": 1.0,
  "bowing": 1.2,
  "fillStyle": "solid",
  "hachureAngle": -41,
  "hachureGap": 7,
  "fillWeight": 1.1,
  "seed": 41,
  "strokeLineCap": "round",
  "strokeLineJoin": "round"
}
```

- `--style-fill hachure` 时只改 `fillStyle`，其余不变。
- 固定 seed 保证同一张图重复渲染一致；`seed` 目前没有 CLI 开关。
- 边线也手绘化；箭头 v1 保留 Pele 的实心三角，v2 再改开口 V。
- 子图用 rough 虚线边框、不填充，roughness 降到 0.8；边线 roughness 降到 0.9。
- 支持范围 v1：flowchart / state / class / ER；sequence、pie、gantt 保持干净线条，避免全图手绘降低可读性。

## 4. 调研结论（背景）

| 缺口 | 现状 | 影响 |
| --- | --- | --- |
| Pele 无手绘能力 | `vendor/pele.global.js` 里没有 rough / handDrawn | 主题只能换色和字体，线条仍是直的 |
| Mermaid handDrawn 不可调 | 节点 roughness 硬编码 `.7`，`handDrawnSeed` 可配 | 做不出 Excalidraw 的 roughness / bowing |
| Mermaid handDrawn 观感问题 | 子图斜线填满、右侧裁切、布局变化 | 不适合作为默认实现 |
| CSS 位移滤镜 | `feTurbulence + feDisplacementMap` 可做抖动，但箭头会被啃缺 | 不采用 |
| flatten 丢 `filter` | `src/engine/pele.ts` 只烘焙 fill/stroke/font/rx 等，没有 `filter` | 不能用 CSS 阴影，必须用形状复制 |
| 扩展块吃不到主题 CSS | `blockPage()` 只吃 tokens | 已用 `ThemeSpec.blockCss` 解决 |
| 形状 CSS 覆盖不全 | `peleCss()` 原先只写了 rect/diam/circle/cyl | 已用 `shapeCoverage` 补齐 |

已核对的 Pele 形状类：`pele-shape-rect`、`rounded`、`stadium`、`cyl`、`diam`、`circle`、`hex`、`lean-r`、`fr-rect`、`odd`。

## 5. Pele 集成

### 5.1 能力层

`ThemeSpec` 新增：

```ts
export interface ThemeStyle {
  rough?: boolean;
  roughness?: number;
  bowing?: number;
  fillStyle?: 'solid' | 'hachure';
  hachureGap?: number;
  hachureAngle?: number;
  fillWeight?: number;
  seed?: number;
  strokeWidth?: number;
  shapeCoverage?: boolean;
}

export interface ThemeSpec {
  // ...现有字段
  style?: ThemeStyle;
  blockCss?: string;
  fonts?: string[];
}
```

- `getTheme()` 返回深拷贝；`PRESETS[name]` 同时提供 Mermaid `config` 和 Pele `ThemeSpec`，缺 `pele` 会抛错。
- `peleCss()` 读取 `theme.style.strokeWidth`；`shapeCoverage` 打开时补齐 rounded/stadium/fr-rect/hex/lean-r/odd、class/entity/annotation、state 起止与 ER 分隔线。
- `PageOpts.blockCss` 让 `blockPage()` 在 `PAGE_CSS` 之后追加主题版式；`cli.ts` 透传 `theme.blockCss`。
- `theme.fonts` 字段已保留，但当前渲染只注入随包的 Noto Sans SC（见第 7 节）。

### 5.2 rough 后处理

位置：`src/engine/pele.ts`，`holder.innerHTML = out.svg` 之后、flatten 之前，仅在 `theme.style.rough` 时执行。

1. `vendor/rough.js` 随构建内嵌（MIT，约 27 KB），只在需要手绘时注入页面，默认 Pele 不多付解析成本；资产缺失直接报错。
2. 选择器：
   - `.pele-node` 的直接子元素 `rect | polygon | circle | ellipse | path`
   - `.pele-cluster > rect`
   - `.pele-edge > path:not(.pele-marker)`
   - 跳过 `.pele-divider` / `.pele-er-divider` / `.pele-marker` / `.pele-icon`；v1 保留实心箭头。
3. 替换前读取 `getComputedStyle` 的 `fill`、`stroke`、`strokeWidth`、`strokeDasharray`；元素的 `transform` **必须复制到 rough 生成的节点上**（圆柱的 transform 在 path 上，不在 node group 上）。
4. 形状映射：
   - `rect`：有 `rx` 时拼圆角路径交给 `rc.path`，否则 `rc.rectangle`
   - `polygon`：`rc.polygon(points)`
   - `circle` / `ellipse`：`rc.circle` / `rc.ellipse`
   - `path`：`rc.path(d)`
5. 插入 rough 节点到原元素之前，删除原元素；文字标签保持不动，不要对 `.pele-node` 整组套滤镜。
6. flatten 会把 rough 节点的 fill/stroke 烘焙成显式值；`--svg-themeable` 也成立，因为 rough 节点是普通 path。
7. 视口：rough 会有 1–2px 外扩，Pele 当前 `viewBox` 留了 20/12px，够用；若出现裁切，先把 padding 加到 24/16。

### 5.3 CLI 与兼容性

- `--theme` 只剩 `tech` / `openai` / `excalidraw`；未知主题报错并列出可用值。
- `--style-fill solid|hachure`：只对 `excalidraw` 有效；其他主题传了给 `config-ignored` 类 warning，不报错；非法值 exit 2。
- `--engine mermaid` + `excalidraw`：Mermaid 走 `look: 'handDrawn'` + `handDrawnSeed`，但 rough 强度、子图填色、布局与 Pele 不同，`--json` 的 warnings 里提示手绘观感不一致。
- `--brand` 只改 `vars.accent`，不改 shape fills。

## 6. 已放弃的移植

为了让预设集合停在 `tech` / `openai` / `excalidraw` 三套，以下移植在实现后被移除：

| 移植 | 内容 | 结果 |
| --- | --- | --- |
| OpenAI 编辑风 `openai-editorial` | Open Design 的 OpenAI token：纯白/墨黑/teal、发丝边框、衬线图题、16px 块版式 | 移除；保留的 `openai` 仍是近单色 + 薄荷点缀的既有预设 |
| 办公/工程批次 `vercel` / `linear` / `stripe` / `notion` / `ibm` | 各带独立 token、`shapeCoverage` 与 `blockCss` 的五套风格 | 移除；token 与版式不再维护 |
| 动森（ACNH） | 奶油底、粗棕描边、硬偏移阴影、圆体字 | 调研阶段即取消，未实现 |

随之移除的还有：`openai-dark`、`minimal`、`latte`、`mocha`、`sketch`。这些主题名现在会报 `unknown theme`；`docs/gallery/` 里保留的对应 PNG 只作历史对照，不再有对应页面。

保留的通用能力不随主题回退：`ThemeSpec.style` / `blockCss` / `fonts`、`shapeCoverage`、rough 后处理、`--style-fill`、`--tone`、`mmdx card`。

## 7. 风险与未决

| 风险 / 未决 | 现状 | 处理 |
| --- | --- | --- |
| 生产字体 | 只随包 Noto Sans SC；Excalifont 与 LXGW WenKai 子集未生成，`theme.fonts` 尚未接入渲染 | 子集化（`fonttools`）后同步 `src/embed.ts`、`scripts/build.ts`、release workflow；文件名、family 名、字体栈三者一致 |
| rough 外扩裁切 | Pele `viewBox` padding 20/12px 未改动 | 出现裁切再加到 24/16，必要时按包围盒再留 2px |
| hachure 体积 | 流程图 SVG 55,009 → 79,973 B | 默认实心；hachure 仅在明确需要时开启，文档标注体积代价 |
| 箭头仍是实心三角 | v1 接受 | v2 再换 rough 开口 V |
| `--engine mermaid` 观感差异 | 已有 warning，未出正式对比图 | 补一张同图对照后再定是否调整提示文案 |
| 形状覆盖遗漏 | `shapeCoverage` 已覆盖 shape zoo，测试含 rough 形状契约 | 新增形状时同步 `tests/diagrams` 的形状 zoo |
| `--brand` 与粉彩冲突 | 只改 accent | 不改 shape fills；文档说明 |
| 视觉主观性 | 默认方案已拍板 | hachure 后续单独评估，不反复改默认 |

## 8. 明确不做

- 不用 Mermaid handDrawn 作为 Excalidraw 的实现路径。
- 不用 CSS 位移滤镜做手绘抖动。
- v1 不对 sequence / pie / gantt / journey / timeline 做手绘化。
- 不恢复 OpenAI 编辑风与办公/工程批次；新增风格必须先把三套预设的验收闭环。
- 不把 CLI 瘦身混进风格移植；瘦身方案另行交接。
- 不自动下载字体或浏览器。

## 9. 实现进度

已落地：

- `ThemeSpec` 增加 `style` / `blockCss` / `fonts`；`PageOpts.blockCss` 已接入 `blockPage()`。
- `peleCss()` 的 `shapeCoverage` 档：rounded/stadium/fr-rect/hex/lean-r/odd、class/entity/annotation、state 起止、ER 分隔线/条纹。
- `rough.js` 已 vendor，构建脚本嵌入；`pele.ts` 在 SVG 生成后、flatten 前执行手绘替换。
- `-t excalidraw`：粉彩填色 + rough 线条；`--style-fill solid|hachure`；块版式白板卡片；`shapeCoverage` 打开。
- `--tone paper|neutral|product`（`src/tone.ts`）：只覆盖块页结构与信息卡，配色仍走主题。
- `mmdx card`（`src/card.ts`）：Markdown 或 URL → 信息卡 PNG，默认 `openai`，`--tone`、480/600/900+ 宽度、按实际像素高度拆页。
- `scripts/make-style-review.ts` 生成 `review/styles/` 三套主题的 4 类图 + card/kpi/table，Excalidraw 另加 hachure 版。
- `scripts/make-gallery.ts` 与 [docs/GALLERY.md](GALLERY.md)：同一「灰度发布复盘」案例在 `tech` / `openai` / `excalidraw` 下的分场景对照。
- `tests/run.ts` 覆盖样式契约、rough 形状、`--style-fill`、三套主题的渲染筛查与双跑确定性；当前 146/146 通过。

待做：

- 生产字体子集（Excalifont / LXGW WenKai）尚未加入；当前用系统字体回退。
- 未做用户正式目测；`docs/gallery/*.png` 为待审图。`review/styles/{tech,openai,excalidraw}/review-sheet.png` 已按三套主题重出（`openai-editorial` 的旧目录已删除）。
