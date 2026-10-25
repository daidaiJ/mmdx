---
name: mermaid
description: Export office diagrams as PNG — 占比 pie, 趋势/对比 chart, 流程 flowchart, KPI/表格/卡片, 审批与泳道, 半环进度 gauge, 日历热力 heatmap, HTML 文件截图导出. Use when the user wants 图/图表/流程图/构成图/对比卡/周报贴图/投屏/PPT/上会/渲染/导出图片/HTML 截图/把网页导出成图片. NOT for AI image generation (文生图/照片级插画) and NOT for analysis-grade stats (grouped bar, dual axis → AntV).
---

# mmdx — 办公出图（结构图 + 轻量数据图 + 版式块 → PNG）

把围栏块渲染成可贴进 PPT / Word / 飞书的 PNG。主题、中文字体、渲染引擎（默认 Pele，流程图曲线连线）、留白全部内置。**不要在图代码里手工调样式，不要用 VSCode 插件。**

**场景分级（先选档，再动笔）**：

| 档位 | 场景 | 路径 | 产物 |
| --- | --- | --- | --- |
| **高速**（默认） | 流程/审批/轻量数据图/版式块——周报贴片、投屏、高频可验收 | 围栏（mermaid 图型 + 扩展块），按 §1a 选型 | PNG @2x；mermaid 图型另有矢量 SVG |
| **精美**（低频） | 封面/方案插图——editorial 质感、一次性 | 手绘 HTML（vendored [diagram-design 规格](editorial/README.md)）→ §1c-4 | PNG @3x |
| **叙事**（低频） | 多图解释页 / diff·plan 评审页 / recap / 幻灯片页——「十分钟看懂」 | explain 规格（vendored [visual-explainer 改造版](explain/README.md)）→ §1c-4 | PNG @3x |

两档统一经 mmdx 导出。**清晰度是构造保证**：PNG 走 deviceScaleFactor 超采样、一次栅格化，无事后缩放、无 JPEG 压缩，中文内嵌字体——不存在"糊"的来源；要更高保真加 `--scale 3`，不要放大已出的 PNG。办公出图默认高速档，不要为绕开围栏纪律降档手绘。

**按需加载**（默认只读本文件，以下按场景再读，勿预读）：

- [references/fences.md](references/fences.md) — 扩展围栏语法速记 + 每围栏细则 + 能上会边界（写围栏前抄语法时）
- [references/recipes.md](references/recipes.md) — 16 种 mermaid 图型最小示例 + 特殊画法：**一图并列双流程（LR+TB 混排）**、嵌套包含、组织架构、分层横切、**对照式 timeline（事件 vs 对策）**（写 mermaid 或要组合版式时；§1e 回哺的落点）
- [references/troubleshooting.md](references/troubleshooting.md) — 报错速诊 / `--json.warnings` 处置 / 退出码（渲染失败时）
- [references/themes-engines.md](references/themes-engines.md) — 主题选型 / 双引擎差别 / Pele 配置键（换主题或引擎时）
- [editorial/](editorial/README.md) — vendored diagram-design 手绘规格（精美档动笔前）
- [explain/](explain/README.md) — vendored visual-explainer 工程解释页规格（叙事档动笔前；starter 装配式写作，页内图禁 JS 交互态）

**适用边界**：流程/审批/排期、轻量占比/趋势/对比、KPI/表格/卡片/任务快照 → 用本 skill。**多图叙事解释页 / diff·plan 评审 / recap / 幻灯片页** → [explain/](explain/README.md)（叙事档）。**已有 HTML 文件要导出图片**（如 diagram-design 产物）→ `mmdx file.html`（见 §1c-4）。反例：文生图；分组柱/双轴/散点 → [AntV mcp-server-chart](https://github.com/antvis/mcp-server-chart)。

## 0. 环境自检（会话内首次使用先跑，30 秒）

```bash
mmdx --version
echo "graph LR; A[自检] --> B{通过}" | mmdx - -f png -o "$TMP/mmdx-check" --json --quiet
```

冒烟 JSON 且 `rendered:1` → 就绪。`rendered:0` → [troubleshooting.md](references/troubleshooting.md)。

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
| 流程 / 审批 / 判定 | flowchart | ≤9 节点 / ≤12 边 | 聊天 `flowchart TD`；投屏才 `LR` + 命名 subgraph |
| 跨部门交接 | ` ```swimlane ` | 泳道 ≤5、步骤 ≤8 | handoff 才是重点；有环/并行用 flowchart |
| 需求池 / 多列看板 | kanban | | 当前状态快照改用 ` ```task ` |
| 任务状态快照 | ` ```task ` | ≤10 行 | 6 态：未开始/设计/开发/测试/已上线/已取消 |
| 多指标达成率（同心） | ` ```progress ` | ≤4 环 | 绝对值用 kpi |
| 并排半环进度 | ` ```gauge ` | ≤4 个 | 覆盖率 / SLO / 冲刺完成；中文在环下 |
| KPI 大数字 | ` ```kpi ` | ≤4 行 | |
| 提交/发布日历 | ` ```heatmap ` | ≤12 周 | `YYYY-MM-DD, n`；全年交给 AntV |
| 表格截图 | ` ```table ` | | GFM 表原文 |
| 要点列表 | ` ```list ` | | |
| 要点卡 | ` ```card ` | | `emoji \| 标题 \| 描述` |
| 转化漏斗 | ` ```funnel ` | ≤6 层 | 不要用 flowchart 硬画 |
| 用户旅程 | journey | | |
| 阶段演进 | timeline | | |
| 概念结构 | mindmap | | |
| 多维打分 | radar | 维 ≤8、系列 ≤3 | |

围栏语法抄 [references/fences.md](references/fences.md)，mermaid 图型示例与特殊画法（并列双流程 LR+TB 混排、嵌套包含、组织架构、分层横切）抄 [references/recipes.md](references/recipes.md)。超限：拆「总览 + 局部」，或数据图交给 AntV mcp-server-chart。`--json` 的 `warnings` 与上表同一口径；`--strict-chart` 把 mermaid 超限升为错误。` ```chart ` 与版式块超限直接失败（exit 1），同文件其他块照常产出。

### 1b. 写图规则

1. **节点标签 ≤ 12 个中文字（约 30 latin）**；细节放边线标签、note、或正文
2. 方向：决策/状态/层级 `TD`；聊天/窄栏必须 `TD`。只有投屏宽屏才用流水线 `LR`
3. `subgraph` 要命名，容器配色交给主题
4. **总览 ≤9 节点 / ≤12 边 / 强调色 ≤2**；sequence 生命线 ≤5。超过不要缩小字号硬塞
5. **降级阶梯**（按序砍，砍到预算内即停）：装饰（便签/水印）→ 副本合并（Worker ×N）→ 叶子簇折叠进容器 → 度-1 汇点（日志/监控）→ 横切基础设施 → 拆图
6. 不写 `style`/`classDef` 调全局色；仅强调个别节点（每图 ≤2）
7. emoji 每图 ≤ 3；品牌图标 `A@{icon: logos:react}` + `--icon logos`（仅 `--engine mermaid`）
8. 中文标签 ≥ 12px；细环/细箭头里只放数字，名称放图例
9. 标题/来源/单位用 `--title` / `--subtitle` / `--source` / `--unit`（印在 PNG 上），不手写 mermaid frontmatter
10. 跟 VI 用 `--brand #RRGGBB`（只改强调色，不重涂 flowchart 形状分色）。投屏请用深色 hex，默认 accent 已是 `#2563EB`

### 1c. 渲染

聊天 / 窄栏文档默认 **PNG + `--preset column`**（800px、字号 18、标签换行 200px；对准 2K 屏约 1/3 栏宽）。贴 PPT / 投屏必须 `--preset slide`（1600px、字号 18、描边加粗）。Word/PDF 用 `--preset a4`，飞书卡片用 `--preset square`。`both`（SVG+PNG）仅开发者把图嵌进 Markdown。

```bash
# L0 聊天/窄栏（对话页、侧栏、1/3 屏正文）
mmdx doc.md --preset column -f png
# L0b 投屏/PPT
mmdx doc.md --preset slide --title "Q1 销售构成" --unit 万元 --source "财务月报"
# L1 批量/定向
mmdx a.md b.md -o dist/ --preset column
mmdx doc.md --index 2 -f png
# L2 精确命名 / stdin
mmdx doc.md -o out/arch.png
echo "graph TD; A-->B" | mmdx - -f png --preset column
```

覆盖关系：显式 `--width` / `--scale` / `-f` 覆盖 preset 默认值。叠加顺序：主题 → `--brand` → `--theme-js` → `--config` → `--css`。

**渲染引擎**：默认 `--engine pele`（流程/时序/状态的办公默认）；C4 深色块、思维导图盒子、`@{icon}`、手绘 `sketch` 才 `--engine mermaid`。差别是**布局和画法**，不是配色；细节与 Pele 配置键见 [references/themes-engines.md](references/themes-engines.md)。

### 1c-2. 投屏 / PPT（看到这些词必须走这条）

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
4. 不要 `openai-dark` / `mocha` 投会议室（灯光一打全糊）；投屏默认 `-t tech`
5. 贴 PPT：图拉满内容区，不要缩成角落缩略图；底栏安全区已预留，不要再往 PNG 里垫大空白

**渲染后自检（Read PNG，5 米测试）：** 眯眼仍能分清蓝流程 / 琥珀判定 / 绿状态；图题在；字不截断。通不过 → 砍节点或拆图，不要加 `--css`。

### 1c-3. 聊天 / 窄栏（对话页、侧栏、正文只有约 1/3 屏宽）

触发词：**聊天、对话、贴进对话、窄栏、侧栏、飞书文档正文、微信、钉钉**。  
这些表面把图缩到栏宽。用 `--preset column`，让出图宽度对准栏宽。

```bash
mmdx doc.md --preset column --json --quiet
```

`--json.warnings` 出现 `column-landscape`（源是 `flowchart LR/RL`）或 `column-shrink`（图本身比 800px 宽、会被 CSS 缩小）→ 改 `flowchart TD`、砍节点或拆图。加大 `--width` 会让缩完的字更小。

### 1c-4. HTML 文件导出（配套 diagram-design 等手绘 HTML）

触发：用户给了或生成了 HTML 文件（diagram-design 产物、报告页原型），要「导出图片 / 截图 / 转 PNG」。

```bash
mmdx page.html -o out/page.png --scale 3
```

- 只认独立 `.html` / `.htm` 文件；`.md` 里写 ` ```html ` 围栏**无效**。页面自带样式、脚本、背景全保留，中文字形走内嵌字体兜底，离线一致
- **高保真**：`--scale 3`（印刷/大屏缩放，diagram-design 官方导出即 3x）；默认 2 够 PPT。固定画布页让 `body` 宽=画布宽（或 `--width` 对齐），避免响应式重排；透明底显式 `--background transparent`
- **护栏**：办公出图**不要**为绕开围栏纪律去手写 HTML——预算、lint、像素筛查对任意 HTML 全部失效。这条路径只用于「HTML 已经存在」的导出，不是画图路径
- 偶发需要 **editorial 封面 / 方案插图**（低频、一次性、杂志感）确要手绘时：规格用 [editorial/](editorial/README.md)（diagram-design skill 规格层，MIT，随本 skill 分发）——读它的总则 + 对应 type 文件，导出仍用上面的命令
- 需要**多图叙事解释页 / 评审页 / recap / 幻灯片页**（低频、要「十分钟看懂」）时：规格用 [explain/](explain/README.md)（visual-explainer 规格化改造版，MIT，随本 skill 分发）——复制它的 starter 再编辑页身，导出仍用上面的命令
- 导出时中文自动兜三套内嵌字体：黑体（默认）/ 宋体 `'Noto Serif SC'`（serif 栈）/ 楷体 `'LXGW WenKai'`（手绘标注，显式声明）——页面无需内嵌 CJK

### 1d. 自检闭环（渲染后必做）

1. `--json`：`failed:0`；`warnings` 若非空，按 [troubleshooting.md](references/troubleshooting.md) 处置
2. **Read 看 PNG**：图题/来源/单位在图上（若传了）、文字不截断、类别不过多、连线不穿字、四边留白。流程图折线过多 → 确认没被切到 mermaid+ELK；C4 变成浅色办公卡 → 这是 Pele，要教科书深色块就 `--engine mermaid`
3. 若砍过密度，补一句保真台账：「18 源节点 → 9 张图」
4. 问题 → 改图或调 caption → `--index N` 重渲染；最多 2 轮，仍不满意问用户

### 1e. 回哺：新画法沉淀（自检通过后顺手判断）

刚渲染的图是否用了 recipes / fences 都没覆盖的写法组合（新图型用法、新版式组合、新参数模式）？判定标准：不是换了文案或配色的普通图，而是**下次遇到同类需求可以直接抄**的模式（例：对照式 timeline、分层横切）。

- 是 → 建议用户把它沉淀进 [references/recipes.md](references/recipes.md)（mermaid 画法）或 [references/fences.md](references/fences.md)（围栏细则）：条目格式照抄现有节、示例用刚实渲染验证过的源码、开头一句话讲清适用场景与不适用边界
- **索引维护**：入库同时更新本文件「按需加载」清单里对应文件的描述（新画法要点写进那一行，让下次检索能命中），不要只加正文不动索引
- 宿主安装的 skill 目录是只读镜像，改动落在 mmdx 仓库 `skill/`（随 release 重新分发；本地镜像要手动同步）
