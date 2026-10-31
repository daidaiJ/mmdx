# 风格移植方案：Excalidraw 手绘

> 状态：**`excalidraw` / `ios` / `acnh` / `epaper` / `zed` / `zed-light` 已实现；`glass` 已砍掉；OpenAI 编辑风与办公/工程批次已放弃；主题集合为 `tech` / `openai` / `excalidraw` / `ios` / `acnh` / `epaper` / `zed` / `zed-light` 八套，字体全部随包** · 更新：2026-10-31 · 范围：mmdx 2.x–3.x 主题与渲染管线
>
> 本文是风格移植的决策与交接文档。色板与 rough 参数见第 3 节，Pele 集成见第 5 节，放弃的移植见第 6 节，未决问题见第 7 节。

## 1. 决策摘要

| 项 | 决定 |
| --- | --- |
| 范围 | 只保留 Excalidraw 手绘风；OpenAI 编辑风与办公/工程批次放弃（见第 6 节） |
| 主题名 | `-t excalidraw`；默认主题仍是 `tech` |
| 填色 | **实心填色为默认**；`--style-fill hachure` 作为可选项，不单独拆主题 |
| Pele 引擎 | Excalidraw 走 **Pele + rough.js 后处理**（2.x 起 Pele 是唯一引擎） |
| 第二引擎 | Mermaid + ELK 回退已随 2.x 移除；`excalidraw` 只有 Pele + rough.js 一条实现路径 |
| 字体 | 八套主题命名的字体全部随包（Noto Sans SC / Noto Serif SC / 霞鹜文楷 / Excalifont / 站酷快乐体 / Baloo 2 / Newsreader / JetBrains Mono，合计 7.3MB），`lint/theme-fonts` 守住「主题不得命名未随包的字体」，见第 5.6 节 |
| `--brand` | 仍只改强调色，不覆盖形状分色 |
| 推送 | 出正式 `review/` 图，用户二次目测通过后才提交、推送 |

### 为什么是这套

- **实心填色胜出**：斜线填色（hachure）更像 Excalidraw 原生，但缩略图和投影会显脏；实心填色保留手绘轮廓，办公可读性更好。hachure 作为一档可选项即可（实测同一张流程图 SVG 由 55,009 B 涨到 79,973 B）。
- **Pele + rough.js 胜出**：当时那条被放弃的替代路径是 Mermaid 的 `look: handDrawn`——它会斜线填满子图、右侧在本样本中被裁切、roughness 硬编码 `.7`，且要把默认引擎从 Pele 切走（该引擎已在 2.x 移除，此处仅留决策记录）。CSS 位移滤镜会啃缺箭头，且 `src/engine/pele.ts` 的 flatten 会丢掉 CSS `filter`。

## 2. 评审资产

本地评审图（`review/` 已被 gitignore，不随仓库分发）：

| 文件 | 内容 |
| --- | --- |
| `review/style-porting/review-sheet.png` | 6 图对照总表 |
| `review/style-porting/excalidraw-solid.png` | 候选 A：Excalidraw 实心填色（最终默认） |
| `review/style-porting/excalidraw-hachure.png` | 候选 A2：Excalidraw 斜线填色（可选档） |
| `review/style-porting/sketch-pele.png` | 移植前基线：`-t sketch`（Pele，无线条抖动） |
| `review/style-porting/sketch-mermaid.png` | 历史基线（第二引擎已移除，仅存档）：`-t sketch --engine mermaid`（handDrawn，右侧裁切） |

`acnh-*.png` 是动森原型的历史记录（原型 CSS 在 `.handoff/style-ports-prototypes/`）；`-t acnh` 已按它落地，正式样张见 `docs/gallery/acnh-*.png`。

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
| 字体栈 | `"Excalifont", "LXGW WenKai", "Noto Sans SC", cursive, sans-serif`（前两者随包；系统手写体回退已删除，装没装 Segoe Print 都会改变出图） |
| 圆角 | 12–14px（rect）；stadium 按高度取半 |
| 描边 | 1.5px；slide 预设 2px |

### 3.1b 后续三套风格（2026-10）

`ios` / `acnh` / `epaper` 与 `--tone paper` 的色板。`acnh` 自带底，`epaper` 的底是纸纹，`paper` 是 tone 不是主题。

| 角色 | `ios` | `acnh` | `epaper` | `--tone paper` |
| --- | --- | --- | --- |
| 画布 | `#F2F2F7` | `#FFF8E7` | `#F5F1EB` | `#FAFAF8` |
| 主文字 | `#1C1C1E` | `#5B4636` | `#1A1A1A` | `#1F2024` |
| 次要文字 | `#6E6E73` | `#8A735C` | `#5C5C5C` | `#5D6167` |
| 面板 | `#FFFFFF` | `#FFFDF5` | `#F5F1EB` | `#FFFFFF` |
| 描边 / 分隔 | `#D1D1D6` | `#D9C3A5`（线用 `#7A5C3E`） | `#1A1A1A` | `#E1E1DC` |
| 强调 | `#007AFF` | `#3E8C4A` | `#1A1A1A` | `#BF4520` |
| 警示 | `#FF3B30` | `#A33B2A` | `#1A1A1A` | `#A01D48` |
| 圆角 | 14px | 16px | 0 | 10px |
| 描边宽 | 1.6px | 2.6px | 1.1px | 沿用原主题 |

形状族：`ios` 用系统色描边（蓝 / 橙 / 绿 / 紫）+ 白填充（**纯平面**：不画底、不加投影）；`acnh` 奶油白填充 + 棕描边 + 硬偏移贴纸阴影；`epaper` 全部黑描边，用灰阶填充（`#FFFFFF` / `#EFEEE9` / `#E4E3DE` / 纸底）区分；`--tone paper` 换成冷蓝 / 沙 / 鼠尾草 / 紫灰填充 + 墨色描边。2026-10-30 的复查把 `ios` 的系统感坐实：圆角 10 → 14px、描边 1.25 → 1.6px、判定/状态/存储填充换成系统色更实的浅调（`#FFE9CF` / `#E3F6E7` / `#F1E9FB`），块页补齐 HIG 分组列表的 `›` 折角、分隔线提到 iOS 的 0.29 alpha、标题 20px/700。

`epaper` 取自 [E-Ink / Paper（ui-ux-pro-max #56）](https://jacky0328.github.io/ui-ux-pro-max-web/styles/56-eink-paper.html)：`#f5f1eb` 纸底 + `opacity-5` 的 `feTurbulence` 纸纹（SVG 里是同一条滤镜，块页用同一张 data-URI 贴图）、1px 墨线、直角、衬线标题 + 等宽小字标签。

`--tone paper` 的配色取自 [diagram-design](https://github.com/cathrynlavery/diagram-design) 的 editorial skin（白烟纸 `#F5F5F5`、墨黑 `#2D3142`、蓝灰 `#4F5D75`、焦橙 `#BF4520`）。原型的暖黄纸底 `#FBF7EC` 已废弃：观感偏「信封」而不是「文档纸」，且强调色与背景的对比度余量小。现在纸底是灰白 `#FAFAF8` + 24px 细格线 / 96px 粗格线（`rgba(31,32,36,.09)` / `.16`），块页用 CSS 渐变画同一张网格，图用 SVG `<pattern>`。

### 3.1c Zed 编辑风（2026-10-30）

`zed` / `zed-light` 取 Zed 编辑器自带主题的 token，来源是 Zed 仓库的 `assets/themes/one/one.json`（`themes[0]` 暗 / `themes[1]` 亮），映射规则照 `crates/markdown/src/mermaid.rs` 的 `build_mermaid_theme`（编辑器 token → mermaid 主题槽位）。这是主题集合里第一套暗色。

| 角色 | `zed`（One Dark） | `zed-light`（One Light） | Zed token |
| --- | --- | --- | --- |
| 画布 | `#282C33` | `#FAFAFA` | `editor.background` |
| 主文字 | `#DCE0E5` | `#242529` | `text` |
| 次要文字 | `#A9AFBC` | `#58585A` | `text.muted` |
| 边线 | `#7A8598` | `#7C7E86` | `terminal.dim_foreground` / `comment.doc` |
| 面板 / 描边 | `#2F343E` / `#464B57` | `#EBEBEC` / `#C9C9CA` | `surface.background` / `border` |
| 强调 / 警示 | `#74ADE8` / `#D07277` | `#5C78E2` / `#D36151` | `info` / `error` |
| 形状族描边 | 蓝 `#74ADE8` · 沙 `#BF956A` · 绿 `#A1C181` · 紫 `#B477CF` | 蓝 `#5C78E2` · 赭 `#AD6E26` · 绿 `#3F953A` · 品红 `#984EA5` | `info` / 语法 number / `created` / 语法 keyword |
| 形状族填充 | `#333F4E` / `#3F3C3B` / `#3A423F` / `#3D374A` | `#E2E7F6` / `#EEE5DA` / `#DEEBDD` / `#EBE0ED` | 上面各色 15% 混画布 |
| 8 色系列 | 主题 8 个 player 色的微调值 | 同上（亮的 8 个，微调） | `players[].cursor` |
| 节点上色 | **按读取顺序轮转 8 个 player 色**（`node_counter % 8`） | 同上 | `postprocess/accent_colors.rs` |

描边 1px（Zed 的发丝线），无投影、无底纹、无手绘、不画 `mmdx-backdrop`。

**吸收的机制**（Zed 的实现事实见 [research-zed-mermaid.md](research-zed-mermaid.md) §1.3）：

- **accent 填充 = accent 按 15% 混页面底色**，而不是混白。`src/color.ts` 的 `blendOver(fg, bg, opacity)` 按通道混合，对齐 Zed 的 `ACCENT_FILL_OPACITY = 0.15`。Zed 把它用在 flowchart 节点上（按节点序号轮转 8 个 player 色），mmdx 用在四个形状族上，保留形状分色语义。
- **文字色由底色推导**：`src/color.ts` 的 `textColorFor(bg)` 在 OKLab 里保留底色 15% 的彩度、亮度取 0.18（浅底）/ 0.96（深底），二分搜索保 ≥4.5:1，兜底纯黑/纯白。`zed` 的块页状态 chip 用它生成，所以浅底深底共用一条规则。
- **tint 跟着页面走**：`accentTint(accent, bg)` 现在接受底色，CLI / `mmdx card` / 门禁脚本都传 `theme.vars.bg`；`PAGE_CSS` 里 6 处 `color-mix(..., white)` 改成 `color-mix(..., var(--paper))`（进度条、对比条、热力图 lv1–3）。白底主题逐字节不变，非白底主题（`ios` / `epaper` / `acnh` / `--tone paper`）的条与热力格向自己的纸色靠 1–3%。
- **暗色块页**：`ZED_DARK_BLOCK_CSS` 覆写 `color-scheme`、面板底、发丝线、状态 chip、热力图最高档与泳道底；其余仍走 `var(--paper)` / `var(--ink)`，所以暗色块页不需要重写 `PAGE_CSS`。

**节点轮转**：Zed 对 flowchart / class / state 的节点按 `node_counter % 8` 依次取 8 个 player 色，描边取该色、填充是该色按 15% 混页面底色——一张图因此是**多色轮转**而不是按形状分色。Pele 把一张图的节点按文档顺序写进一个 `<g>`，所以实现是一组 `:nth-child(8n+k)` 规则（`ThemeStyle.nodeRotation`，选择器只覆盖 `.pele-flowchart` / `.pele-class` / `.pele-state` 的 `.pele-nodes > .pele-node`，并用 `:not()` 排除状态起止标记与复合状态框）。形状族规则保留给其余槽位（ER 实体、注释、类图分隔线、状态起止、簇）。ER 的奇偶行覆盖、sequence actor 的轮转没有做：前者 Pele 走 `.pele-er-stripes`，后者 Pele 把上下两组 actor 放在同一个 `<g>` 里，纯 CSS 无法让同一 actor 的上下两个盒子取同色。

**chip 亮度**：Zed 的 error / warning chip 先把颜色按 HSL 亮度缩放（暗色 ×0.7、亮色 ×1.3，`postprocess/inject_css.rs` 的 `adjust_lightness`），再用 `text_color_for_background` 取文字色。mmdx 的 `scaleLightness()` 做同一件事，只是把缩放放在 OKLab 的 L 上（本项目的统一度量）。

**不吸收**：Zed 的「所有节点同一底色」（轮转与形状族规则覆盖了它）；Zed 的 `crates/mermaid_render` 代码（GPL-3.0-or-later，只读设计）；`mermaid_font_family` 设为 `null` 时的「跟随编辑器字体」——中文标签需要随包的 CJK 字体栈，沿用统一字体。

门槛实测：`zed` 正文 10.57:1（AAA）、次要 6.37、强调 5.93、警示 4.24、形状描边对底 4.33–6.98 / 对填充 3.51–5.77、形状色觉最小 ΔE 0.065；`zed-light` 14.67 / 6.80 / 3.84 / 3.59 / 3.06–5.07 / 0.030。轮转带来的新门槛（`lint/theme-node-rotation`）：8 个 player 色对自己的 15% 底色各 ≥ 3:1，两套实测 3.00；系列色对底最低 3.51，系列两两色觉最低 0.040。

2026-10-30 复查的两处修正（都为了过新的承载语义门槛）：边线 `terminal.dim_foreground` 原值 `#636D83` 对画布只有 2.70:1，低于连线门槛，提亮到 `#7A8598`（3.76:1）；8 个 player 色原值在色觉模拟下有两对几乎重合（`#74ADE8`/`#6EB4BF` tritan ΔE 0.013），按「只挪必要的色、保持色相」微调为 `#7DA9E4` / `#5FB9C6` 等，最小 ΔE 0.040。`zed-light` 同理（`#A349AB` / `#3A82B7` 调整，deutan 0.009 → 0.040）。

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

> 本节是 1.x 时期的调研记录，当时 Mermaid 仍是可切换的第二引擎；该引擎已在 2.x 移除，下表只解释当初为什么选 rough.js。

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
- `theme.fonts` 已接入：`Renderer` 按「随包黑体 + 主题 `fonts` + 等宽」注入 `@font-face` 并等 `document.fonts.load`（见第 5.6 节）。

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

- `--theme` 为 `tech` / `openai` / `excalidraw` / `ios` / `acnh` / `epaper` / `zed` / `zed-light`；未知主题（含已砍掉的 `glass`）报错并列出可用值。
- `--style-fill solid|hachure`：只对 `excalidraw` 有效；其他主题传了给 `config-ignored` 类 warning，不报错；非法值 exit 2。
- `--engine` / `--layout` 已不存在：`excalidraw` 的手绘后处理只在 Pele 输出上执行，没有第二引擎的观感分叉。
- `--brand` 只改 `vars.accent`，不改 shape fills。

### 5.4 底与材质层

自带底的风格（`acnh` / `epaper`，以及 `--tone paper`）走同一条管线，参数在 `ThemeSpec.backdrop`（`ThemeBackdrop`，纯数据，可 JSON 序列化）：

```ts
export interface ThemeBackdrop {
  base: string;
  blur?: number;                     // 只作用于色块组
  blobs?: Array<{ cx; cy; r; color; opacity }>;   // 归一化坐标
  dots?: { color; size; gap };       // 点阵纸纹
  grid?: { color; gap; width; major? };           // 网格纸
  fade?: number;                     // 边缘淡出起点，默认 92
  pane?: { color; opacity; noise };  // 亚克力半透膜 + 颗粒
}
```

引擎在 `viewBox` 改写之后插入三层：`<rect>` 底色 → `<g class="mmdx-backdrop">` → 图。组内顺序是 色块（带模糊）→ 点阵/网格 → 半透膜 → 颗粒，只有色块被 `feGaussianBlur`，网格与膜保持清晰。整组套一层径向淡出遮罩（内缩 14px、`rx 18`）。

三条必须记住的约束：

- **Chromium 不渲染 SVG 形状上的 `backdrop-filter`**（实测：有/无该属性时边缘过渡都是 0px）。毛玻璃只能靠「底下没有锐利细节 + 面板半透明」伪造；块页是 HTML，`backdrop-filter` 在那里是真生效的。亚克力风格已按此结论砍掉（见第 6 节）。
- **PNG 整幅截取**：`captureElement(..., fullBleed = !!theme.backdrop)` 跳过墨迹裁边。按墨迹裁边会跟着底的边缘走，四边留白不对称；代价是底的留白由 `viewBox` 的 20/12px 决定。
- **底的对比度必须压在墨迹阈值之下或做成纹理**：`tests/run.ts` 的 `analyze()` 以左上角像素为背景、差值 >40 记为墨迹。整片实色底会被记成墨迹、`ink` 直接超过 0.85 上限；所以 `paper` 的色差控制在每通道 ~12、`paper` 的网格是线条（面积占比 <10%）。
- **flatten 烘焙 `filter`**：否则 `ios` 的卡片投影与 `acnh` 的贴纸硬阴影进不了 SVG。
- **截取前归一化 body 盒**：`captureElement` 会写 `margin:0;padding:0;overflow:hidden`。浏览器默认的 8px body margin 会让整幅截取错位 8px（自带底的风格尤其明显，其它主题被墨迹裁边掩盖）。

### 5.5 无障碍契约（2026-10-30）

信息不只靠颜色承载。主题色板现在有硬门槛，`tests/run.ts` 与 `scripts/lint-a11y.ts` 双向守：

| 通道 | 门槛 | 现状 |
| --- | --- | --- |
| 正文色（`fg`） | ≥ 7:1（WCAG AAA） | 最低 8.35（`acnh`） |
| 次要文字（`muted`） | ≥ 4.5:1（AA） | 最低 4.54（`ios`） |
| 承载语义的色（`accent` / `critical`） | ≥ 3:1（非文本图形） | 最低 3.20（`openai` accent） |
| 形状描边 vs 底、vs 自己的填充 | 各 ≥ 3:1 | 最低 3.06（`zed-light` state 描边对填充） |
| 色觉模拟（protan / deutan / tritan） | 描边色不同的形状族两两 ΔE(OKLab) ≥ 0.02 | 最低 0.025（`tech` tritan） |
| 形态冗余 | 四个形状族必须是四种不同形状（rect / diam / stadium / cyl） | 4/4 |
| 连线色 vs 底（`lint/theme-connectors`） | ≥ 3:1 | 最低 3.11（`--tone paper`） |
| 8 色系列两两色觉（`lint/theme-series-cvd`） | 任意两色 ΔE ≥ 0.02 | 最低 0.040（八套全部） |
| 系列色 vs 底（`lint/theme-series-contrast`） | ≥ 3:1，因为饼图数值用页面底色「抠」在切片上 | 最低 3.00（`tech` / `openai` / `excalidraw` / `acnh`） |
| 主题字体（`lint/theme-fonts`） | 主题不得命名未随包的家族，也不得把系统字体排在随包字体之前 | 8 个随包家族，全部有主题或文档路径使用 |

主题字体门槛（`lint/theme-fonts`）：每个主题的字体栈里，排在随包家族之前的非通用家族必须自己随包，主题 `fonts[]` 声明的家族必须在注册表里，注册表里每个家族至少被一个主题或文档路径使用。配套实现：`src/color.ts`（WCAG 亮度/对比、Machado 2009 色觉模拟、OKLab 感知距离）、`scripts/lint-a11y.ts`（可读报告 + 退出码）、`src/lint.ts` 的渲染态文本审计改为 WCAG 分档（小字 4.5:1 / 大字 3:1，按 computed font-size 与字重判断）。

改动过的色板：`openai` state 填充 `#E9F5F1 → #F2FAF7`、store 填充 `#F7F7F8 → #FFFFFF`（描边对填充只有 2.86:1）；`excalidraw` muted `#868E96 → #6C757D`（3.32 → 4.69）；`acnh` muted `#8A735C → #7A6350`（4.23 → 5.32）；`--tone paper` 的 store 描边 `#5B4F7A → #7A5AA8`（蓝/紫在红绿色盲下几乎重合，ΔE 0.009 → 0.089）。

2026-10-30 第二批（连线与系列色门槛）：连线色 `zed` `#636D83 → #7A8598`（2.70 → 3.76）、`ios` `#8E8E93 → #7C7C82`（2.92 → 3.72）；8 色系列按「最小位移」重挑——修前最差 `openai` protan 0.005、`zed-light` deutan 0.009、`zed` tritan 0.013、`ios` tritan 0.017、`paper` protan 0.019，重挑后八套全部 ≥ 0.040（`tech` 0.043 与 `epaper` 0.041 未动）。重挑的做法：在 OKLab 里以「色相 ±18°、亮度 ±0.18、彩度 0.6–1.45×」为界做爬山，代价 = 色觉缺口 ×1000 + 页面底对比缺口 ×1000 + 与原色的感知距离之和——先保门槛、再最小化位移，所以多数主题只挪 0–2 个色。系列色另加「对页面底 ≥ 3:1」的软约束：Pele 的饼图数值是**页面底色**抠在切片上的，切片太浅数值就消失。

`ios` 的系统色同时换成 Apple 的深色变体（绿 `#248A3D`、橙 `#C23A17`、红 `#D70015`、紫 `#8A48AC`），描边对底从 2.9–3.4 提到 3.6–5.4。

### 5.6 随包字体

`src/fonts.ts` 是唯一注册表：家族 → 若干 `@font-face` 描述（文件、`font-weight`、可选的 `unicode-range`）。

| 家族 | 文件 | 用途 |
| --- | --- | --- |
| Noto Sans SC | `NotoSansSC-Subset.woff2`（1.9MB） | 基础黑体，每一页都注入 |
| Noto Serif SC | `NotoSerifSC-Subset.woff2`（2.6MB） | `epaper` 块页 + 手写 HTML 的 `serif` 兜底 |
| 霞鹜文楷 LXGW WenKai | `LXGWWenKai-Subset.woff2`（1.6MB） | `excalidraw` 中文标注 + 手写 HTML 的楷体栈 |
| Excalifont | `Excalifont-0.woff2` / `-1.woff2`（37KB） | `excalidraw` 拉丁手写体；上游按脚本切片，只取拉丁两片，用 `unicode-range` 限定 |
| 站酷快乐体 ZCOOL KuaiLe | `ZCOOLKuaiLe-Subset.woff2`（0.9MB） | `acnh` 圆体（图与块页都走它） |
| Baloo 2 | `Baloo2-Subset.woff2`（40KB） | `acnh` 拉丁圆体（`wght 400 800`） |
| Newsreader | `Newsreader-Subset.woff2`（154KB） | `epaper` 衬线（`wght 200 800`，保留 `opsz` 轴） |
| JetBrains Mono | `JetBrainsMono-Subset.woff2`（45KB） | 块页 `code` / kicker / footer 的等宽小字 |

- **子集口径**（`scripts/subset-font.py`）：CJK 家族取 GB2312 全量汉字 + 拉丁 + CJK 标点（与既有三套一致，7628 字形），拉丁家族取 latin-1 + latin-ext + 标点 + 箭头/符号。字体源不随仓库分发，脚本头部记下载地址；跑一次 `python scripts/subset-font.py` 即可重出（缺源的条目跳过并提示）。
- **注入策略**：`Renderer.fontFamilies()` = 基础黑体 + 主题 `fonts[]` + 等宽；`faceCss()` 只生成这些家族的 `@font-face`（base64 内联），随后 `document.fonts.load()` 逐家族等待——Pele 与 Mermaid 都先量标签再画，字体没就绪就会量出回退宽度、标签被裁。手写 HTML 文档路径额外注入衬线与楷体（`DOC_FAMILIES`）。
- **块页取主题字体栈**：`mkTheme()` 把 `:root{--font:<主题栈>}` 拼进 `blockCss` 开头，`PAGE_CSS` 的 `.wrap` 读 `var(--font, ...)`——只要调用方传了 `theme.blockCss` 就自动拿到主题字体，不需要额外选项（`cli.ts` / `make-gallery.ts` / `tests/run.ts` 都只传 `blockCss`）。
- **字体栈只列随包家族**：`ios` 从 `-apple-system, "SF Pro Text", …` 改成 `"Noto Sans SC", -apple-system, …`（同一台 Windows 上本来也落到 Noto，改后 macOS 不再走 SF Pro）；`acnh` 去掉 `YouYuan` / `幼圆` / `Segoe Print`；`excalidraw` 去掉 `Segoe Print` / `Comic Sans MS` / `KaiTi` / `STKaiti`；`epaper` 去掉 `Georgia` / `Songti SC` / `SimSun`。系统家族只允许出现在所有随包家族之后（缺字兜底），这一条由 `lint/theme-fonts` 守着。
- **构建**：`scripts/build.ts` 按注册表内联全部字体到 `FONT_FILES`，缺文件直接报错（不再是静默 `null`）。

## 6. 已放弃的移植

以下移植在实现后被移除（预设集合此后按「新机制」而非「新配色」扩张，见第 5.4 节）：

| 移植 | 内容 | 结果 |
| --- | --- | --- |
| OpenAI 编辑风 `openai-editorial` | Open Design 的 OpenAI token：纯白/墨黑/teal、发丝边框、衬线图题、16px 块版式 | 移除；保留的 `openai` 仍是近单色 + 薄荷点缀的既有预设 |
| 办公/工程批次 `vercel` / `linear` / `stripe` / `notion` / `ibm` | 各带独立 token、`shapeCoverage` 与 `blockCss` 的五套风格 | 移除；token 与版式不再维护 |
| 动森（ACNH） | 奶油底、粗棕描边、硬偏移阴影、圆体字 | 当时取消；2026-10 重新落地（`-t acnh`），色板取自 `.handoff/style-ports-prototypes/` 的原型 CSS，见 `docs/gallery/acnh.md` |
| `ios` 第一版（色块底 + 投影） | 分组浅灰底上再叠一层模糊色块，节点带 `drop-shadow`，做「立体感」 | 移除；用户判定立体感是败笔，2026-10-30 改为纯平面：不画底、不加投影，只留发丝分隔线与系统色描边 |
| 玻璃 `glass`（第一版） | 只做「彩色色块 + 高斯模糊」的玻璃底，色块半径按 `max(boxW,boxH)` 缩放 | 移除；2026-10 按 Fluent 亚克力重做（色块 + 网格 + 半透膜 + 颗粒，色差压在墨迹阈值之下） |
| 玻璃 `glass`（第二版，Fluent 亚克力） | 重做后的亚克力：24px 网格 + 白色半透膜 + 颗粒，面板 `rgba(255,255,255,.45)` 带 `blur(5px)` | 2026-10-31 整预设砍掉：Chromium 不渲染 SVG 形状上的 `backdrop-filter`，材质感只能靠半透明伪造，与 `openai` / `ios` 的浅色平面观感区分不足。`-t glass` 现在报 unknown theme，`docs/gallery/glass*.png` 与分页一并删除 |

随之移除的还有：`openai-dark`、`minimal`、`latte`、`mocha`、`sketch`。这些主题名现在会报 `unknown theme`；`docs/gallery/` 里保留的对应 PNG 只作历史对照，不再有对应页面。

保留的通用能力不随主题回退：`ThemeSpec.style` / `blockCss` / `fonts`、`shapeCoverage`、rough 后处理、`--style-fill`、`--tone`、`mmdx card`。

## 7. 风险与未决

| 风险 / 未决 | 现状 | 处理 |
| --- | --- | --- |
| 生产字体 | 已解决：8 个家族随包，`theme.fonts` 接入渲染，字体栈只列随包家族（见第 5.6 节） | 新增家族时同步 `src/fonts.ts`、`scripts/subset-font.py`、`THIRD_PARTY_NOTICES.md` 与 `assets/fonts/OFL-*.txt` |
| rough 外扩裁切 | Pele `viewBox` padding 20/12px 未改动 | 出现裁切再加到 24/16，必要时按包围盒再留 2px |
| hachure 体积 | 流程图 SVG 55,009 → 79,973 B | 默认实心；hachure 仅在明确需要时开启，文档标注体积代价 |
| 箭头仍是实心三角 | v1 接受 | v2 再换 rough 开口 V |
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
- `--tone paper|neutral|product`（`src/tone.ts`）：覆盖块页结构与信息卡；`paper` 另把图与块页都换成编辑风网格纸（`#FAFAF8` + 24px 细格 / 96px 粗格，`src/themes.ts` 的 `paperize()`）。
- `mmdx card`（`src/card.ts`）：Markdown 或 URL → 信息卡 PNG，默认 `openai`，`--tone`、480/600/900+ 宽度、按实际像素高度拆页。
- `scripts/make-style-review.ts` 生成 `review/styles/` 三套主题的 4 类图 + card/kpi/table，Excalidraw 另加 hachure 版。
- `scripts/make-gallery.ts` 与 [docs/GALLERY.md](GALLERY.md)：同一「灰度发布复盘」案例在八套主题下的五个分场景对照（流程图 / 饼图 / KPI / 卡片 / 表格），另出 `--tone paper` 的块页报告（`tone-paper-report.png`）。案例流程图用满四个形状族，饼图用满系列色。
- `tests/run.ts` 覆盖样式契约、rough 形状、`--style-fill`、八套主题的渲染筛查（流程图 / 状态图 / 类图 / ER + 块页）、双跑确定性与无障碍门槛（文本分档、形状描边、形状色觉、形态冗余、连线对比度、系列色觉、系列对底对比度、节点轮转、主题字体）；当前 **201/201 通过**。
- `scripts/lint-a11y.ts`：逐主题打印正文/次要文字/形状描边对比度、色觉模拟距离、连线对比度与系列色报告，作为色板改动的前置检查。

待做：

- 生产字体已随包（8 个家族）；`scripts/subset-font.py` 与 `assets/fonts/OFL-*.txt` 记录了子集口径与来源。
- 未做用户正式目测；`docs/gallery/*.png` 为待审图。`review/styles/` 下已放好本轮待目测的样张。
