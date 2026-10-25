> [English](CHANGELOG.en.md) · 中文

# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.4.1] - 2026-10-25

- Release 新增 `mmdx-skill-<tag>.zip` 产物：skill 目录 + 内嵌 windows-x64 CLI（`bin/mmdx.exe`）一步到位，解压后把包内内容整体拷进 agent 的 skills 目录（`~/.qwen/skills/mermaid/` 等）即完成 skill 安装，附 `INSTALL.md`（安装路径示例、CLI 验证、非 Windows 指向 dynamic 包）；README 快速上手新增方式 D（中英同步）
- skill `references/recipes.md` 新增特殊画法「对照式 timeline（事件 vs 对策）」：每时期固定两行（事件 / 处置）的阶段对照叙事，比 flowchart 平行双链省节点预算且无交叉连线，附已验证示例与 `--source "© id"` 署名水印用法
- skill `editorial/README.md` 新增「简中手绘实践要点（mmdx 语境）」：简中标题/callout 落 sans（`'Noto Sans SC'` 渲染时已注册、离线可靠；serif 标题离线不保证）、sublabel 保持 Latin mono、署名水印两种做法（围栏 `--source` / 手绘页脚 `<text>`）、4px 网格纪律

## [1.4.0] - 2026-10-25

- 新增 `file.html` 整页输入：HTML 原样截图为 PNG（fullPage，只出 PNG），保留页面自身样式、脚本与背景；`--width` 为布局视口（页面显式更窄的 `body` 宽度优先），`--scale` / `--background` 照常生效——可作为手绘 HTML 工作流（如 diagram-design）的免 Playwright 导出后端
- HTML 截图自带离线中文保证：内嵌 Noto Sans SC 以 `'Noto Sans SC'` 字族注册，并按 CJK 码位区间 alias 到 `sans-serif` / `serif` 兜底链——页面声明的西文字体不变，中文字形离线一致，页面自带的 CJK 字体仍优先
- `.md` 里的 ` ```html ` 围栏仍不支持（只认独立 `.html` / `.htm` 文件），避免绕过扩展块的版式纪律；HTML 输入无预算/lint/像素筛查契约
- 文档写明配套用法：skill §1c-4 / AGENT_GUIDE / HUMAN_GUIDE / README 中英——触发词、高保真建议（`--scale 3`、画布宽对齐、显式透明底）、护栏（办公图不手写 HTML）；并确立「场景分级」总口径：高速档=围栏模板（PNG @2x / mermaid SVG，秒级），精美档=手绘 HTML（PNG @3x，分钟级），统一 mmdx 导出，清晰度靠 deviceScaleFactor 超采样一次栅格化（无事后缩放、无 JPEG）
- 嵌入 [diagram-design](https://github.com/cathrynlavery/diagram-design) skill 规格层到 **skill 目录内** [skill/editorial/](skill/editorial/README.md)（MIT，commit `0b9b10c`；上游 `SKILL.md` 改名 `UPSTREAM-SKILL.md` 避免与主 skill 撞名，63 个 `references/` 原文未改）——随 skill 目录整体分发，宿主安装后离线可用；适配层覆盖：导出走 `mmdx file.html`（替代 Playwright）、离线中文用 `'Noto Sans SC'`、选型仍以 mmdx skill 为准
- skill 渐进披露重构：`skill/SKILL.md` 收敛为索引 + 热路径（场景分级表、按需加载清单、§1a 选型、写图规则、preset 命令、四类表面路由、自检闭环），冷内容拆到 `skill/references/fences.md`（围栏语法速记/细则/能上会边界）、`references/troubleshooting.md`（报错速诊/warnings 处置/退出码）、`references/themes-engines.md`（主题/双引擎/Pele 配置键），按需读取
- 新增 `skill/references/recipes.md`：16 种 mermaid 图型最小示例（取自 `tests/diagrams` 已验证 fixture）+ 特殊画法配方——**一图并列双流程（subgraph `direction` LR+TB 混排，实测仅默认 Pele 支持，`--engine mermaid`+ELK 忽略 direction）**、嵌套包含、组织架构树、分层横切；全部示例经 mmdx 实渲染验证（18/18）
- README 增加 Pele / mermaid 双引擎拼图合集（`tests/contact-sheet-pele.png`、`tests/contact-sheet-mermaid.png`）
- skill / AGENT_GUIDE / HUMAN_GUIDE 写明两引擎差别：布局和画法，不是配色；ELK 只作用于 mermaid flowchart
- 调研后续可抽的布局/配色思路：[docs/research-layout-color.md](docs/research-layout-color.md)（不引入第二套图语法）

## [1.3.0] - 2026-10-23

- 默认渲染引擎改为 **Pele**（[obsidianmd/pele](https://github.com/obsidianmd/pele) v1.9.0，MIT）：自研布局 + 宽 S 弯连线，流程图默认曲线，不再是折线
- 新增 `--engine pele|mermaid`（默认 `pele`）；`--engine mermaid` 保留原 Chromium + mermaid.js + ELK 路径作回退
- 形状分色映射到 Pele 类：`.pele-shape-rect/rounded/stadium` 过程蓝、`.pele-shape-diam/hex` 判断琥珀、`.pele-shape-circle/ellipse` 状态绿、`.pele-shape-cyl` 存储紫；`--pele-*` 变量由各主题 themeVariables 派生
- mermaid 回退也改为曲线：`flowchart.curve` 由 `linear` 改为 `basis`（并修复 `layoutAlgorithm` 未写入、`--layout elk` 实际未激活的问题）
- `sketch` 主题无手绘 Pele 实现，自动回退 mermaid 并在 stderr 提示
- `--layout elk|dagre` 仅对 `--engine mermaid` 生效（Pele 自带布局）
- `--theme-js` / `--config` 对 Pele 生效的键：`flowchart.nodeSpacing` / `rankSpacing` / `wrappingWidth` / `curve`、`fontSize`、`padding`；mermaid 专属键（`themeCSS`、`look`、`layoutAlgorithm` 等）在 Pele 下忽略
- 扩展块（table/kpi/chart/…）与 PNG 像素裁切仍走 Chromium，不变
- `--json` 增加 `engine`；`--help` 增加 `--engine`；版本号 1.3.0

## [1.2.0] - 2026-10-22

- 新增 `--preset column`（800px@2，字号 18、标签换行 200px；对准 2K 办公屏约 1/3 栏宽）：聊天/窄栏正文出图；`column-landscape` / `column-shrink` 写入 `--json.warnings`
- skill / AGENT_GUIDE：聊天默认 `column`，投屏仍走 `slide`；流程图贴聊天用 `TD`
- Pele 换引擎列为后续：[docs/research-pele.md](docs/research-pele.md)
- 日历热力改成办公卡：格子随周数放大、空天可见、中文日期与月标、有值格子写次数
- `tech` 默认主题：形状分色改为可见填色 + 1.5px 描边，连线/饼图/色板加饱和；默认 accent `#2563EB`
- `--preset slide` 字号 18、描边加粗；skill / AGENT_GUIDE 增加投屏/PPT 导出引导（触发词 → 命令 → 5 米自检）

## [1.1.0] - 2026-09-11

### 办公出图

- 新增画幅预设 `--preset slide|a4|square`（未显式 `-f` 时默认 PNG；`slide` 加大节点字号与间距，底栏预留安全区）
- 新增图题层 `--title` / `--subtitle` / `--source` / `--unit`，印在 PNG chrome 上（mermaid 与扩展块共用）。**Breaking：** `--title` 不再写入 mermaid frontmatter
- 新增 `--brand <hex>`：只改扩展块 accent；flowchart 形状分色保持；低对比警告不阻断
- 新增 `--strict-chart` 与 `--json.warnings`：pie / xychart / radar / flowchart / sequence 预算软护栏
- 新增围栏：```chart ```kpi ```compare ```funnel ```task ```progress ```swimlane ```gauge ```vs ```heatmap
- `--help` 补 `--preset`、`--index` 及上述新参数
- skill / AGENT_GUIDE 改为办公意图选型：总览 ≤9 节点、何时不画、降级阶梯、默认 PNG
- tech 主题收一档：关掉 neo 渐变阴影，形状分色改浅底+描边，连线/灰阶降饱和；扩展块统一 8px 圆角、无阴影，kpi 仅第一项强调色
- 新增扩展块图鉴 [docs/EXTENSIONS.md](docs/EXTENSIONS.md)（每种围栏一张工具渲染的 PNG）
- 测试打开 `profile` 插桩：`page-reset` / `init-mermaid` 次数与阶段 maxMs 超预算即失败；HTML 块后只清 DOM，不按块重注 mermaid

## [1.0.0] - 2026-09

首个正式版本。

### 主题体系（tech 默认主题，官方入口优先）

- 配色按 mermaid 官方三层入口组织：**themeVariables 全量变量面**（core 派生链 primaryColor/secondary/tertiary/mainBkg/nodeBkg + 各图专属变量）→ 每图 config 节（c4/journey/radar/xyChart…）→ themeCSS 只做官方变量表达不了的事（圆角、形状编码、少量结构性修正）
- 数据类图表采用 **AntV G2 分类色板**（pie/xychart/treemap/radar），现代报表风格
- 节点 `look: 'neo'`：圆角 + 柔和渐变 + 阴影；流程图保留形状编码（蓝=过程/橙=判断/绿=状态/紫=存储）
- 20 种 mermaid 图全覆盖 + 像素级主题普查脚本（`scripts/theme-census.ts`）防回归

### 渲染管线

- 内置 Noto Sans SC 字体子集（GB2312 + latin，1.9MB woff2），中文渲染跨机一致
- ELK 布局引擎懒加载（仅 flowchart/graph），其余 dagre
- PNG 2x 无损 + 像素级留白裁切（四周留白对称）；SVG 经 svgo 压缩（官方 browser 构建内嵌二进制）
- 并发截图串行化 + 视口自适应，60s 渲染超时熔断 + 单图自动重试

### 扩展块

- ```table / ```list / ```card（约定语法：`emoji | 标题 | 描述`）渲染为样式化 PNG

### Agent 友好

- `--json` 机器可读输出、`--profile` 阶段耗时、`--theme-js`/`--config`/`--css` 自定义主题、`--icon` 图标包
- 单图失败隔离，整批不中断；配套 agent skill（触发词、选型表、自检闭环）

### 产物

- `mmdx-windows-x64.exe` — windows x64 单文件（免 Node，需系统 Edge/Chrome）

[1.3.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.3.0
[1.2.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.2.0
[1.1.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.1.0
[1.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.0.0
