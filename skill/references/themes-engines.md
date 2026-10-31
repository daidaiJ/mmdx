# 主题、Pele 图型支持面与配置键（按需读取）

> 换主题 / 调 tone / 改配色 / 确认 Pele 支持哪些图型 / 查 `--config` 认哪些键时读本文。日常出图不需要——默认 `tech` + Pele 已经覆盖办公场景。Pele 是唯一引擎，输入仍是 Mermaid 语法，没有第二个引擎可切。

## 一、八套主题

| 主题 | `-t` | 视觉特点 | 适合 | 避免 |
| --- | --- | --- | --- | --- |
| `tech`（默认） | `tech` | 白底、蓝/琥珀/绿/紫形状分色、1.5px 描边、信息密度最高 | 方案评审、架构图、周报、投屏 | 对外品牌报告、需要编辑感的印刷品 |
| `openai` | `openai` | 纯白/墨黑、薄荷绿点缀、发丝边框、近单色 | 对外报告、白皮书、工程师文档、`a4` 打印 | 高密度看板、白板脑暴 |
| `excalidraw` | `excalidraw` | 白底、粉彩填色、rough.js 手绘抖动、墨线、12px 圆角 | 白板、脑暴、工作坊、非正式分享 | 对外正式报告、打印稿、高密度数据图 |
| `ios` | `ios` | 分组浅灰底 + 白卡片 + 发丝分隔线 + 系统色、10px 圆角；**纯平面**，无底、无阴影 | 产品界面截图、iOS 应用说明、需要「系统感」的图 | 打印稿（浅灰底吃墨）、高密度数据图 |
| `acnh` | `acnh` | 奶油纸 + 点阵网格 + 粗棕描边 2.6px + 硬偏移贴纸阴影 + 圆体字、16px 圆角、胶囊标签 | 周报贴纸、团队看板、轻松汇报 | 合规/审计、打印稿、高密度数据图 |
| `epaper` | `epaper` | 电子纸：`#F5F1EB` 纸底 + 纸纹颗粒 + 发丝黑描边 + 直角无阴影，形状族用灰阶区分 | 黑白打印、墨水屏阅读、合规与审计文档 | 需要彩色区分度的高密度图、投屏 |
| `zed` | `zed` | Zed One Dark：`#282C33` 画布 + 发丝线 + 无投影无底纹，节点按读取顺序轮转 8 个 player 色（描边取色、填充为同色 15% 混页面底色） | 暗色文档站、技术分享、终端风格交付 | 打印稿、白底文档内嵌 |
| `zed-light` | `zed-light` | Zed One Light：`#FAFAFA` 画布 + `#EBEBEC` 编辑器面板，同一套轮转规则 | 白底文档里的编辑风、与 `zed` 配对 | 需要强品牌色的对外报告 |

其余主题名（`openai-dark`、`vercel`、`notion`、`mocha`、`sketch` …）已随预设收敛移除，传了按 `unknown theme` 报错。八套主题的对照样张见 `docs/GALLERY.md`。

- `acnh` / `epaper` **自带底**：SVG 里插一层 `<g class="mmdx-backdrop">`（`acnh` 奶油纸 + 点阵网格，`epaper` 纸底 + 纸纹颗粒），PNG 整幅截取、不做裁边（裁边会跟着底的边缘走，左右留白就不对称）。`ios` 是纯平面风格，不画底、不加投影。传 `--background transparent` 时不画底。`acnh` 的硬偏移阴影走 CSS `filter`，flatten 会把 `filter` 一起烘焙进 SVG。
- `excalidraw` 默认实心填色，`--style-fill hachure` 切斜线；其他主题传 `--style-fill` 会在 `--json.warnings` 里提示只对 `excalidraw` 生效。
- 深色底用 `-t zed`（整幅暗色画布 + 暗色块页）；只换底不换主题才用 `--background '#1A1A1A'`。两者都**不要**投会议室（灯光一打全糊）。

## 二、`--tone`：块页改结构，`paper` 还给图换纸底

`--tone paper|neutral|product` 作用在**块页**（`card` / `kpi` / `table` / `task` / `compare` / `vs` / `heatmap` …）和 `mmdx card` 信息卡上，改的是圆角、阴影、标题字体、表格头字重与页边距。`paper` 另把图的配色换成编辑风网格纸（`#FAFAF8` 纸底 + 24px 细格 / 96px 粗格，焦橙强调色 `#BF4520`），块页也铺同一张网格；字号、圆角、手绘抖动不变，`neutral` / `product` 不动图的配色。不传则不追加任何覆盖。

| tone | 圆角 | 阴影 | 标题字体 | 适合 |
| --- | --- | --- | --- | --- |
| `paper` | 10px / 6px | 极轻 | 衬线（Source Serif 4 + Noto Serif SC） | 对外报告、打印、`--preset a4`；图与块页都走网格纸底 |
| `neutral` | 10px / 6px | 无 | 无衬线（Inter + Noto Sans SC） | 内部说明、工程文档（默认观感） |
| `product` | 6px / 4px | 1px 2px | 无衬线、字号更小、间距更紧 | 产品界面、发布说明、投屏 |

主题决定配色、tone 决定结构，两者正交：`-t openai --tone paper` 是「薄荷绿 + 纸感排版」，`-t tech --tone product` 是「形状分色 + 紧凑面板」。`paper` 是唯一会动配色的 tone；要纸底手绘就用 `-t excalidraw --tone paper`。

## 三、Pele 支持哪些图型

Pele 直接解析 Mermaid 语法出 SVG，办公围栏之外的原生图型都能渲染：

| 类别 | 图型 |
| --- | --- |
| 办公主力 | flowchart、sequence、state、class、ER、pie、gantt、timeline、journey、quadrantChart、kanban、mindmap |
| 数据类 | sankey、treemap、xychart、radar |
| 开发文档 | C4（Context / Container / Component / Dynamic / Deployment）、gitgraph、requirementDiagram、block-beta、packet-beta、architecture-beta、cynefin |

Pele 下的观感（`tests/diagrams/` 有对应 fixture）：

- **flowchart**：宽 S 弯连线；`subgraph` 内的 `direction` 各自生效（横向组 + 纵向组可以并排）；cluster 用主题 `cluster` 填色。
- **sequence**：带消息序号，中文标签可换行。
- **C4**：person 是圆角卡 + 头顶圆点、system/container 用 `process` 填色、`_Ext` 外部元素白底虚线框；没有 mermaid 那套深色块。单个元素要换色用源码里的 `UpdateElementStyle(id, $bgColor="#…", $borderColor="#…")`，Pele 认这两个属性。
- **mindmap**：分支按主题 `--pele-series-N` 上色，叶子是纯文字（无盒子）。
- **图标**：`A@{icon: logos:react}` + `--icon logos` 可用，图标按 24×24 视图缩放后嵌进节点。

Pele 解析不了的写法直接 `Parsing error`（exit 1），没有回退引擎可切——按报错改成等价图型（多数情况是改成 flowchart 或交给 [AntV mcp-server-chart](https://github.com/antvis/mcp-server-chart)）。`xychart` 不要手写，趋势/柱状走 ` ```chart ` 围栏。

## 四、布局与字号：`--config`

`--config` 是 JSON 文件（Windows 上要落成真实文件，没有进程替换）。Pele 只认这几个键：顶层出现别的 key 会在 `--json.warnings` 里报 `config "xxx" is not supported by the pele engine`，`flowchart` 里出现别的子键则被静默忽略（不报错也不生效）。

```json
{ "fontSize": 16, "padding": 24, "flowchart": { "nodeSpacing": 72, "rankSpacing": 96, "padding": 18 } }
```

| 键 | 作用 | 取值参考 |
| --- | --- | --- |
| `fontSize` | 图内文字字号（节点与画布随字重算） | 默认 15；`slide` / `column` preset 为 18 |
| `flowchart.nodeSpacing` | 同层节点间距（横向排布的松紧） | 空配置实测约 40；`slide` 88、`column` 56 |
| `flowchart.rankSpacing` | 层间距（流程纵向长度） | 空配置实测约 48；`slide` 88、`column` 64 |
| `flowchart.padding` | 单节点内边距 | preset 给 14–22，实测对画布影响很小 |
| `padding` | 画布内边距 | 默认 0，实测对画布影响很小 |

实测（`tests/diagrams` 各图型 + 合成 fixture）：`fontSize`、`nodeSpacing`、`rankSpacing` 会直接改变画布尺寸；两个 `padding` 键在 flowchart / sequence / state / class / ER 上都没有可观察的变化，调布局先动前三个。`flowchart` 下的 `wrappingWidth` / `curve` 会被静默丢弃（不报错也不生效）。`--preset` 已经设过 `fontSize` 与三个 `flowchart.*`，`--config` 在 preset 之后叠加。

`themeVariables`、`themeCSS`、`look`、`layoutAlgorithm`、`sequence.*` 这些 Mermaid 专属键都不认，顶层出现时会给 `config-ignored` 警告（`config "sequence" is not supported by the pele engine`）；颜色请走 `--theme-js` 或 `--css`。

## 五、换色：`--theme-js` / `--css` / `--brand`

叠加顺序：**主题 → `--brand` → `--theme-js` → `--config` → `--css`**。

- `--brand #RRGGBB` 只改 `theme.vars.accent`（卡片左边条、kpi 数字、swimlane 首条跨带箭头），**不**重涂 flowchart 形状分色；低对比度会警告但不改色。
- `--theme-js` 是 v2 契约 `(theme, ctx) => theme`，拿到的是 `ThemeSpec`：

```js
// brand.js — mmdx doc.md --theme-js brand.js
export default (theme) => {
  const brand = '#E4572E';
  theme.vars.accent = brand;
  theme.vars.line = '#0D1B2A';
  theme.shapes.process = { fill: '#FDF0E5', stroke: brand };
  theme.shapes.decision = { fill: '#FFF4D6', stroke: '#A87428' };
  theme.css += '.pele-label { font-weight: 600; }';
  return theme;
};
```

`theme.vars`：`bg` / `fg` / `muted` / `line` / `surface` / `surfaceAlt` / `border` / `accent` / `critical` / `radius` / `font` / `series`。`theme.shapes`：`process` / `decision` / `state` / `store` / `cluster`（`{fill, stroke}`）。1.x 那套改 `config.themeVariables` 的脚本会报迁移错误。

- `--css` 追加在主题 CSS 之后，用 Pele 的类名：

```css
.pele-flowchart .pele-shape-rect rect { rx: 14px; ry: 14px; }
.pele-flowchart .pele-shape-diam polygon { stroke-width: 2px; }
.pele-edge path { stroke-width: 2px; }
.pele-cluster rect { stroke-dasharray: 6 4; }
.pele-label { font-weight: 600; }
```

常用钩子：`.pele`（根，`--pele-*` 变量挂在这里）、`.pele-flowchart .pele-shape-{rect|diam|circle|cyl|fr-rect|stadium|hex}`、`.pele-state`、`.pele-class`、`.pele-er`、`.pele-cluster`、`.pele-edge path`、`.pele-label`、`.pele-title`、`.pele-c4-{person|system|external}`、`.pele-shape-branch` / `.pele-branch`（思维导图分支）、`.pele-icon`。

## 附录 — 开发文档场景（能渲染、不主推）

sequence、state、class、ER、gitgraph、C4。办公选型不要从这里起；确属开发文档场景直接用，语法与 mermaid 相同，由 Pele 直接排版。
