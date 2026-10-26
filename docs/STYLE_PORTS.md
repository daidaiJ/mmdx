# 风格移植方案：Excalidraw 手绘 / 动森

> 状态：**已拍板，待实现** · 更新：2026-10-26 · 范围：mmdx 2.x 主题与渲染管线
>
> 本文是风格移植的决策与交接文档。实现前先看第 1、2 节；动手时看第 5、6 节；验收看第 7 节。
> 本轮未改生产代码、未提交、未推送。

## 1. 决策摘要

| 项 | 决定 |
| --- | --- |
| 范围 | 两套都做，**Excalidraw 先**，动森随后 |
| Excalidraw 填色 | **实心填色为默认**；`--style-fill hachure` 作为可选项，不单独拆主题 |
| 动森强度 | **当前 B2 强度为默认**；上会安静版后续用 `acnh-quiet` 加，不混进默认 |
| 主题名 | `-t excalidraw`、`-t acnh` |
| Pele 引擎 | Excalidraw 走 **Pele + rough.js 后处理**；不自动切 Mermaid |
| Mermaid 回退 | 允许 `--engine mermaid`，但手绘观感不同（Mermaid 自有 handDrawn），需在输出里说明 |
| 动森引擎 | 纯主题 + `blockCss`，不改渲染引擎 |
| 字体 | **随包**：Excalifont + LXGW WenKai 子集；ZCOOL KuaiLe + Baloo 2 |
| `--brand` | 仍只改强调色，不覆盖形状分色 |
| 推送 | 两套都出正式 `review/` 图，用户二次目测通过后才提交、推送 |

### 为什么是这套

- **实心填色胜出**：斜线填色（hachure）更像 Excalidraw 原生，但缩略图和投影会显脏；实心填色保留手绘轮廓，办公可读性更好。hachure 作为一档可选项即可。
- **Pele + rough.js 胜出**：Mermaid 的 `look: handDrawn` 会斜线填满子图、右侧在本样本中被裁切、roughness 硬编码 `.7`，且会把默认引擎从 Pele 切走。CSS 位移滤镜会啃缺箭头，且 `src/engine/pele.ts` 的 flatten 会丢掉 CSS `filter`。
- **动森不需要改引擎**：它的识别度来自奶油底、粗棕描边、圆角、硬偏移阴影、圆体和胶囊标签；这些是主题 CSS + 字体 + 形状阴影，不需要 rough.js。
- **字体必须随包**：原型里的 Segoe Print / 楷体 / 幼圆只用于评审，跨机器会漂；生产用 OFL 字体并内置。

## 2. 评审资产

本地评审图（`review/` 已被 gitignore，不随仓库分发）：

| 文件 | 内容 |
| --- | --- |
| `review/style-porting/review-sheet.png` | 6 图对照总表 |
| `review/style-porting/excalidraw-solid.png` | 候选 A：Excalidraw 实心填色（推荐默认） |
| `review/style-porting/excalidraw-hachure.png` | 候选 A2：Excalidraw 斜线填色（可选） |
| `review/style-porting/acnh-diagram.png` | 候选 B：动森图表 |
| `review/style-porting/acnh-blocks.png` | 候选 B2：动森卡片 / KPI / 任务 |
| `review/style-porting/sketch-pele.png` | 现状：`-t sketch`（Pele，无线条抖动） |
| `review/style-porting/sketch-mermaid.png` | 现状：`-t sketch --engine mermaid`（handDrawn，右侧裁切） |

原型说明：

- Excalidraw 原型用 `--theme-js` 换色 + 临时 rough.js 后处理，中文用系统楷体近似；生产替换为 Excalifont + LXGW WenKai。
- 动森原型用真实 `blockPage()` 标记 + 外部 CSS，中文用系统幼圆近似；生产替换为 ZCOOL KuaiLe + Baloo 2。
- 动森图表的贴纸阴影是临时复制轮廓实现；生产把同样的逻辑放进 Pele 后处理，不依赖 CSS `filter`。
- 原型脚本已复制到 `.handoff/style-ports-prototypes/`（本地，gitignored）；原始临时目录在 `C:\Users\sheng1.zhang\AppData\Local\Temp\mmdx-research\`。清理临时目录后，按本文第 5 节和这些脚本即可重做。

## 3. 调研结论（实现前必须知道）

| 缺口 | 现状 | 影响 |
| --- | --- | --- |
| Pele 无手绘能力 | `vendor/pele.global.js` 里没有 rough / handDrawn | `-t sketch` 只能换色和字体，线条仍是直的 |
| Mermaid handDrawn 不可调 | 节点 roughness 硬编码 `.7`，`handDrawnSeed` 可配 | 做不出 Excalidraw 的 roughness / bowing |
| Mermaid handDrawn 观感问题 | 子图斜线填满、右侧裁切、布局变化 | 不适合作为默认实现 |
| CSS 位移滤镜 | `feTurbulence + feDisplacementMap` 可做抖动，但箭头会被啃缺 | 不采用 |
| flatten 丢 `filter` | `src/engine/pele.ts` 只烘焙 fill/stroke/font/rx 等，没有 `filter` | CSS 阴影不可靠；动森用复制轮廓 |
| 扩展块吃不到主题 CSS | `blockPage()` 只吃 tokens；`theme.css` / `--css` 只进 Pele 和 Mermaid | 动森的圆角、粗边、阴影覆盖不到 card/kpi/task |
| 形状 CSS 覆盖不全 | `peleCss()` 只写了 rect/diam/circle/cyl | `rounded`、`stadium`、`hex`、`lean-r`、`fr-rect`、`odd` 仍是默认灰边 |
| 字体管线只有 Noto | `Assets` 只有 `fontB64`，`Renderer.injectFont()` 只注入 Noto Sans SC | 手写/圆体没有确定性 |

已核对的 Pele 形状类：`pele-shape-rect`、`rounded`、`stadium`、`cyl`、`diam`、`circle`、`hex`、`lean-r`、`fr-rect`、`odd`。rough 后处理必须按元素类型（rect / polygon / circle / ellipse / path）处理，不能只按类名写死。

## 4. 主题规格

### 4.1 Excalidraw

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
| 字体栈 | `"Excalifont", "LXGW WenKai", "Noto Sans SC", sans-serif` |
| 圆角 | 12–14px（rect）；stadium 按高度取半 |
| 描边 | 1.5px；slide 预设 2px |

rough 参数（默认）：

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
- 固定 seed，保证同一张图重复渲染一致；后续可加 `--style-seed`。
- 边线也手绘化；箭头 v1 保留 Pele 的实心三角，v2 再改开口 V。
- 子图用 rough 虚线边框，不填充。
- 支持范围 v1：flowchart / state / class / ER；sequence、pie、gantt 保持干净线条，避免全图手绘降低可读性。

### 4.2 动森

| 角色 | 值 |
| --- | --- |
| 画布 | `#FFF8E7` 奶油底，可选波点 |
| 墨线 / 主文字 | `#5B4636` |
| 描边 | `#7A5C3E`，3px（slide 可 3.5px） |
| 贴纸阴影 | `#E2CFA9`，向下 5–6px，硬边 |
| 流程 | `#FFE8A3` / `#5B4636` |
| 判定 | `#F7C873` / `#5B4636` |
| 状态 | `#BFE8B7` / `#5B4636` |
| 存储 | `#C9B8E8` / `#5B4636` |
| 子图 | `#FDF1D6` / `#C9AE8A`，虚线 |
| 强调 | `#4FA85B` |
| 警示 | `#E07A5F` |
| 系列色 | `#4FA85B, #F2B84B, #6EC6E8, #E88BA0, #A98BDB, #E07A5F, #7CCF9A, #8A735C` |
| 字体栈 | `"ZCOOL KuaiLe", "Baloo 2", "Noto Sans SC", sans-serif` |
| 圆角 | 18–22px |
| 描边 | 2.6–3px |

动森扩展块配方：

- 页面：奶油底 + 低对比波点（`radial-gradient`，18px 间距）。
- 面板：`#FFFDF5`、3px `#7A5C3E` 边、22px 圆角、`0 6px 0 #E2CFA9` 硬阴影。
- 分隔：`2px dashed #E2CFA9`。
- 标签：全圆角胶囊，状态色用低饱和底 + 深色字。
- 标题：叶子前缀（CSS `::before` 或 emoji），不要每张图堆装饰。
- 表格：奶油底、粗边、表头浅绿、斑马纹奶油色。
- KPI：大数字用 `#4FA85B`，变化列保留红涨绿跌语义。
- 上会安静版（后续 `acnh-quiet`）：2px 边、去波点、去硬阴影、圆角 16px。

## 5. 技术设计

### 5.1 能力层（先做）

扩展 `src/themes.ts` 的 `ThemeSpec`：

```ts
export interface ThemeStyle {
  rough?: boolean;
  roughness?: number;
  bowing?: number;
  fillStyle?: 'solid' | 'hachure';
  hachureGap?: number;
  fillWeight?: number;
  seed?: number;
  strokeWidth?: number;
  shadow?: { dy: number; color: string };
}

export interface ThemeSpec {
  // ...现有字段
  style?: ThemeStyle;
  blockCss?: string;
  fonts?: string[]; // 字体 family 名，和 Assets.fonts 对应
}
```

- `getTheme()` 仍然返回深拷贝；新增字段要有默认值，老主题不受影响。
- `PRESETS[name]` 仍要同时提供 Mermaid `config` 和 Pele `ThemeSpec`；`getTheme()` 缺 `pele` 会抛错。
- `peleCss()` 增加 `theme.style.strokeWidth` 覆盖；形状 CSS 补齐：
  - `.pele-shape-rect rect`、`.pele-shape-rounded rect`、`.pele-shape-stadium rect`、`.pele-shape-fr-rect rect`
  - `.pele-shape-diam polygon`、`.pele-shape-hex polygon`、`.pele-shape-lean-r polygon`、`.pele-shape-odd polygon`
  - `.pele-shape-circle circle`、`.pele-shape-double-circle circle`
  - `.pele-shape-cyl path:first-child` 填充，其余 path 只描边
  - `fr-rect` 的内侧两条竖线用 `path` 描边，不要填充
- 扩展块：`PageOpts` 增加 `blockCss?: string`；`blockPage()` 在 `PAGE_CSS` 之后追加；`cli.ts` 把 `theme.blockCss` 传进去。
- 字体：`Assets` 增加 `fonts: Array<{ family: string; b64: string }>`；`Renderer` 在 `initPage` / `renderHtml` 注入当前主题需要的 `@font-face`；`ensureEngine` 不能再只注入 Noto。字体选择走 `theme.fonts`，避免所有主题都加载全部字体。

### 5.2 Excalidraw 的 rough 后处理

位置：`src/engine/pele.ts`，`holder.innerHTML = out.svg` 之后、flatten 之前。

```ts
if (theme.style?.rough) await roughenSvg(page, el, theme.style);
```

实现要点：

1. 需要 rough.js。`node_modules/roughjs/bundled/rough.js` 27,762 bytes，MIT；加入 `vendor/rough.js` 或构建内嵌资产。仅在 `style.rough` 时注入页面，避免默认 Pele 多付解析成本。
2. 选择器：
   - `.pele-node` 的直接子元素 `rect | polygon | circle | ellipse | path`
   - `.pele-cluster > rect`
   - `.pele-edge > path:not(.pele-marker)`
   - 跳过 `.pele-marker`，v1 保留实心箭头
3. 替换前读取 `getComputedStyle` 的 `fill`、`stroke`、`strokeWidth`、`strokeDasharray`；读取元素的 `transform`，**复制到 rough 生成的 `<g>` 上**（圆柱的 transform 在 path 上，不在 node group 上，这是原型踩过的坑）。
4. 形状映射：
   - `rect`：有 `rx` 时拼圆角路径交给 `rc.path`，否则 `rc.rectangle`
   - `polygon`：`rc.polygon(points)`
   - `circle` / `ellipse`：`rc.circle` / `rc.ellipse`
   - `path`：`rc.path(d)`；圆柱的顶盖是开放 path，`fill` 按计算值处理
5. 插入 rough 节点到原元素之前，删除原元素；文字标签保持不动。不要对 `.pele-node` 整组套滤镜，否则文字会一起变形。
6. flatten 会把 rough 节点的 fill/stroke 烘焙成显式值；`--svg-themeable` 也成立，因为 rough 节点是普通 path。
7. 子图：`fill: none`、保留虚线、roughness 略低（0.8）。
8. 边线：复制 `strokeDasharray`；箭头 v1 不动，v2 再把实心三角换成 rough 开口 V。
9. 视口：rough 会有 1–2px 外扩，Pele 当前 `viewBox` 留了 20/12px，够用；如果出现裁切，先把 padding 加到 24/16。
10. 性能：原型 7 节点 / 2 子图 / 5 边，rough 生成可忽略；hachure 会让 SVG 体积涨 3–5 倍，默认实心填色。

### 5.3 动森的实现

不需要 rough.js：

- `ThemeSpec.style.shadow` + Pele 后处理：为每个节点形状复制一份轮廓，`fill` 用 `#E2CFA9`、无描边、向下 5px，插在原形状之前；圆柱、胶囊、菱形都适用。不要用 CSS `filter`，flatten 会丢。
- `blockCss` 负责 card / kpi / task / table / heatmap / vs / funnel / list / compare 的面板、圆角、粗边、阴影、虚线、胶囊。
- 字体注入：`theme.fonts = ['ZCOOL KuaiLe', 'Baloo 2']`；`@font-face` 的 family 名与字体栈一致。
- 图表主题色走 `ThemeSpec.shapes`；扩展块颜色走 tokens（`paper/ink/muted/rule/accent/paper2`），`blockCss` 只补结构样式。
- `--brand` 改 `vars.accent`，会影响 kpi 数字、左边条、swimlane 首条跨带箭头；这是预期行为。

### 5.4 字体管线

| 字体 | 用途 | 许可 | 体积 | 处理 |
| --- | --- | --- | --- | --- |
| Excalifont | Excalidraw 拉丁 | OFL-1.1 | 52,296 B woff2 | 直接内置 |
| LXGW WenKai | Excalidraw 中文 | OFL-1.1 | 25–28 MB TTF | 按 GB2312 + Latin 子集化到 ~1.5–2 MB woff2 |
| ZCOOL KuaiLe | 动森中文 | OFL-1.1 | 1,514,968 B TTF | 直接内置或轻度子集 |
| Baloo 2 / Fredoka | 动森拉丁 | OFL-1.1 | ~30–60 KB woff2 | 直接内置 |
| Noto Sans SC 子集 | 回退 | OFL-1.1 | 1.9 MB woff2 | 已有 |

- 不打包动森官方的 FOT-Rodin（商用字体）。
- `scripts/build.ts` 目前只嵌入 `NotoSansSC-Subset.woff2`；新增字体要同步 `src/embed.ts`、`scripts/build.ts`、`src/embed.generated.ts` 存根和 release workflow。
- 子集化需要 `fonttools`（`pyftsubset`）或等价的 JS 工具；本机目前没有 `pyftsubset`，实现时加 `scripts/subset-font.py` 或在 CI 里装 `fonttools[brotli]`。
- 字体文件名、family 名、字体栈三者必须一致；Pele 用 `fontFamily` 量文本，不一致会截断标签。

### 5.5 CLI 与兼容性

- `--theme` 列表加 `excalidraw`、`acnh`；`--help`、`docs/HUMAN_GUIDE.md`、`skill/SKILL.md` 同步。
- 新增 `--style-fill solid|hachure`：只对 `excalidraw` 有效；其他主题传了给 warning，不报错。非法值 exit 2。
- `--engine mermaid` + `excalidraw`：Mermaid 走 `look: 'handDrawn'` + `handDrawnSeed`，但 rough 强度、子图填色、布局与 Pele 不同；在 `--json` 的 warnings 里提示“手绘观感与 Pele 不一致”。
- `--brand` 不变；文档注明它只改 accent，不重涂形状分色。
- 旧主题（tech/openai/openai-dark/minimal/latte/mocha/sketch）行为不变；`sketch` 保留，作为“暖纸色 + 手写字体”的轻量档，不与 `excalidraw` 合并。
- 新增主题必须同时有 Mermaid `config` 和 Pele `ThemeSpec`；`getTheme()` 缺 `pele` 会抛错。

## 6. 代码改造清单

| 文件 | 改动 |
| --- | --- |
| `src/themes.ts` | `ThemeStyle` / `blockCss` / `fonts` 字段；`excalidraw`、`acnh` 预设；形状 CSS 补齐；`peleCss` 支持 `style.strokeWidth` |
| `src/engine/pele.ts` | rough 后处理调用；注入 rough.js；动森贴纸阴影复制；flatten 前完成 |
| `src/engine/types.ts` | `ThemeSpec` 新字段透传（如需要） |
| `src/render.ts` | 按主题注入字体；`renderHtml` 也注入；`Assets.fonts` 支持 |
| `src/embed.ts` | `Assets.fonts`；读取新字体；开发/编译双路径 |
| `scripts/build.ts` | 新字体嵌入；rough.js 资产；保留版本注入 |
| `scripts/subset-font.py` | LXGW WenKai 子集化（新增，或 CI 脚本） |
| `src/blocks.ts` | `PageOpts.blockCss`；`blockPage()` 追加；可能需要给 ACNH 增加钩子类 |
| `src/cli.ts` | `theme.blockCss` 透传；`--style-fill` 解析与校验；help 文案 |
| `docs/HUMAN_GUIDE.md` / `.en.md` | 新主题、`--style-fill`、字体/许可说明 |
| `skill/SKILL.md` / `docs/AGENT_GUIDE.md` | 主题表、选型建议、错误速诊 |
| `tests/run.ts` | 新主题渲染、`--style-fill`、`blockCss`、字体加载、旧主题回归 |
| `scripts/make-review.ts` | 生成 `review/style-*.png`；两套主题的 4 类图 + 4 类扩展块 |
| `.github/workflows/release.yml` | 字体/rough 资产；构建体积不变（风格移植不引入大依赖） |

实现顺序：

1. 能力层：`ThemeSpec` 字段、`blockCss`、字体注入、形状 CSS 补齐。
2. Excalidraw：预设 + rough 后处理 + `--style-fill`。
3. 生成 Excalidraw 正式 `review/` 图，用户目测。
4. 动森：预设 + 贴纸阴影 + `blockCss`。
5. 生成动森正式 `review/` 图，用户目测。
6. 测试、文档、skill 同步；用户确认后才提交/推送。

## 7. 验收标准

- [ ] `-t excalidraw` 在 Pele 下渲染 flowchart / state / class / ER，线条有手绘抖动，文字不变形。
- [ ] `-t excalidraw --style-fill hachure` 只改填色，不改变布局和文字。
- [ ] `-t acnh` 渲染 flowchart / card / kpi / task / table，面板、胶囊、硬阴影、字体符合第 4.2 节。
- [ ] 旧主题输出与当前基线一致（至少 `tech` / `sketch` 逐图像素对比或人工目测）。
- [ ] `--json`：`failed:0`，新主题不产生新 warning（Mermaid 回退的提示除外）。
- [ ] `--preset slide` 下两套主题都通过 5 米测试：标题在、字不截断、描边和填色可分辨。
- [ ] 字体跨机器一致：在没有 Segoe Print / 楷体 / 幼圆的机器上，中文仍按内置字体渲染。
- [ ] SVG 输出默认可被 Office/PPT 打开；hachure 体积增长在可接受范围（记录数值）。
- [ ] `tests/run.ts` 全绿；`scripts/make-review.ts` 生成对照图。
- [ ] 用户对 `review/` 正式图完成二次目测，明确同意后才提交/推送。

## 8. 风险与未决

| 风险 | 处理 |
| --- | --- |
| rough 外扩裁切 | 先加 viewBox padding 到 24/16；必要时按图形包围盒再留 2px |
| hachure SVG 体积 | 默认实心；hachure 仅在明确需要时开启，文档标注体积代价 |
| 箭头仍是实心三角 | v1 接受；v2 再换 rough 开口 V，避免一次改太多 |
| `--engine mermaid` 观感差异 | 文档 + `--json` warning；不自动切引擎 |
| 字体子集化依赖 | 加 `scripts/subset-font.py` + CI 安装 `fonttools[brotli]`；记录源字体 URL 和许可 |
| 字体体积 | LXGW 子集约 +2MB；Excalifont/ZCOOL/Baloo 都可控；不引入第三种中文字体 |
| 形状覆盖遗漏 | 用 `tests/diagrams` 的形状 zoo（rect/rounded/stadium/cyl/diam/circle/hex/lean-r/fr-rect/odd）逐类验证 |
| `--brand` 与粉彩冲突 | 只改 accent；文档说明；不改 shape fills |
| 视觉主观性 | 默认方案已拍板；可选项（hachure / acnh-quiet）后续单独加，不反复改默认 |

## 9. 明确不做 / 后续

- 不用 Mermaid handDrawn 作为 Excalidraw 的实现路径。
- 不用 CSS 位移滤镜做手绘抖动。
- v1 不对 sequence / pie / gantt / journey / timeline 做手绘化。
- 不在本次加入 `acnh-quiet`；等默认版验收后再评估。
- 不把 CLI 瘦身混进本次风格移植；瘦身方案另行交接。
- 不自动下载字体或浏览器。

## 10. 交接状态

- **当前阶段：** 方案已拍板，原型已出图；本轮未改生产代码。
- **工作区提醒：** 仓库已有前序未提交改动（`src/themes.ts`、`src/cli.ts`、`src/render.ts`、`scripts/build.ts` 等），不是本轮产生。实现前先 `git diff` 确认归属，并基于当前工作区文件阅读，不要按 `main` 的行号或结构直接改。
- **状态：** in-progress（待实现）。
- **提交策略：** 文档随 `docs/` 提交；评审图和原型脚本留在本地 gitignored 目录。本地 `main` 落后 `origin/main` 21 个提交，文档走独立分支推送，不直接改 `main`；合并前先对齐远端。
- **关键证据：** 原型 6 图在 `review/style-porting/`；Pele 形状类已核对；Mermaid handDrawn 右侧裁切和子图斜线问题已复现。
- **下一步：** 先做能力层 + Excalidraw，生成正式 `review/` 图给用户目测；通过后再做动森。
- **未验证：** 生产字体子集、rough 后处理在全部图型上的回归、动森 `blockCss` 对 12 种扩展块的覆盖、Office/PPT 打开 hachure SVG 的效果。
- **约束：** 用户要求先目测再推送；本轮 0 提交、0 推送。
