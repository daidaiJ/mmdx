> [English](AGENT_GUIDE.en.md) · 中文

# mmdx — Agent Guide

办公出图 CLI。把围栏块渲染成可贴进 PPT / Word / 飞书的 PNG；主题、中文字体、ELK、留白全部内置。**不要在图代码里手工调样式，不要用手绘 SVG。**

> 人类阅读版：[HUMAN_GUIDE.md](HUMAN_GUIDE.md) · 扩展块图鉴：[EXTENSIONS.md](EXTENSIONS.md) · 项目概览：[README](../README.md)

## 获取（按优先级）

```bash
# 1. Release 二进制（推荐，免 Node）
curl -L -o "$TMP/mmdx.exe" https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe
# 2. 源码动态运行（需 bun）：bun run src/cli.ts
```

下文统一写 `mmdx`。渲染需系统 Edge/Chrome，找不到时报错 `no Chrome/Edge found`，用 `--browser <path>`；**绝不自动下载浏览器**。

## 环境自检（会话内首次使用先跑，30 秒）

```bash
mmdx --version
echo "graph LR; A[自检] --> B{通过}" | mmdx - -f png -o "$TMP/mmdx-check" --json --quiet
```

冒烟输出 JSON 且 `rendered:1` → 环境就绪。`rendered:0` → 查下方[错误速诊](#错误速诊)。

## 何时不要画

- 纯列表 → ` ```list ` 或正文
- 两句前后对比 → ` ```compare `
- 同一指标两列数字 → ` ```vs `
- 单盒子带标签 → 写句子
- 读者从这张图学不到比一段话更多的东西 → 不要画

画前用一两句话说图型、`--preset`（有则）、预算会砍掉什么。办公默认 `mixed` 用词（组件名 + 白话动词，不写端口/协议）。

## 命令档位

```bash
# L0 办公默认：PNG + 幻灯片画幅
mmdx doc.md --preset slide --title "Q1 销售构成" --unit 万元 --source "财务月报"
# L1 批量/定向
mmdx a.md b.md -o dist/ --preset slide
mmdx doc.md --index 2 -f png
# L2 精确命名 / stdin
echo "graph LR; A-->B" | mmdx - -f png
```

聊天/幻灯片 `-f png` 或 `--preset slide|a4|square`（preset 未显式 `-f` 时默认 png）。**投屏 / PPT / 上会 / 周会 / 大屏** 必须 `--preset slide`（字号 18 + 加粗描边），并带 `--title`；不要用 `--css` 手调对比度，不要用暗色主题投会议室。飞书卡片 `square`，Word `a4`。`both` 仅开发者嵌 Markdown。显式 `--width`/`--scale`/`-f` 覆盖 preset。跟 VI：`--brand #2563EB`（只改强调色；投影不要用过浅的蓝）。

## 选型速查

| 用户要表达的 | 用什么 | 上限 |
| --- | --- | --- |
| 占比 | pie / ` ```chart ` pie | 扇区 3–6 |
| 趋势 / 数值对比 | ` ```chart ` line / bar | ≤6 类 × ≤2 系列 |
| 方案对比 | ` ```compare ` | 恰 2 栏 |
| 数值前后对比 | ` ```vs ` | ≤6 行 × 2 列 |
| 流程 / 审批 / 判定 | flowchart | ≤9 节点 / ≤12 边 |
| 跨部门交接 | ` ```swimlane ` | 泳道 ≤5、步骤 ≤8 |
| 任务状态快照 | ` ```task ` | ≤10 行 |
| 多指标达成率（同心） | ` ```progress ` | ≤4 环 |
| 并排半环进度 | ` ```gauge ` | ≤4 个 |
| KPI 大数字 | ` ```kpi ` | ≤4 行 |
| 提交/发布日历 | ` ```heatmap ` | ≤12 周 |
| 转化漏斗 | ` ```funnel ` | ≤6 层 |
| 表格 / 列表 / 卡片 | ` ```table ` / ` ```list ` / ` ```card ` | |
| 排期 / 构成 / 流向 | gantt / treemap / sankey | |
| 四象限 / 旅程 / 演进 / 打分 | quadrant / journey / timeline / radar | radar ≤8×3 |

**附录（能渲染、不主推）：** sequence、state、class、ER、gitgraph、C4。超限拆总览+局部，或数据图交给 [AntV mcp-server-chart](https://github.com/antvis/mcp-server-chart)。

## 写图规则

1. 节点标签 ≤ 12 中文字；细节放边线/note/正文
2. 总览 ≤9 节点 / ≤12 边 / 强调 ≤2；sequence 生命线 ≤5。降级：装饰 → 副本合并 → 叶子簇折叠 → 度-1 汇点 → 横切基础设施 → 拆图
3. 不写全局 `style`/`classDef`；仅强调个别节点
4. `subgraph` 要命名；跨部门交接优先 swimlane
5. 标题/来源/单位用 `--title`/`--subtitle`/`--source`/`--unit`，不手写 frontmatter
6. 中文 ≥ 12px；细环/细箭头里只放数字
7. **投屏 5 米测试**（Read PNG）：眯眼能分清形状分色、图题在、字不截断。失败则砍节点，不加 `--css`

## 自检闭环

1. `--json`：`failed:0`；`warnings` 非空则拆图或换 AntV（`--strict-chart` 升为错误）
2. **Read PNG**：图题/来源可见、文字不截断、不超限、留白均匀
3. 若砍过密度，保真一句：「18 源节点 → 9 张图」
4. `--index N` 重渲染；最多 2 轮

## JSON 契约（--json）

stdout 单份 JSON：`theme/layout/format/background/preset?/brand?/caption?/blocks/rendered/failed/files[]/errors[]/warnings[{input,index,code,message}]`；加 `--profile` 时附 `profile`。非 JSON 模式 stdout 逐行产物路径。

## 错误速诊

| 报错 | 性质 | 处置 |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | 环境缺浏览器 | 装 Edge/Chrome 或 `--browser`；不自动下载 |
| `render timed out after 60s` | 资源紧张/假死 | CLI 已自动重试；持续则 `--jobs 1` |
| `icon pack "xxx" not found` | 网络不通（unpkg） | 去掉 `--icon` 或先联网跑一次用缓存 |
| 中文变方块 | 不应发生（内置字体） | 检查 `--config`/`--theme-js` 是否覆盖 fontFamily |
| `Parsing error` / 超限信息（exit 1） | **图或围栏写错** | 按信息修图，其他块不受影响 |
| exit 2 | 参数用法错误 | `mmdx --help` 对照 |
| SVG 在非浏览器工具文字消失 | svg 是 HTML 实现 | 改 `-f png` |

总原则：**exit 2 = 参数错；exit 1 = 图写错或超限；报错先查表，别盲目重装环境**。

## 主题速记

`-t`：`tech`（默认，形状分色 + 可见填色，适合文档和投屏）· `openai`/`openai-dark` · `minimal` · `latte`/`mocha` · `sketch`。
叠加顺序：主题 → `--brand` → `--theme-js` → `--config` → `--css`。`--brand` 不重涂 flowchart 判定菱形。投屏不要换 `mocha`/`openai-dark`。

## 退出码

`0` 成功 · `1` 有块失败（其余照常出图）· `2` 用法错误。

## 常见坑

- 批量 >30 块 → `--jobs 4`（默认 2；单浏览器页池，别更高）
- 同名 md 导出到同一 `-o` 目录互相覆盖 → 分目录或 `--index`
- `--config` 的 JSON 要落成真实文件（Windows 无进程替换）
- 手写 `xychart-beta` 容易出丑 → 改用 ` ```chart `
