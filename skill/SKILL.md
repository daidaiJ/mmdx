---
name: mermaid
description: Export office diagrams as PNG — 占比 pie, 趋势/对比 chart, 流程 flowchart, KPI/表格/卡片, 审批与泳道, 半环进度 gauge, 日历热力 heatmap, HTML 文件截图导出. Use when the user wants 图/图表/流程图/构成图/对比卡/周报贴图/投屏/PPT/上会/渲染/导出图片/HTML 截图/把网页导出成图片. NOT for AI image generation (文生图/照片级插画) and NOT for analysis-grade stats (grouped bar, dual axis → AntV).
---

# mmdx — 办公出图（结构图 + 轻量数据图 + 版式块 → PNG）

把围栏块渲染成可贴进 PPT / Word / 飞书的 PNG。主题、中文字体、Pele 布局、留白全部内置；Pele 是唯一引擎（输入仍是 Mermaid 语法），没有第二引擎可切。**围栏路径不要手工调样式、不要让模型手绘 SVG、不要用 VSCode 插件**；手绘 HTML 只在外来 `.html` 导出与 editorial / explain 两条低频规格里用（§1c-4）。

CLI 获取（按优先级）：

1. **Release 二进制**（推荐，免 Node）：https://github.com/daidaiJ/mmdx/releases/latest
   ```bash
   curl -L -o "$TMP/mmdx.exe" https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe
   ```
2. 本机已构建：`D:\CODE\ai\mmdx\dist\mmdx-windows-x64.exe`
3. 源码动态运行（需 bun）：仓库 `D:\CODE\ai\mmdx`，`bun run src/cli.ts`

下文统一写 `mmdx`。渲染需系统 Edge/Chrome；找不到时报 `no Chrome/Edge found`，用 `--browser <path>`。**绝不自动下载浏览器。**

**按需加载**（默认只读本文件，以下按场景再读，勿预读）：

- [`references/fences.md`](references/fences.md) — 扩展围栏语法速记 + 每围栏细则 + 能上会边界（写围栏前抄语法时）
- [`references/recipes.md`](references/recipes.md) — 16 种 mermaid 图型最小示例 + 特殊画法（LR+TB 并列双流程、嵌套包含、组织架构、分层横切、对照式 timeline）
- [`references/troubleshooting.md`](references/troubleshooting.md) — 报错速诊 / `--json.warnings` 处置 / 退出码（渲染失败时）
- [`references/themes-engines.md`](references/themes-engines.md) — 主题与 tone 选型 / Pele 图型支持面 / `--config` 配置键 / `--theme-js`·`--css`·`--brand` 换色（换主题、调布局或改配色时）
- [`explain/`](explain/README.md) — vendored visual-explainer 工程解释页规格（多图叙事页 / 评审页 / recap 动笔前；starter 装配式写作，页内图禁 JS 交互态）
- [`editorial/`](editorial/README.md) — vendored diagram-design 手绘规格（偶发封面 / 方案插图动笔前）
- [`info-card-designer/`](info-card-designer/SKILL.md) — URL / 文本 → 杂志感信息卡（`mmdx card`，见 §5b）

**适用边界**：流程/审批/排期、轻量占比/趋势/对比、KPI/表格/卡片/任务快照、**场景引导（状态图讲一次故障 / 审批的处境变化）** → 用本 skill。**多图叙事解释页 / diff·plan 评审 / recap / 幻灯片页** → [explain/](explain/README.md)。**已有 HTML 文件要导出图片**（如 diagram-design 产物）→ `mmdx page.html`（见 §1c-4）。反例：文生图；分组柱/双轴/散点 → [AntV mcp-server-chart](https://github.com/antvis/mcp-server-chart)。

## 0. 环境自检（会话内首次使用先跑，30 秒）

```bash
mmdx --version
echo "graph LR; A[自检] --> B{通过}" | mmdx - -f png -o "$TMP/mmdx-check" --json --quiet
```

冒烟 JSON 且 `rendered:1` → 就绪；`engine` 恒为 `"pele"`。`rendered:0` → §4 错误速诊。

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
| 占比 | pie 或 ` ```chart ` `type: pie` | 扇区 3–6 | `-f png --preset column` |
| 趋势 | ` ```chart ` `type: line` | 类别 ≤6、系列 ≤2 | 不要手写 `xychart-beta` |
| 数值对比 | ` ```chart ` `type: bar` | 同上 | |
| 方案对比（定性） | ` ```compare ` | 恰 2 栏 | |
| 数值前后对比 | ` ```vs ` | ≤6 行 × 2 列 | 不要用 grouped bar |
| 构成（面积） | treemap | 单元格可读 | |
| 流向 | sankey | | |
| 四象限 / 优先级 | quadrant | ≤12 项 | |
| 排期 / 工期 | gantt | | |
| 流程 / 审批 / 判定 | flowchart | ≤9 节点 / ≤12 边 | 聊天/窄栏 `flowchart TD`；投屏才 `LR` + 命名 subgraph |
| 场景引导：一次故障 / 一次审批里「处境怎么变」 | stateDiagram-v2 | 箭头 ≤20 | 见 §1a-2；`--tone paper` 出纸底 |
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

### 1a-2. 场景引导（状态图讲一个场景）

读者问「这东西什么时候会坏」「我点下去之后发生什么」时，画**处境的变化**，不画代码的走向。一次故障复盘、一次审批、一次发布都走这条。

1. **状态 = 读者能看见的处境**：「已付款」「等待审核」「连接断开」，不写变量名、不写函数名、不写 `s1`。状态标签塞不进读者的话，说明这段不该画
2. **箭头 = 读者视角的动作**：「你点了支付」「连接失败」，不写端口、协议、内部方法。只在部分情况下发生的动作，把条件写在方括号里：`你点了支付 [文件还在加载]`
3. **一条箭头一句读者的话**；箭头总数 ≤20。超了先合并处境（值不同但读者同样处理的状态合成一个），再藏掉读者不需要的箭头（每个状态都能走回去的重置、和别的箭头重复的）
4. **风险状态打标记**：`classDef risk fill:#FBE9E7,stroke:#B93A2B,stroke-width:2.5px` + `class s3 risk` 标「会坏在这」的状态，另一组标「最短路径」上的状态。Pele 把 `classDef` 烘成节点上的内联 `style`，主题盖不掉它——标记要的就是这个效果（与 §1b 第 6 条「每图 ≤2 个」同口径）
5. **故障场景给最短路径**：先一句话说哪条规则被破坏，再给到那个状态的最短一条路，不要让读者在图里自己找

```bash
mmdx scenario.mmd --preset slide --tone paper --title "支付链路：会坏在哪" --source "故障复盘" --json --quiet
```

纸底墨线适合贴复盘报告和评审页；投屏改用默认 `neutral`（纸底在会议室灯光下发灰）。完整场景（触发词、两档样张、自检项）见 §1c-5。

### 1b. 写图规则

1. **节点标签 ≤ 12 个中文字（约 30 latin）**；细节放边线标签、note、或正文
2. 方向：流水线 `LR`，决策/状态/层级 `TD`；聊天/窄栏必须 `TD`，只有投屏宽屏才用流水线 `LR`
3. `subgraph` 要命名，容器配色交给主题
4. **总览 ≤9 节点 / ≤12 边 / 强调色 ≤2**；sequence 生命线 ≤5。超过不要缩小字号硬塞
5. **降级阶梯**（按序砍，砍到预算内即停）：装饰（便签/水印）→ 副本合并（Worker ×N）→ 叶子簇折叠进容器 → 度-1 汇点（日志/监控）→ 横切基础设施 → 拆图
6. 不写 `style`/`classDef` 调全局色；仅强调个别节点（每图 ≤2）
7. emoji 每图 ≤ 3；品牌图标 `A@{icon: logos:react}` + `--icon logos`
8. 中文标签 ≥ 12px；细环/细箭头里只放数字，名称放图例
9. 标题/来源/单位用 `--title` / `--subtitle` / `--source` / `--unit`（印在 PNG 上），不手写 mermaid frontmatter；图题默认在图上方，`--title-pos bottom` 移到下方
10. 跟 VI 用 `--brand #RRGGBB`（只改强调色，不重涂 flowchart 形状分色）。投屏请用深色 hex，默认 accent 已是 `#2563EB`

### 1c. 渲染

聊天 / 窄栏文档默认 **PNG + `--preset column`**（800px@2、字号 18、标签换行 200px；2K 屏约 1/3 栏宽）。贴 PPT / 投屏必须 `--preset slide`（1600px、字号 18、描边加粗）。Word/PDF 用 `--preset a4`，飞书卡片用 `--preset square`。`both`（SVG+PNG）仅开发者把图嵌进 Markdown。

```bash
# L0 聊天/窄栏（对话页、侧栏、1/3 屏正文）
mmdx doc.md --preset column -f png
# L0b 投屏 / PPT
mmdx doc.md --preset slide --title "Q1 销售构成" --unit 万元 --source "财务月报"
# L1 批量/定向
mmdx a.md b.md -o dist/ --preset column
mmdx doc.md --index 2 -f png
mmdx doc.md --list                      # 只列出识别到的围栏块，不出图（先探再渲）
# L2 精确命名 / stdin
mmdx doc.md -o out/arch.png
echo "graph TD; A-->B" | mmdx - -f png --preset column
```

只有 Pele 一个引擎，没有 `--engine` / `--layout` 开关；Pele 解析不了的写法直接 `Parsing error`（exit 1），改成等价图型。`-f svg` 默认把颜色烘焙成 hex；要可换肤 SVG 加 `--svg-themeable`。

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

### 1c-3. 聊天 / 窄栏（对话页、侧栏、正文只有约 1/3 屏宽）

触发词：**聊天、对话、贴进对话、窄栏、侧栏、飞书文档正文、微信、钉钉**。  
这些表面把图缩到栏宽，用 `--preset column`（800px@2）让出图宽度对准栏宽。

```bash
mmdx doc.md --preset column --json --quiet
```

`--json.warnings` 出现 `column-landscape`（源是 `flowchart LR/RL`）或 `column-shrink`（图本身宽度超过 800px、会被 CSS 缩小）→ 改 `flowchart TD`、砍节点或拆图。加大 `--width` 会让缩完的字更小。

### 1c-4. HTML 文件导出（配套 editorial / explain 手绘 HTML）

触发：用户给了或生成了 HTML 文件（diagram-design / visual-explainer 产物、报告页原型），要「导出图片 / 截图 / 转 PNG」。

```bash
mmdx page.html -o out/page.png --scale 3
```

- 只认独立 `.html` / `.htm` 文件；`.md` 里写 ` ```html ` 围栏**无效**。整页原样截图为 PNG（fullPage，**只出 PNG**）：页面自带样式、脚本、背景全保留；`--width` 是布局视口（页面显式更窄的 `body` 宽优先）；`-f svg` 仍只写 PNG，并在 stderr 提示 `... renders to PNG only`
- **高保真**：`--scale 3`（印刷/大屏缩放，diagram-design 官方导出即 3x）；默认 2 够 PPT。固定画布页让 `body` 宽 = 画布宽（或 `--width` 对齐），避免响应式重排；透明底显式 `--background transparent`
- **中文字体（三家族）**：HTML 输入注入内嵌 Noto Sans SC（正文黑体）/ Noto Serif SC（serif 栈中文自动落宋体）/ 霞鹜文楷（手绘标注显式写 `'LXGW WenKai'`，仅 400 字重）；页面声明的中文字体仍优先，页面无需内嵌 CJK。围栏与 mermaid 路径只注入黑体
- **figure lint**：导出时自动体检每个 figure，结果进 `--json.warnings`（图号 + 文本 + viewBox 坐标 + 方向）：`figure-overflow`（越出画布）、`figure-text-overlap`（压形/压字）、`figure-text-adhesion`（与框间距 < max(4px, 字高×35%)）、`figure-small-text`（有效字号 <11px）、`figure-uncaptioned`（缺 `figcaption`）、`svg-aria-label`（缺 aria-label 且无 figcaption 兜底）。按坐标改源码，修到清零；处置表见 [`references/troubleshooting.md`](references/troubleshooting.md)
- **护栏**：办公出图**不要**为绕开围栏纪律去手写 HTML——预算、超限警告、像素筛查只对围栏块生效，任意 HTML 不受这套契约约束。这条路径只用于「HTML 已经存在」的导出
- 要**手绘 editorial 封面 / 方案插图**（低频、一次性、杂志感）：规格用 [`editorial/`](editorial/README.md)（diagram-design 规格层，MIT，随本 skill 分发）——读总则 + 对应 `type-*.md`，导出用上面的命令
- 要**多图叙事解释页 / 评审页 / recap / 幻灯片页**：规格用 [`explain/`](explain/README.md)（visual-explainer 规格化改造版，MIT，随本 skill 分发）——复制 `explain/kit/starter-<register>.html`（`instrument` / `blueprint` / `paper` / `editorial`）再编辑页身，导出用上面的命令

### 1c-5. 场景引导 / 故障复盘（状态图场景）

触发词：**复盘、故障、事故、为什么挂了、什么时候会坏、上线流程、审批链路、状态流转、我点下去之后发生什么**。

读者要看的是「处境怎么变」，不是代码怎么走。画法见 §1a-2，三件必做：

1. 状态名 = 读者能看见的处境（「已付款」「等待审核」），箭头 = 读者视角的动作（「你点了支付」「连接失败」）；条件写方括号
2. 风险状态打标记（`classDef risk` / `classDef path` + `class`），每图 ≤2 个标记类
3. 一句话说清哪条规则被破坏，再给到那个状态的最短一条路，不让读者在图里找

```bash
mmdx scenario.md --preset a4 --tone paper --title "支付链路：会坏在哪" --source "故障复盘" --json --quiet
mmdx scenario.md -t ios --preset column --title "支付链路：会坏在哪" --json --quiet   # 贴品牌页 / 深色底
```

同一张图两档观感的样张在仓库 `docs/gallery/scenario.md`（源码 `examples/gallery/scenario.md`）。自检：`rendered:1`、`warnings` 为空、Read 看 PNG 能分清「正常 / 会坏 / 最短路径」三种状态。

### 1d. 自检闭环（渲染后必做）

1. `--json`：`failed:0`；`warnings` 若非空，按 1a 拆图或换 AntV；`file.html` 的 `figure-*` 告警按 [`references/troubleshooting.md`](references/troubleshooting.md) 修源码到清零
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
| exit 1 + `Parsing error` / `pele: Parse error` / 超限信息 | **图或围栏写错** | 按信息修；改写为等价的可渲染图型，没有别的引擎可切 |
| `unknown option --engine` / `--layout` | 1.x 遗留参数，已随第二引擎移除 | 去掉参数；间距用 `--config` 的 `flowchart.nodeSpacing` / `rankSpacing` |
| `--theme-js v2 receives a ThemeSpec` | 1.x 换色脚本 | 改 `theme.vars` / `theme.shapes` |
| `config "…" is not supported by the pele engine` | `--config` 白名单外 | 颜色用 `--theme-js`；字号/间距用 `fontSize` / `flowchart.*` |
| HTML 输入 `-f svg` 提示 `renders to PNG only` | 正常降级 | 整页截图只有 PNG；要矢量走 mermaid 图型的 SVG |
| exit 2 | 参数用法错误 | `mmdx --help` |

总原则：**exit 2 = 参数错；exit 1 = 图写错或超限；报错先查表。**

## 5. 主题

先按场景选主题，再决定 tone。`tone` 改块页（`card` / `kpi` / `table` / `task` …）和信息卡的结构；`paper` 另把图换成纸底墨线（见 §1a-2、§5 末），不改图的形状、线条与字号。

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
| 产品界面截图 / iOS 应用说明 | `ios` | `tech` | `neutral` | 纯平面分组浅灰底；系统色区分形状 |
| 周报贴纸 / 团队看板 / 轻松汇报 | `acnh` | `excalidraw` | `neutral` | 图自带奶油纸 + 点阵；块页同样带纸纹 |
| 玻璃质感封面 / 现代产品汇报 | `glass` | `tech` | `neutral` | 亚克力底：色块 + 网格 + 半透明白膜；面板 8px 圆角带白描边 |
| 黑白打印 / 墨水屏 / 合规文档 | `epaper` | `openai` | `neutral` | 纸底 + 纸纹颗粒 + 发丝黑描边 + 直角；形状族用灰阶区分 |
| 品牌 VI | 任一 | — | 保持原 tone | `--brand #RRGGBB` 只改 accent |

`--tone paper` 是唯一会动配色的 tone：图与块页都换成编辑风网格纸（`#FAFAF8` 纸底 + 24px 细格 / 96px 粗格，墨色文字、焦橙强调色 `#BF4520`），字号/圆角/手绘抖动不变。纸底适合复盘报告、评审页、`a4` 打印；投会议室还是用默认 `neutral`。要纸底手绘就 `-t excalidraw --tone paper`。

### 5a. 七套主题：特点、适合、避免

| 主题 | 视觉特点 | 适合 | 避免 / 注意 | 推荐 tone |
| --- | --- | --- | --- | --- |
| `tech` | 白底、蓝/琥珀/绿/紫形状分色、1.5px 描边、信息密度最高 | 方案评审、架构图、周报、通用交付、投屏 | 对外品牌报告、需要编辑感的印刷品 | `neutral` |
| `openai` | 纯白/墨黑、薄荷绿点缀、发丝边框、近单色；配 `paper` 得到衬线标题与 16px 圆角 | 对外报告、白皮书、设计评审、工程师文档、HTML 报告卡、`a4` 打印 | 高密度看板、白板脑暴 | `paper` / `neutral` |
| `excalidraw` | 白底、粉彩填色、rough.js 手绘抖动、墨线、12px 圆角 | 白板、脑暴、工作坊、非正式分享 | 对外正式报告、打印稿、高密度数据图 | `neutral` |
| `ios` | 分组浅灰底 + 白卡片 + 发丝分隔线 + 系统色（蓝 `#007AFF`/绿/橙/紫）、10px 圆角；纯平面，不画底、不加投影 | 产品界面截图、iOS 应用说明、需要「系统感」的图 | 打印稿（浅灰底吃墨）、高密度数据图 | `neutral` |
| `acnh` | 奶油纸 + 粗棕描边（2.6px）+ 硬偏移贴纸阴影 + 圆体字、16px 圆角、胶囊标签 | 周报贴纸、团队看板、轻松汇报、需要「有温度」的图 | 合规/审计、打印稿（硬阴影叠印发闷）、高密度数据图 | `neutral` |
| `glass` | Fluent 亚克力：淡蓝灰画布 + 28px 网格 + 白色半透膜与细颗粒，面板 `rgba(255,255,255,.72)`、8px 圆角、白描边 | 玻璃质感封面、现代产品汇报、需要「材质感」的图 | 打印稿（浅色低对比）、高密度数据图 | `neutral` |
| `epaper` | 电子纸：`#F5F1EB` 纸底 + 纸纹颗粒 + `#1A1A1A` 发丝黑描边 + 直角、无阴影、无强调色，形状族靠灰阶区分 | 黑白打印、墨水屏阅读、合规与审计文档、需要「印刷感」的图 | 需要彩色区分度的高密度图、投屏 | `neutral` |

`acnh` / `glass` / `epaper` 都**自带底**：SVG 里插一层 `<g class="mmdx-backdrop">`（`acnh` 奶油纸 + 点阵网格 + 硬偏移贴纸阴影，`glass` 色块 + 网格 + 白色半透膜 + 噪点，`epaper` 纸底 + 纸纹颗粒），PNG 整幅截取、不按墨迹裁边——裁边会跟着底的边缘走，左右留白就不对称。`ios` 是纯平面风格，不画底也不加投影。传 `--background transparent` 时不画底。

七套主题都有对应展示图：见 `docs/GALLERY.md`（总览 + 每套主题的分风格页）。

**无障碍底线（已由测试守住）**：正文色 ≥7:1（AAA）、次要文字 ≥4.5:1、承载形状语义的描边 ≥3:1（对底与对自己的填充都算）、四个形状族在红绿色盲模拟下仍可区分，且形状族本身在**形态**上就不同（矩形 / 菱形 / 胶囊 / 圆柱），不靠颜色单独承载信息。改色板前先跑 `scripts/lint-a11y.ts`。

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

### 5c. 手绘 HTML 模板（非主题预设）

`editorial` 与 `visual-explainer` 是 vendored 的两个手绘 HTML skill：手写 HTML + SVG，再走 `mmdx page.html --scale 3` 导出（§1c-4）。它们不是 `-t` 主题预设，下面的 `-t` 组合只是近似，要用原版直接走 HTML 导出路径。

| 模板 | 视觉特点 | 适合 | 避免 | 当前近似 |
| --- | --- | --- | --- | --- |
| `editorial`（diagram-design） | `#F7F4EE` 纸底、`#1F2328` 墨线、`#2563EB` 蓝强调、4px 网格、衬线标题、mono 小标签、2px 描边、手绘层带 | 封面、架构插图、方案一页纸、设计评审 | 高频周报、密集数据表、逐像素对齐的合规材料 | `openai` + `paper`（排版） |
| `visual-explainer`（paper register） | `#F7F7F4` 暖纸底、`#17191C` 正文、`#2C4CD0` 墨蓝、Newsreader 衬线标题、Atkinson 正文、10px 圆角、叙事段落 + 手绘机制图 | 解释页、复盘页、评审页、recap、幻灯片页 | 合规/审计、严格数据表、高密度仪表盘 | `openai` + `paper`（衬线标题）；`excalidraw`（手绘感） |

原版形态直接按规格手绘 HTML 再导出（`--scale 3`，见 §1c-4）；只想在围栏管线里接近那种观感时用 `mmdx card`：

```bash
mmdx page.html -o out/editorial.png --scale 3
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

从 1.x 迁移：`--theme-js` 脚本报错并提示；`--config` 的 `themeVariables` 被忽略；`--layout elk` 已移除（按用法错误退出），布局靠 Pele 自身与 `--config` 间距键。

## 附录 — 开发文档场景（能渲染、不主推）

sequence、state、class、ER、gitgraph、C4。办公选型不要从这里起。这些图型由 Pele 直接渲染，没有备选引擎；渲染不出来就改成 flowchart 或交给 [AntV mcp-server-chart](https://github.com/antvis/mcp-server-chart)。
