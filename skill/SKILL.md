---
name: mermaid
description: Export office diagrams as PNG — 占比 pie, 趋势/对比 chart, 流程 flowchart, KPI/表格/卡片, 审批与泳道. Use when the user wants 图/图表/流程图/构成图/对比卡/周报贴图/渲染/导出图片. NOT for AI image generation (文生图/照片级插画) and NOT for analysis-grade stats (grouped bar, dual axis → AntV).
---

# mmdx — 办公出图（结构图 + 轻量数据图 + 版式块 → PNG）

把围栏块渲染成可贴进 PPT / Word / 飞书的 PNG。主题、中文字体、ELK、留白全部内置。**不要在图代码里手工调样式，不要用 VSCode 插件，不要让模型手绘 SVG。**

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
```

冒烟 JSON 且 `rendered:1` → 就绪。`rendered:0` → §4 错误速诊。

## 1. Agent Loop（选型 → 先砍再画 → 渲染 → 自检）

画之前用一两句话说：图型、`--preset`（有则）、预算会砍掉什么。办公读者默认 `mixed`：节点用组件名，边用白话动词，不写端口/协议。给老板改 `executive`（能力/结果，去厂商名）——只改用词，不改节点数。

### 何时不要画

问：读者从这张图比从一段话多学到什么？学不到就不要画。

- 纯列表 → ` ```list ` 或正文
- 两句前后对比 → ` ```compare `（不要做成 Venn）
- 单盒子带标签 → 写句子
- 为了「有图」硬画 flowchart 的周报条目 → 用 table / task / list

### 1a. 需求 → 图型（按意图，不按 mermaid 关键字）

| 用户要表达的 | 用什么 | 上限 | 典型命令 |
| --- | --- | --- | --- |
| 占比 | pie 或 ` ```chart ` `type: pie` | 扇区 3–6 | `-f png --preset slide` |
| 趋势 | ` ```chart ` `type: line` | 类别 ≤6、系列 ≤2 | 不要手写 `xychart-beta` |
| 数值对比 | ` ```chart ` `type: bar` | 同上 | |
| 方案对比 | ` ```compare ` | 恰 2 栏 | |
| 构成（面积） | treemap | 单元格可读 | |
| 流向 | sankey | | |
| 四象限 / 优先级 | quadrant | ≤12 项 | |
| 排期 / 工期 | gantt | | |
| 流程 / 审批 / 判定 | flowchart | ≤9 节点 / ≤12 边 | `flowchart LR` + 命名 subgraph |
| 跨部门交接 | ` ```swimlane ` | 泳道 ≤5、步骤 ≤8 | handoff 才是重点；有环/并行用 flowchart |
| 需求池 / 多列看板 | kanban | | 当前状态快照改用 ` ```task ` |
| 任务状态快照 | ` ```task ` | ≤10 行 | 6 态：未开始/设计/开发/测试/已上线/已取消 |
| 多指标达成率 | ` ```progress ` | ≤4 环 | 绝对值用 kpi |
| KPI 大数字 | ` ```kpi ` | ≤4 行 | |
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
10. 跟 VI 用 `--brand #RRGGBB`（只改强调色，不重涂 flowchart 形状分色）

### 1c. 渲染

聊天 / 幻灯片默认 **PNG**。贴 PPT 加 `--preset slide`（1600px 宽、字号加大）。Word/PDF 用 `--preset a4`，飞书卡片用 `--preset square`。`both`（SVG+PNG）仅开发者把图嵌进 Markdown。

```bash
# L0 办公默认
mmdx doc.md --preset slide --title "Q1 销售构成" --unit 万元 --source "财务月报"
# L1 批量/定向
mmdx a.md b.md -o dist/ --preset slide
mmdx doc.md --index 2 -f png
# L2 精确命名 / stdin
mmdx doc.md -o out/arch.png
echo "graph LR; A-->B" | mmdx - -f png
```

覆盖关系：显式 `--width` / `--scale` / `-f` 覆盖 preset 默认值。叠加顺序：主题 → `--brand` → `--theme-js` → `--config` → `--css`。

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

```swimlane
提需求 | 产品 | 评审
评审 | 产品 | 开发
开发 | 研发
```
````

kpi 变化列默认**红涨绿跌**（可用 `--css` 覆盖）。progress 第一行 = 最外环。task 不接受「进行中」，必须写具体相位。swimlane 不做并行/判定（有判定用 flowchart）。

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
| 中文变方块 | 不应发生 | 检查 `--config`/`--theme-js` 是否覆盖 fontFamily |
| exit 1 + `Parsing error` / 超限信息 | **图或围栏写错** | 按信息修；其他块不受影响 |
| exit 2 | 参数用法错误 | `mmdx --help` |

总原则：**exit 2 = 参数错；exit 1 = 图写错或超限；报错先查表。**

## 5. 主题

| 场景 | `-t` |
| --- | --- |
| 技术方案/周报（默认） | `tech`（形状分色：蓝流程 / 琥珀判定 / 绿状态 / 紫存储） |
| 开源 README | `openai` / `openai-dark` |
| 暗色文档 | `mocha` |
| 轻松分享 | `sketch` |

`--brand` 只改扩展块强调色（卡片左边条、kpi 数字、swimlane 第一条跨带箭头），**不**把判定菱形改成品牌色。

## 附录 — 开发文档场景（能渲染、不主推）

sequence、state、class、ER、gitgraph、C4。办公选型不要从这里起。继续可用 mermaid-cli。
