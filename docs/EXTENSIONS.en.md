> English · [中文](EXTENSIONS.md)

# Extension-block gallery

One PNG **rendered by this tool** per fence (`bun scripts/make-review.ts`). Extension blocks are PNG-only. All of them take `--title` / `--subtitle` / `--source` / `--unit` chrome; accent color follows `--brand`.

The twenty mermaid types are collaged in [tests/contact-sheet.png](../tests/contact-sheet.png) (`bun scripts/make-contact-sheet.ts`, after tests).

---

## table

GFM pipe table. Alignment, inline `**bold**`, and `` `code` `` are supported.

````markdown
```table
| 阶段 | 负责人 | 工时 | 状态 |
|:-----|:------:|-----:|:----|
| 需求评审 | 张三 | 3h | ✅ done |
| 核心开发 | 李四 | **16h** | 🔄 in progress |
| `code review` | 王五 | 4h | pending |
```
````

![table](ext-table.png)

## list

Nested Markdown lists (unordered and ordered may mix).

````markdown
```list
- 渲染管线
  - 检测浏览器（Edge/Chrome）
  - 复用页面池
- 主题系统
  - 内置 7 套预设
  - `--theme-js` 与 `--css` 自定义
- 导出
  1. SVG（svgo 压缩）
  2. PNG（2x 高清）
```
````

![list](ext-list.png)

## card

One card per line: `emoji | title | description` (emoji and description optional). Two-column grid.

````markdown
```card
🚀 | 渲染管线 | 单浏览器页池复用，PNG 2x 无损导出
🎨 | 主题系统 | tech/openai/minimal/latte/mocha/sketch 七套预设
🧩 | 扩展语法 | 表格、列表、卡片均可独立成图
📦 | 二进制分发 | Release 直接下载，免 Node 运行时
```
````

![card](ext-card.png)

## chart

`type: bar | line | pie` plus CSV or a GFM table. ≤6 categories × ≤2 series; over-limit fails and points at [AntV mcp-server-chart](https://github.com/antvis/mcp-server-chart). **Do not hand-write `xychart-beta`.** Fence `title` / `unit` / `source` print on the caption chrome.

````markdown
```chart
type: bar
title: 各区销量
unit: 万元
source: 销量表
华东, 120
华南, 86
华北, 64
```
````

![chart](ext-chart.png)

## kpi

Big numbers, ≤4 rows. Delta column is red-up / green-down; only the first value uses the accent color.

````markdown
```kpi
GMV | 1.28 亿 | +12%
订单 | 8.6 万 | -3%
客单 | 149 元 | +6%
```
````

![kpi](ext-kpi.png)

## compare

Two columns exactly: `name | subtitle | points`.

````markdown
```compare
方案 A | 自建渲染 | 可控、无外网、中文一致
方案 B | 远程图表 MCP | 图型全、有网络依赖
```
````

![compare](ext-compare.png)

## funnel

Conversion funnel, ≤6 layers: `stage, value`. Labels sit outside the bars; bar width follows quantity.

````markdown
```funnel
访问, 10000
下单, 1200
支付, 860
```
````

![funnel](ext-funnel.png)

## task

Status snapshot (not a schedule). Statuses: 未开始 / 设计 / 开发 / 测试 / 已上线 / 已取消, ≤10 rows. Use mermaid `gantt` for schedules and `kanban` for multi-column boards.

Syntax: `name | status | date | effort | optional tag`

````markdown
```task
用户中心改版 | 开发 | 09-08 | 5人天 | 卡点
支付对账 | 未开始 | 09-15 | 3人天
数据迁移 | 测试 | 09-01 | 8人天
旧版下线 | 已上线
短信通道切换 | 已取消
视觉稿 | 设计
```
````

![task](ext-task.png)

## progress

Concentric rings, ≤4. `name, percent` or `name, value, target`. Absolute values belong on kpi.

````markdown
```progress
Q1 收入, 87
交付里程碑, 4300, 5000
采纳率, 62
```
````

![progress](ext-progress.png)

## swimlane

Cross-team handoff: `step | lane | next`, ≤5 lanes ≤8 steps. Loops, parallelism, and decisions stay on flowchart.

````markdown
```swimlane
提需求 | 产品 | 评审
评审 | 产品 | 开发
开发 | 研发 | 联调
联调 | 测试 | 上线
上线 | 运维
```
````

![swimlane](ext-swimlane.png)

---

## Regenerating samples

```bash
bun run test
bun scripts/make-contact-sheet.ts   # mermaid collage → tests/contact-sheet.png
bun scripts/make-review.ts          # extension samples → docs/ext-*.png
```
