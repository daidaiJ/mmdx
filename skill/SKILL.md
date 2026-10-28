---
name: mermaid
description: Export office diagrams as PNG — 占比 pie, 趋势/对比 chart, 流程 flowchart, KPI/表格/卡片, 审批与泳道, 半环进度 gauge, 日历热力 heatmap. Use when the user wants 图/图表/流程图/构成图/对比卡/周报贴图/投屏/PPT/上会/渲染/导出图片. NOT for AI image generation (文生图/照片级插画) and NOT for analysis-grade stats (grouped bar, dual axis → AntV).
---

# mmdx — 办公出图（结构图 + 轻量数据图 + 版式块 → PNG）

把围栏块渲染成可贴进 PPT / Word / 飞书的 PNG。主题、中文字体、Pele 布局、留白全部内置；默认 Pele 引擎，Mermaid + ELK 作为回退。**不要在图代码里手工调样式，不要用 VSCode 插件，不要让模型手绘 SVG。**

CLI 获取（按优先级）：

1. **Release 二进制**（推荐，免 Node）：https://github.com/daidaiJ/mmdx/releases/latest
   ```bash
   curl -L -o "$TMP/mmdx.exe" https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe
   ```
2. 本机已构建：`D:\CODE\ai\mmdx\dist\mmdx-windows-x64.exe`
3. 源码动态运行（需 bun）：仓库 `D:\CODE\ai\mmdx`，`bun run src/cli.ts`

下文统一写 `mmdx`。渲染需系统 Edge/Chrome；找不到时报 `no Chrome/Edge found`，用 `--browser <path>`。**绝不自动下载浏览器。**

**适用边界**：流程/审批/排期、轻量占比/趋势/对比、KPI/表格/卡片/任务快照 → 用本 skill。反例：文生图；分组柱/双轴/散点 → [AntV mcp-server-chart](https://github.com/antvis/mcp-server-chart)。

## 0. 环境自检（会话内首次使用先跑，30 秒）

```bash
mmdx --version
echo "graph LR; A[自检] --> B{通过}" | mmdx - -f png -o "$TMP/mmdx-check" --json --quiet
# 需要 ELK / Mermaid 专属语法时再验回退：
echo "graph LR; A-->B" | mmdx - -f png --engine mermaid -o "$TMP/mmdx-check-legacy" --json --quiet
```

冒烟 JSON 且 `rendered:1` → 就绪；默认 `engine: "pele"`。`rendered:0` → §4 错误速诊。

## 1. Agent Loop（选型 → 先砍再画 → 渲染 → 自检）

画之前用一两句话说：图型、`--preset`（有则）、预算会砍掉什么。办公读者默认 `mixed`：节点用组件名，边用白话动词，不写端口/协议。给老板改 `executive`（能力/结果，去厂商名）——只改用词，不改节点数。

### 何时不要画

问：读者从这张图比从一段话多学到什么？学不到就不要画。

- 纯列表 → ` ```list ` 或正文
- 两句前后对比 → ` ```compare `（不要做成 Venn）
- 同一指标两列数字（优化前/后） → ` ```vs `
- 单盒子带标签 → 写句子
- 为了「有图」硬画 flowchart 的周报条目 → 用 table / task / list

### 1a. 需求 → 图型（按意图，不按 mermaid 关键字）

| 用户要表达的 | 用什么 | 上限 | 典型命令 |
| --- | --- | --- | --- |
| 占比 | pie 或 ` ```chart ` `type: pie` | 扇区 3–6 | `-f png --preset slide` |
| 趋势 | ` ```chart ` `type: line` | 类别 ≤6、系列 ≤2 | 不要手写 `xychart-beta` |
| 数值对比 | ` ```chart ` `type: bar` | 同上 | |
| 方案对比（定性） | ` ```compare ` | 恰 2 栏 | |
| 数值前后对比 | ` ```vs ` | ≤6 行 × 2 列 | 不要用 grouped bar |
| 构成（面积） | treemap | 单元格可读 | |
| 流向 | sankey | | |
| 四象限 / 优先级 | quadrant | ≤12 项 | |
| 排期 / 工期 | gantt | | |
| 流程 / 审批 / 判定 | flowchart | ≤9 节点 / ≤12 边 | `flowchart LR` + 命名 subgraph |
| 跨部门交接 | ` ```swimlane ` | 泳道 ≤5、步骤 ≤8 | handoff 才是重点；有环/并行用 flowchart |
| 需求池 / 多列看板 | kanban | | 当前状态快照改用 ` ```task ` |
| 任务状态快照 | ` ```task ` | ≤10 行 | 6 态：未开始/设计/开发/测试/已上线/已取消 |
| 多指标达成率（同心） | ` ```progress ` | ≤4 环 | 绝对值用 kpi |
| 并排半环进度 | ` ```gauge ` | ≤4 个 | 覆盖率 / SLO / 冲刺完成；中文在环下 |
| KPI 大数字 | ` ```kpi ` | ≤4 行 | |
| 提交/发布日历 | ` ```heatmap ` | ≤12 周 | `YYYY-MM-DD, n`；格子写次数；全年交给 AntV |
| 表格截图 | ` ```table ` | | GFM 表原文 |
| 要点列表 | ` ```list ` | | |
| 要点卡 | ` ```card ` | | `emoji \| 标题 \| 描述` |
| 转化漏斗 | ` ```funnel ` | ≤6 层 | 不要用 flowchart 硬画 |
| 用户旅程 | journey | | |
| 阶段演进 | timeline | | |
| 概念结构 | mindmap | | |
| 多维打分 | radar | 维 ≤8、系列 ≤3 | |

超限：拆「总览 + 局部」，或数据图交给 AntV mcp-server-chart。`--json` 的 `warnings` 与上表同一口径；`--strict-chart` 把 mermaid 超限升为错误。` ```chart ` 与版式块超限直接失败（exit 1），同文件其他块照常产出。

### 1b. 写图规则

1. **节点标签 ≤ 12 个中文字（约 30 latin）**；细节放边线标签、note、或正文
2. 方向：流水线 `LR`，决策/状态/层级 `TD`
3. `subgraph` 要命名，容器配色交给主题
4. **总览 ≤9 节点 / ≤12 边 / 强调色 ≤2**；sequence 生命线 ≤5。超过不要缩小字号硬塞
5. **降级阶梯**（按序砍，砍到预算内即停）：装饰（便签/水印）→ 副本合并（Worker ×N）→ 叶子簇折叠进容器 → 度-1 汇点（日志/监控）→ 横切基础设施 → 拆图
6. 不写 `style`/`classDef` 调全局色；仅强调个别节点（每图 ≤2）
7. emoji 每图 ≤ 3；品牌图标 `A@{icon: logos:react}` + `--icon logos`
8. 中文标签 ≥ 12px；细环/细箭头里只放数字，名称放图例
9. 标题/来源/单位用 `--title` / `--subtitle` / `--source` / `--unit`（印在 PNG 上），不手写 mermaid frontmatter
10. 跟 VI 用 `--brand #RRGGBB`（只改强调色，不重涂 flowchart 形状分色）。投屏请用深色 hex，默认 accent 已是 `#2563EB`

### 1c. 渲染

聊天 / 幻灯片默认 **PNG**。贴 PPT / 投屏必须 `--preset slide`（1600px、字号 18、描边加粗）。Word/PDF 用 `--preset a4`，飞书卡片用 `--preset square`。`both`（SVG+PNG）仅开发者把图嵌进 Markdown。

```bash
# L0 办公默认（Pele 引擎）
mmdx doc.md --preset slide --title "Q1 销售构成" --unit 万元 --source "财务月报"
# L1 批量/定向
mmdx a.md b.md -o dist/ --preset slide
mmdx doc.md --index 2 -f png
# L2 精确命名 / stdin
mmdx doc.md -o out/arch.png
echo "graph LR; A-->B" | mmdx - -f png
# 需要 ELK 或 Mermaid 专属语法
mmdx doc.md --engine mermaid           # 或 --layout elk（自动选中 mermaid）
mmdx doc.md --engine auto              # 先 Pele，失败回退
```

默认 `--engine pele`；`--layout` 只属于 Mermaid，传它会自动切 `--engine mermaid`，与显式 `--engine pele` 同时出现是参数冲突。`-f svg` 默认把颜色烘焙成 hex；要可换肤 SVG 加 `--svg-themeable`。

覆盖关系：显式 `--width` / `--scale` / `-f` 覆盖 preset 默认值。叠加顺序：主题 → `--brand` → `--theme-js` → `--config` → `--css`。

### 1c-2. 投屏 / PPT（看到这些词必须走这条，不要用默认画幅）

触发词：**投屏、投影、PPT、幻灯片、上会、周会、分享会、大屏、会议室、贴进 PPT**。  
飞书卡片 → `--preset square`；Word/PDF → `--preset a4`。不要用 `--css` 手调投影对比度——preset 已经加粗描边和字号。

**导出命令（复制改标题即可）：**

```bash
mmdx doc.md --preset slide --title "一句话结论" --source "出处" --unit "单位" --json --quiet
```

有品牌色再加 `--brand #RRGGBB`（要够深，白字能看清；不要用浅蓝 `#4098FC` 这类投影会漂的色）。没有 VI 就用默认 `tech`（`#2563EB`）。

**写图时额外收一档（投影比文档更苛刻）：**

1. 总览 ≤7 节点 / pie 3–5 扇区；宁拆两张，不要缩字硬塞
2. 标签短、对比强：判定用菱形、状态用圆，靠形状+填色分，不靠 1px 细线
3. 必带 `--title`；来源/单位有就写，方便会后截图还能读
4. 不要把深色页面投会议室（灯光一打全糊）；投屏默认 `-t tech`
5. 贴 PPT：图拉满内容区，不要缩成角落缩略图；底栏安全区已预留，不要再往 PNG 里垫大空白

**渲染后自检（Read PNG，5 米测试）：** 眯眼仍能分清蓝流程 / 琥珀判定 / 绿状态；图题在；字不截断。通不过 → 砍节点或拆图，不要加 `--css`。

### 1d. 自检闭环（渲染后必做）

1. `--json`：`failed:0`；`warnings` 若非空，按 1a 拆图或换 AntV
2. **Read 看 PNG**：图题/来源/单位在图上（若传了）、文字不截断、类别不过多、连线不穿字、四边留白
3. 若砍过密度，补一句保真台账：「18 源节点 → 9 张图」
4. 问题 → 改图或调 caption → `--index N` 重渲染；最多 2 轮，仍不满意问用户

## 2. 围栏速记

````markdown
```chart
type: bar          # bar | line | pie
title: 各区销量
unit: 万元
source: 销量表
华东, 120
华南, 86
```

```kpi
GMV | 1.28 亿 | +12%
订单 | 8.6 万 | -3%
```

```compare
方案 A | 自建渲染 | 可控、无外网
方案 B | 远程图表 MCP | 图型全、有网络依赖
```

```funnel
访问, 10000
下单, 1200
支付, 860
```

```task
用户中心改版 | 开发 | 09-08 | 5人天 | 卡点
支付对账 | 未开始 | 09-15 | 3人天
```

```progress
Q1 收入, 87
交付里程碑, 4300, 5000
```

```gauge
覆盖率, 87
SLO, 99
采纳率, 62
```

```vs
, 优化前, 优化后
构建耗时, 42, 11
镜像体积, 1.8, 0.6
```

```heatmap
2026-09-01, 2
2026-09-08, 12
```

```swimlane
提需求 | 产品 | 评审
评审 | 产品 | 开发
开发 | 研发
```
````

kpi 变化列默认**红涨绿跌**（可用 `--css` 覆盖）。progress 第一行 = 最外环。gauge 是并排半环，第一项用强调色。vs 只接受两列非负数字。heatmap 只接受 `YYYY-MM-DD`，缺天当 0，格内写次数，跨度 >12 周直接失败。task 不接受「进行中」，必须写具体相位。swimlane 不做并行/判定（有判定用 flowchart）。

## 3. 能上会 / 不能上会

| 能上会 | 不能上会（交给 AntV 或拆图） |
| --- | --- |
| pie 3–6 扇区 | 7+ 扇区、玫瑰图 |
| bar/line ≤6 类 × ≤2 系列 | 分组柱、双轴、散点、箱线 |
| radar ≤8 维 × ≤3 系列 | 更多维/系列 |
| flowchart 总览 ≤9 节点 | 把日志/监控/副本塞进同一张 |
| 跨部门交接用 swimlane | 用 subgraph 硬凑泳道还要画菱形 |

## 4. 错误速诊

| 报错 | 性质 | 处置 |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | 环境缺浏览器 | 装 Edge/Chrome 或 `--browser`；不自动下载 |
| `svgo unavailable` | 极罕见 | 无害降级 |
| `render timed out after 60s` | 资源紧张 | CLI 已重试；持续则 `--jobs 1` |
| `icon pack "xxx" not found` | 网络不通 | 去掉 `--icon` |
| 中文变方块 | 不应发生 | 检查 `--theme-js` 是否覆盖 fontFamily |
| exit 1 + `Parsing error` / `pele: Parse error` / 超限信息 | **图或围栏写错** | 按信息修；Pele 不支持的写法加 `--engine mermaid` 或 `--engine auto` |
| `--layout belongs to the mermaid engine` | 参数冲突 | 去掉 `--layout`，或改 `--engine mermaid` |
| `--theme-js v2 receives a ThemeSpec` | 1.x 换色脚本 | 改 `theme.vars` / `theme.shapes` |
| `config "…" is not supported by the pele engine` | `--config` 白名单外 | 颜色用 `--theme-js`；字号/间距用 `fontSize` / `flowchart.*` |
| exit 2 | 参数用法错误 | `mmdx --help` |

总原则：**exit 2 = 参数错；exit 1 = 图写错或超限；报错先查表。**

## 5. 主题

先按场景选主题，再决定 tone。`tone` 只影响块页（`card` / `kpi` / `table` / `task` …）和信息卡，不改图的形状与线条。

| 场景 | 首选 | 备选 | tone | preset / 备注 |
| --- | --- | --- | --- | --- |
| 技术方案 / 周报 / 通用交付（默认） | `tech` | `openai` | `neutral` | `slide` 投屏；形状分色最稳 |
| 工程师文档 / README / 架构图 | `openai` | `tech` | `neutral` | 纯白、墨黑、薄荷绿点缀、发丝边框 |
| 发布说明 / 工程博客 | `openai` | `tech` | `product` | 发丝边框、无衬线标题、紧凑 |
| 对外报告 / 设计评审 / 打印 | `openai` | `tech` | `paper` | `a4`；衬线标题、16px 圆角 |
| 金融 / 商业报告 / 对外材料 | `openai` | `tech` | `paper` | 克制的编辑风，留白充足 |
| 知识库 / 内部说明 / 长文 | `tech` | `openai` | `neutral` | 信息密度最高 |
| 企业架构 / 合规 / 正式交付 | `tech` | `openai` | `product` | `slide`；形状分色便于逐层讲解 |
| 白板 / 头脑风暴 / 轻松分享 | `excalidraw` | `openai` | `neutral` | 手绘线条 + 粉彩填色；`--style-fill hachure` 切斜线 |
| 投影 / PPT / 上会 / 大屏 | `tech` | `openai` | `neutral` | 必须 `--preset slide`；深色页面不要上投影 |
| 品牌 VI | 任一 | — | 保持原 tone | `--brand #RRGGBB` 只改 accent |

### 5a. 三套主题：特点、适合、避免

| 主题 | 视觉特点 | 适合 | 避免 / 注意 | 推荐 tone |
| --- | --- | --- | --- | --- |
| `tech` | 白底、蓝/琥珀/绿/紫形状分色、1.5px 描边、信息密度最高 | 方案评审、架构图、周报、通用交付、投屏 | 对外品牌报告、需要编辑感的印刷品 | `neutral` |
| `openai` | 纯白/墨黑、薄荷绿点缀、发丝边框、近单色；配 `paper` 得到衬线标题与 16px 圆角 | 对外报告、白皮书、设计评审、工程师文档、HTML 报告卡、`a4` 打印 | 高密度看板、白板脑暴 | `paper` / `neutral` |
| `excalidraw` | 白底、粉彩填色、rough.js 手绘抖动、墨线、12px 圆角 | 白板、脑暴、工作坊、非正式分享 | 对外正式报告、打印稿、高密度数据图 | `neutral` |

三套主题都有对应展示图：见 `docs/GALLERY.md`（总览 + `tech` / `openai` / `excalidraw` 分风格页）。

### 5b. 两个 HTML 场景的推荐组合

| 场景 | 主题 | tone | 说明 |
| --- | --- | --- | --- |
| HTML 报告卡（默认编辑风/原始观感） | `openai` | `paper` | 纯白、墨黑、薄荷绿点缀、衬线标题、16px 圆角 |
| HTML 报告卡（工程/内部） | `openai` | `neutral` | 一页 card + kpi + table，克制、可打印 |
| HTML 报告卡（对外/打印） | `openai` | `paper` | 大留白、衬线标题；`--preset a4` |
| HTML 报告卡（产品/发布） | `openai` / `tech` | `product` | 紧凑、可上投屏 |
| HTML 报告卡（企业/合规） | `tech` | `product` | 形状分色、信息密度高 |
| 信息卡（对外/打印） | `openai` | `paper` | 长文摘要、报告封面 |
| 信息卡（工程文档） | `tech` / `openai` | `neutral` | 无阴影、10px 圆角，默认档 |
| 信息卡（产品/发布） | `openai` / `tech` | `product` | 6px 圆角、细阴影、紧凑 |

信息卡是独立 skill：[`info-card-designer/SKILL.md`](info-card-designer/SKILL.md)。本 skill 只负责图表与块；需要 URL/文本 → 杂志感卡片时切到该 skill，命令仍是 `mmdx card`。

### 5c. 手绘 HTML 模板（v1.4.2，非主题预设）

上一个 tag 的展示页用的是两个 vendored 手绘 HTML skill。它们是手写 HTML + SVG，再走 `mmdx file.html --scale 3` 导出；当前 v2 的 `-t` 主题只做近似。

| 模板 | 视觉特点 | 适合 | 避免 | 当前近似 |
| --- | --- | --- | --- | --- |
| `editorial`（diagram-design） | `#F7F4EE` 纸底、`#1F2328` 墨线、`#2563EB` 蓝强调、4px 网格、衬线标题、mono 小标签、2px 描边、手绘层带 | 封面、架构插图、方案一页纸、设计评审 | 高频周报、密集数据表、逐像素对齐的合规材料 | `openai` + `paper`（排版） |
| `visual-explainer`（paper register） | `#F7F7F4` 暖纸底、`#17191C` 正文、`#2C4CD0` 墨蓝、Newsreader 衬线标题、Atkinson 正文、10px 圆角、叙事段落 + 手绘机制图 | 解释页、复盘页、评审页、recap、幻灯片页 | 合规/审计、严格数据表、高密度仪表盘 | `openai` + `paper`（衬线标题）；`excalidraw`（手绘感） |

精确复现需要 v1.4.2 的 HTML 导出链路；当前 v2 可用 `mmdx card` 近似：

```bash
mmdx card --in note.md -t openai --tone paper -o editorial-like.png
mmdx card --in note.md -t excalidraw --tone paper -o explainer-like.png
```

原始样张与映射见仓库 `docs/gallery/vendored-html.md`。

`--brand` 只改 `theme.vars.accent`（卡片左边条、kpi 数字、swimlane 第一条跨带箭头），**不**把判定菱形改成品牌色。

主题是 CSS 变量契约，`--css` 用 Pele 类名：

```css
.pele-flowchart .pele-shape-rect rect { rx: 14px; ry: 14px; }
.pele-edge path { stroke-width: 2px; }
.pele-label { font-weight: 600; }
```

`--theme-js` 是 v2 契约 `(theme) => theme`，改 `theme.vars` / `theme.shapes` / `theme.css`；不要再写 `config.themeVariables`。`--config` 只接受 `fontSize` / `padding` / `flowchart.nodeSpacing|rankSpacing|padding`。

从 1.x 迁移：`--theme-js` 脚本报错并提示；`--config` 的 `themeVariables` 被忽略；`--layout elk` 自动切 Mermaid。

## 附录 — 开发文档场景（能渲染、不主推）

sequence、state、class、ER、gitgraph、C4。办公选型不要从这里起。需要 ELK 或 Mermaid 专属语法时加 `--engine mermaid`；其余场景 Pele 已覆盖。
