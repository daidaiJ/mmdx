> [English](AGENT_GUIDE.en.md) · 中文

# mmdx — Agent Guide

办公出图 CLI。把围栏块渲染成可贴进 PPT / Word / 飞书的 PNG；主题、中文字体、Pele 布局、留白全部内置。**不要在图代码里手工调样式。**

> 人类阅读版：[HUMAN_GUIDE.md](HUMAN_GUIDE.md) · 扩展块图鉴：[EXTENSIONS.md](EXTENSIONS.md) · 项目概览：[README](../README.md)

## 场景分级（先选档，再动笔）

| 档位 | 场景 | 路径 | 产物 | 单图成本 |
| --- | --- | --- | --- | --- |
| **高速**（默认） | 流程/审批/轻量数据图/版式块——周报贴片、投屏、高频可验收 | 围栏（mermaid 图型 + 扩展块），按[选型速查](#选型速查) | PNG @2x；mermaid 图型另有矢量 SVG | ~0.3–1.5k token，秒级 |
| **精美**（低频） | 封面/方案插图——editorial 质感、一次性 | 手绘 HTML（[vendored diagram-design 规格](editorial-diagram-design/README.md)）→ [HTML 文件导出](#html-文件导出配套-diagram-design) | PNG @3x | ~10–20k token，分钟级 |

统一经 mmdx 导出。**清晰度是构造保证**：PNG 走 deviceScaleFactor 超采样、一次栅格化，无事后缩放、无 JPEG 压缩，中文内嵌字体——不存在"糊"的来源。要更高保真加 `--scale 3`（印刷/4K 全屏），不要放大已出的 PNG；全屏贴片让图宽对准目标（如 `--width 1600`）。

**护栏**：办公出图默认高速档；不要为绕开围栏纪律降档手绘（预算/lint/像素筛查只在围栏体系内生效）。精美档仅用于「HTML 已存在」的导出或确需 editorial 质感的一次性场景。

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
# L0 聊天/窄栏：PNG + 800px 栏宽（2K 约 1/3）
mmdx doc.md --preset column
# L0b 投屏/PPT
mmdx doc.md --preset slide --title "Q1 销售构成" --unit 万元 --source "财务月报"
# L1 批量/定向
mmdx a.md b.md -o dist/ --preset column
mmdx doc.md --index 2 -f png
# L2 精确命名 / stdin
echo "graph TD; A-->B" | mmdx - -f png --preset column
```

聊天/窄栏用 `--preset column`（800px@2，字号 18、标签换行 200px；2K 屏约 1/3 栏宽）。**投屏 / PPT / 上会 / 周会 / 大屏** 必须 `--preset slide`（字号 18 + 加粗描边），并带 `--title`；不要用 `--css` 手调对比度，不要用暗色主题投会议室。飞书卡片 `square`，Word `a4`。`both` 仅开发者嵌 Markdown。显式 `--width`/`--scale`/`-f` 覆盖 preset。跟 VI：`--brand #2563EB`（只改强调色；投影不要用过浅的蓝）。`--json.warnings` 出现 `column-landscape` / `column-shrink` → 改 `flowchart TD` 或拆图，不要加宽 `--width`。

## HTML 文件导出（配套 diagram-design）

触发：用户给了/生成了 HTML 文件要「导出图片 / 截图 / 转 PNG」，或偶发要 editorial 封面图。

```bash
mmdx page.html -o out/page.png --scale 3    # 3x 高保真（印刷/大屏缩放）；默认 2 够 PPT
mmdx page.html --background transparent     # 透明底需显式传
```

- 只认独立 `.html` / `.htm` 文件；`.md` 里写 ` ```html ` 围栏**无效**。页面样式、脚本、背景全保留；中文字形走内嵌字体兜底（离线一致）；`--width` = 布局视口，页面显式更窄的 `body` 宽优先
- **手绘 editorial 图**（封面 / 方案插图，低频高保真场景）：规格见 [editorial-diagram-design](editorial-diagram-design/README.md)（vendored diagram-design skill，MIT）——按它的总则 + 对应 `type-*.md` 手写 HTML，再用上面命令导出；中文用 `'Noto Sans SC'` 字族名
- **护栏**：办公出图不要为绕开围栏去手写 HTML——预算 / lint / 像素筛查对任意 HTML 失效；手绘路径只用于「HTML 已存在」或确需 editorial 质感的一次性场景

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
2. 标签含 `()`/`[]` 等括号必须整体加引号：`A["O(1) 开销"]`——裸写会断在 `(` 报 Parsing error
3. 总览 ≤9 节点 / ≤12 边 / 强调 ≤2；sequence 生命线 ≤5。降级：装饰 → 副本合并 → 叶子簇折叠 → 度-1 汇点 → 横切基础设施 → 拆图
4. **禁一条龙长链**：≥6 节点串成一条线（无论 TD/LR）画布细长、嵌入文档难布局 → 按阶段拆 2-4 个 `subgraph`（聊天用外层 `TD`；投屏宽屏才外层 `LR`、组内 `direction TB`）；纯线性叙事改 timeline
5. 不写全局 `style`/`classDef`；仅强调个别节点
6. `subgraph` 要命名；跨部门交接优先 swimlane
7. 标题/来源/单位用 `--title`/`--subtitle`/`--source`/`--unit`，不手写 frontmatter
8. 中文 ≥ 12px；细环/细箭头里只放数字
9. **投屏 5 米测试**（Read PNG）：眯眼能分清形状分色、图题在、字不截断。失败则砍节点，不加 `--css`

## 自检闭环

1. `--json`：`failed:0`；`warnings` 非空则拆图或换 AntV（`--strict-chart` 升为错误）
2. **Read PNG**：图题/来源可见、文字不截断、不超限、留白均匀。流程图折线过多 → 你在 mermaid+ELK；C4 浅色卡 → Pele（要深色块就 `--engine mermaid`）
3. **sequence 必查底部**：Note 框/生命线收尾完整——放大字号见「常见坑」的 sequence 字号条目
4. 若砍过密度，保真一句：「18 源节点 → 9 张图」
5. `--index N` 重渲染；最多 2 轮

## JSON 契约（--json）

stdout 单份 JSON：`theme/layout/format/background/preset?/brand?/caption?/blocks/rendered/failed/files[]/errors[]/warnings[{input,index,code,message}]`；加 `--profile` 时附 `profile`。非 JSON 模式 stdout 逐行产物路径。

## 错误速诊

| 报错 | 性质 | 处置 |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | 环境缺浏览器 | 装 Edge/Chrome 或 `--browser`；不自动下载 |
| `render timed out after 60s` | 资源紧张/假死 | CLI 已自动重试；持续则 `--jobs 1` |
| `icon pack "xxx" not found` | 网络不通（unpkg） | 去掉 `--icon` 或先联网跑一次用缓存 |
| 中文变方块 | 不应发生（内置字体） | 检查 `--config`/`--theme-js` 是否覆盖 fontFamily |
| `Parsing error` / 超限信息（exit 1） | **图或围栏写错** | 按信息修图，其他块不受影响；卡在 `(`/`[` 多为标签含括号没加引号（写图规则 2） |
| exit 2 | 参数用法错误 | `mmdx --help` 对照 |
| SVG 在非浏览器工具文字消失 | svg 是 HTML 实现 | 改 `-f png` |
| sequence 底部被裁（Note/收尾缺一截） | 全局 `fontSize` 不参与 sequence 布局计算 | `--config` 同改 `sequence.actorFontSize/messageFontSize/noteFontSize`；勿用 `overflow:visible` 兜底（生命线会穿透页面） |

总原则：**exit 2 = 参数错；exit 1 = 图写错或超限；报错先查表，别盲目重装环境**。

## 主题速记

`-t`：`tech`（默认，形状分色 + 可见填色，适合文档和投屏）· `openai`/`openai-dark` · `minimal` · `latte`/`mocha` · `sketch`。
叠加顺序：主题 → `--brand` → `--theme-js` → `--config` → `--css`。`--brand` 不重涂 flowchart 判定菱形。投屏不要换 `mocha`/`openai-dark`。

## 渲染引擎

差别在**布局和画法**，flowchart 形状分色是同一套 `tech` token。`--layout elk` **只作用于 mermaid 的 flowchart**。拼图：[Pele](../tests/contact-sheet-pele.png) / [mermaid](../tests/contact-sheet-mermaid.png)。

| 要什么 | 引擎 |
| --- | --- |
| 流程 / 时序 / 状态（默认） | `pele`：宽 S 弯；subgraph 成员更贴源码；sequence 带序号、长中文能换行 |
| C4 深色块 + 小人、思维导图按枝上色盒子、`@{icon}` | `mermaid`：C4 吃主题 `c4` 节；flowchart 才走 ELK |
| 手绘 | `-t sketch`（自动 mermaid） |

Pele 下 `--config` 只认 `flowchart.nodeSpacing/rankSpacing/wrappingWidth/curve`、`fontSize`、`padding`；`themeCSS` / `look` / `layoutAlgorithm` / `sequence.*` 忽略。扩展块与像素裁切仍走 Chromium。后续可抽的布局/配色思路见 [research-layout-color.md](research-layout-color.md)（不引入第二套图语法）。

## 退出码

`0` 成功 · `1` 有块失败（其余照常出图）· `2` 用法错误。

## 常见坑

- 批量 >30 块 → `--jobs 4`（默认 2；单浏览器页池，别更高）
- 同名 md 导出到同一 `-o` 目录互相覆盖 → 分目录或 `--index`
- `--config` 的 JSON 要落成真实文件（Windows 无进程替换）
- 手写 `xychart-beta` 容易出丑 → 改用 ` ```chart `
- **sequence 放大字号**：全局 `themeVariables.fontSize` 只放大文字不参与布局，必须配 `sequence:{actorFontSize,messageFontSize,noteFontSize}` 同值，否则底部被裁
- **SVG 嵌 HTML/PDF**：产物带固定像素宽且 `max-width:none` → 容器 CSS 需 `svg{max-width:100%!important;height:auto!important}`；无 `viewBox` 的（部分 sequence）按宽高注入；打印加 `break-inside:avoid` 防跨页截断
