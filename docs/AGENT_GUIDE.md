> [English](AGENT_GUIDE.en.md) · 中文

# mmdx — Agent Guide

办公出图 CLI。把围栏块渲染成可贴进 PPT / Word / 飞书的 PNG；主题、中文字体、Pele 布局、留白全部内置。**不要在图代码里手工调样式，不要用手绘 SVG。**

> 人类阅读版：[HUMAN_GUIDE.md](HUMAN_GUIDE.md) · 扩展块图鉴：[EXTENSIONS.md](EXTENSIONS.md) · 按需参考：[skill/references/](../skill/references/)（围栏语法 / 图型示例 / 主题与 Pele 配置 / 排障） · 项目概览：[README](../README.md)

## 场景分级（先选档，再动笔）

| 档位 | 场景 | 路径 | 产物 | 单图成本 |
| --- | --- | --- | --- | --- |
| **高速**（默认） | 流程/审批/轻量数据图/版式块——周报贴片、投屏、高频可验收 | 围栏（mermaid 图型 + 扩展块），按[选型速查](#选型速查) | PNG @2x；mermaid 图型另有矢量 SVG | ~0.3–1.5k token，秒级 |
| **精美**（低频） | 封面/方案插图——editorial 质感、一次性 | 手绘 HTML（[vendored diagram-design 规格](../skill/editorial/README.md)）→ [HTML 文件导出](#html-文件导出) | PNG @3x | ~10–20k token，分钟级 |
| **叙事**（低频） | 多图解释页 / diff·plan 评审页 / recap / 幻灯片页 | explain starter 装配 HTML（[vendored visual-explainer 规格](../skill/explain/README.md)）→ 同一条导出命令 | PNG @3x | 分钟级 |

统一经 mmdx 导出，一次栅格化、超采样、内嵌中文字体——清晰度是构造保证。要更高保真加 `--scale 3`，不要放大已出的 PNG。

**护栏**：办公出图默认高速档；不要为绕开围栏纪律降档手绘（预算与像素筛查只在围栏体系内生效）。精美/叙事档只用于「HTML 已存在」的导出或确需 editorial / 解释页质感的一次性场景。

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
# L0 聊天/窄栏：800px@2（2K 屏约 1/3 栏宽，标签换行更紧）
mmdx doc.md --preset column
# L1 批量/定向
mmdx a.md b.md -o dist/ --preset slide
mmdx doc.md --index 2 -f png
# L2 精确命名 / stdin
echo "graph LR; A-->B" | mmdx - -f png
# 信息卡（Markdown 或 URL；--tone 控制结构）
mmdx card --in note.md -t openai --tone neutral --width 600 -o card.png
```

聊天/幻灯片 `-f png` 或 `--preset slide|a4|square|column`（preset 未显式 `-f` 时默认 png）。**投屏 / PPT / 上会 / 周会 / 大屏** 必须 `--preset slide`（字号 18 + 加粗描边），并带 `--title`；不要用 `--css` 手调对比度，也不要把深色页面投会议室。聊天/窄栏用 `--preset column`（800px@2，字号 18、标签换行 200px），流程图用 `TD`——不要加宽 `--width`（缩完字更小）。飞书卡片 `square`，Word `a4`。`both` 仅开发者嵌 Markdown。显式 `--width`/`--scale`/`-f` 覆盖 preset。跟 VI：`--brand #2563EB`（只改强调色；投影不要用过浅的蓝）。`--json.warnings` 出现 `column-landscape` / `column-shrink` → 改 `flowchart TD` 或拆图。

只有 Pele 一个引擎，没有 `--engine` / `--layout` 开关；Pele 解析不了的写法直接 `Parsing error`（exit 1），改写成等价图型。`-f svg` 默认烘焙颜色，`--svg-themeable` 才保留 CSS 变量。

## HTML 文件导出

触发：用户给了/生成了 HTML 文件要「导出图片 / 截图 / 转 PNG」，或要 editorial 封面、叙事解释页。

```bash
mmdx page.html -o out/page.png --scale 3    # 3x 高保真（印刷/大屏）；默认 2 够 PPT
mmdx page.html --background transparent     # 透明底需显式传
```

- 只认独立 `.html` / `.htm` 文件；`.md` 里写 ` ```html ` 围栏**无效**。页面样式、脚本、背景全保留；中文字形走内嵌三家族兜底（正文黑体、serif 栈中文落宋体、显式 `'LXGW WenKai'` 得楷体），页面自己声明的 webfont 仍然优先。`--width` = 布局视口，页面显式更窄的 `body` 宽优先
- 只出 PNG：显式 `-f svg` 仍写 PNG 并提示 `... renders to PNG only`
- **figure lint 自动跑**：导出时检查每个 figure，结果进 `--json.warnings`，按坐标改源码修到清零
- **editorial 封面 / 方案插图**：读 [skill/editorial](../skill/editorial/README.md)（diagram-design 规格，MIT），按其总则 + 对应 `references/type-*.md` 写自包含 HTML 再导出
- **解释页 / 评审页 / recap / 幻灯片页**：复制 [skill/explain](../skill/explain/README.md) 的 `kit/starter-<register>.html`（instrument / blueprint / paper / editorial，已内联 kit 与拉丁字体）→ 编辑 `<main>` → 同一条导出命令；页内 mermaid 用 `mmdx - -f svg` 预渲后原样内联（不要给内联 svg 加第二个 `style`，重复属性会丢掉 `--pele-*` 主题变量）。starter 由 `bun run scripts/explain-starter.ts` 生成，脚本用 `import.meta.dir`，需 bun；只在重新生成 starter 时才跑
- **护栏**：办公出图不要为绕开围栏去手写 HTML——预算与像素筛查对任意 HTML 失效；手绘路径只用于「HTML 已存在」或确需 editorial / 叙事质感的一次性场景

figure lint 处置表：

| code | 处置 |
| --- | --- |
| `figure-overflow` | 加宽 `viewBox` 或把元素收进来 |
| `figure-text-overlap` | 挪开标签；节点自己的标签与其形状收进同一 `<g>` |
| `figure-text-adhesion` | 与框间距 < max(4px, 字高×35%)：缩短标签、拉开或抬高 |
| `figure-small-text` | 放大画布或加大字号（<11px 会被判为不可读） |
| `figure-uncaptioned` / `svg-aria-label` | 补 `figcaption`（写主张）或 svg `aria-label` |

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

stdout 单份 JSON：`theme/engine/format/background/preset?/brand?/caption?/blocks/rendered/failed/files[]/errors[]/warnings[{input,index,code,message}]`（`engine` 恒为 `"pele"`）；加 `--profile` 时附 `profile`。非 JSON 模式 stdout 逐行产物路径。

## 错误速诊

| 报错 | 性质 | 处置 |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | 环境缺浏览器 | 装 Edge/Chrome 或 `--browser`；不自动下载 |
| `render timed out after 60s` | 资源紧张/假死 | CLI 已自动重试；持续则 `--jobs 1` |
| `icon pack "xxx" not found` | 网络不通（unpkg） | 去掉 `--icon` 或先联网跑一次用缓存 |
| 中文变方块 | 不应发生（内置字体） | 检查 `--config`/`--theme-js` 是否覆盖 fontFamily |
| `Parsing error` / `pele: Parse error` / 超限信息（exit 1） | **图或围栏写错** | 按信息修图；改写为等价的可渲染图型，没有别的引擎可切 |
| `unknown option --engine` / `--layout` | 1.x 遗留参数，已随第二引擎移除 | 去掉参数；间距用 `--config` 的 `flowchart.nodeSpacing` / `rankSpacing` |
| `--theme-js v2 receives a ThemeSpec` | 1.x 换色脚本 | 改 `theme.vars` / `theme.shapes` |
| `config "…" is not supported by the pele engine` | `--config` 白名单外 | 颜色用 `--theme-js`，字号/间距用 `fontSize` / `flowchart.*` |
| exit 2 | 参数用法错误 | `mmdx --help` 对照 |
| SVG 在 Office 颜色丢失 | 用了 `--svg-themeable` | 去掉该 flag，或改 `-f png` |
| `.html` 输入 `-f svg` 提示 `renders to PNG only` | 正常降级 | 整页截图只有 PNG；矢量需求走 mermaid 图型 |
| `.html` 输入的 `figure-*` / `svg-aria-label` 告警 | 手绘 figure 几何或结构 | 按消息里的图号与坐标改源码，修到 `--json.warnings` 清零 |

总原则：**exit 2 = 参数错；exit 1 = 图写错或超限；报错先查表，别盲目重装环境**。

## 主题速记

`-t`：`tech`（默认，形状分色 + 可见填色，适合文档和投屏）· `openai`（干净工程师文档：纯白、墨黑、薄荷绿点缀、发丝边框）· `excalidraw`（手绘线条 + 粉彩填色）· `ios`（iOS 系统界面：分组浅灰底 + 白卡片 + 发丝分隔线 + 系统色）· `acnh`（动森：奶油纸 + 粗棕描边 + 硬偏移阴影 + 圆体字）· `glass`（Fluent 亚克力：淡蓝灰画布 + 网格 + 半透明白膜与细颗粒）· `epaper`（电子纸：纸底 + 发丝黑描边 + 直角无阴影 + 灰阶形状分色）。`acnh` / `glass` / `epaper` 图都自带底（`mmdx-backdrop`），PNG 不裁边；`ios` 是纯平面，不画底、不加投影。
`excalidraw` 默认实心填色；`--style-fill hachure` 切斜线。块页和信息卡用 `--tone paper|neutral|product` 控制结构；`paper` 另把图的配色换成灰白网格纸（`#FAFAF8` + 24px 细格 / 96px 粗格，焦橙强调色；`neutral` / `product` 不动配色）。叠加顺序：主题 → `--brand` → `--theme-js` → `--config` → `--css`。`--brand` 不重涂 flowchart 判定菱形。

| 场景 | 首选 | 备选 | tone |
| --- | --- | --- | --- |
| 方案 / 周报 / 投屏 | `tech` | `openai` | `neutral` |
| 工程师文档 / README | `openai` | `tech` | `neutral` |
| 发布说明 / 工程博客 | `openai` | `tech` | `product` |
| 对外报告 / 打印 | `openai` | `tech` | `paper` |
| 金融 / 商业报告 | `openai` | `tech` | `paper` |
| 知识库 / 长文 | `tech` | `openai` | `neutral` |
| 企业架构 / 合规 | `tech` | `openai` | `product` |
| 产品评审 | `openai` | `tech` | `product` |
| 白板 / 脑暴 | `excalidraw` | `openai` | `neutral` |
| 轻松分享 | `excalidraw` | `tech` | `paper` |
| 产品界面 / iOS 说明 | `ios` | `tech` | `neutral` |
| 周报贴纸 / 团队看板 | `acnh` | `excalidraw` | `neutral` |
| 玻璃封面 / 现代产品汇报 | `glass` | `tech` | `neutral` |
| 黑白打印 / 墨水屏 / 合规 | `epaper` | `openai` | `neutral` |

信息卡：对外/打印用 `openai` + `paper`；工程文档用 `tech` + `neutral`；发布/产品用 `openai` + `product`。详见 `skill/info-card-designer/SKILL.md`。

`--theme-js` 是 v2 契约：`(theme) => theme`，改 `theme.vars` / `theme.shapes` / `theme.css`，不要再碰 Mermaid 的 `themeVariables`。

## 退出码

`0` 成功 · `1` 有块失败（其余照常出图）· `2` 用法错误。

## 常见坑

- 批量 >30 块 → `--jobs 4`（默认 2；单浏览器页池，别更高）
- 同名 md 导出到同一 `-o` 目录互相覆盖 → 分目录或 `--index`
- `--config` 的 JSON 要落成真实文件（Windows 无进程替换）；只接受 `fontSize` / `padding` / `flowchart.spacing`
- 手写 `xychart-beta` 容易出丑 → 改用 ` ```chart `
