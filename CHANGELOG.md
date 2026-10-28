> [English](CHANGELOG.en.md) · 中文

# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [2.0.0] - 2026-10-23

### 渲染引擎

- **默认引擎改为 Pele 1.9.0**（`obsidianmd/pele`）：Mermaid 语法直出 SVG，单图 SVG 生成 1–50ms；Mermaid 11 + ELK 保留为 `--engine mermaid` 回退，二进制同时内嵌两套资源
- 新增 `--engine pele|mermaid|auto`；`auto` 先 Pele，解析失败回退 Mermaid，`--json` 输出 `fallbacks`
- 新增 `--svg-themeable`：SVG 保留 `--pele-*` CSS 变量；默认把颜色烘焙成 hex，便于 Office/PPT 打开
- `--layout elk` 现在只属于 Mermaid，传它会自动选中 `--engine mermaid`；显式 `--engine pele --layout elk` 报参数冲突
- PeleError 直接映射为 exit 1，错误信息带 `--engine mermaid` / `--engine auto` 提示

### 主题（Breaking）

- 主题改为 CSS 变量契约：7 套预设统一输出 `--pele-*` 变量与 `pele-shape-*` 形状规则；PNG、SVG、HTML 扩展块共用同一色板
- **Breaking：** `--theme-js` 改为 v2 签名 `(theme) => theme`，接收 `ThemeSpec`（`vars` / `shapes` / `css`）；1.x 的 `config.themeVariables` 脚本报迁移错误
- **Breaking：** `--config` 改为 Pele 白名单（`fontSize` / `padding` / `flowchart.nodeSpacing` / `rankSpacing` / `padding`），`themeVariables` 等 key 给 `config-ignored` 警告
- **Breaking：** `sketch` 保留暖纸色和手写字体，形状改为干净圆角；Pele 不绘制手绘抖动线条
- `--brand` 继续只改 `theme.vars.accent`，低对比度警告保留
- `--title-pos bottom` 只对 Mermaid 回退生效；Pele 的 frontmatter 标题固定在图内顶部，底栏标题请用 `--title`
- Iconify `--icon` 通过 Pele `icons` 回调注入，图标按 24×24 视图缩放

### 管线与产物

- 引擎 bundle 改为按需注入：Pele ~700KB；Mermaid（3.5MB）和 ELK（7MB）只在回退时解析
- 二进制体积增加约 0.7MB（保留 Mermaid 回退），不再移除 mermaid/ELK 资源
- 测试新增引擎/主题契约：Mermaid 回退、auto 回退、flat/themeable SVG、theme-js v2、v1 迁移错误、config 警告
- 文档与 skill 同步到 v2：HUMAN_GUIDE / AGENT_GUIDE / README / SKILL.md 增加引擎语义、迁移表和排障项

## [Unreleased]

- **Breaking：** 引擎收敛为 Pele 一套：移除 `--engine pele|mermaid|auto`、`--layout elk|dagre` 与 `--json` 的 `fallbacks` 字段，并移除 `mermaid` / `@mermaid-js/layout-elk` 依赖及随包资源（约 3.5MB 的 mermaid.min.js 与 5.0MB 的 elk.bundle.mjs）。输入语法仍是 Mermaid（围栏 / `.mmd` / stdin），`--json` 的 `engine` 固定为 `pele`；遇到 Pele 解不了的图型不再有回退引擎
- **Breaking：** 主题收敛为三套预设：`tech`（默认）/ `openai` / `excalidraw`；移除 `openai-dark`、`openai-editorial`、`vercel`、`linear`、`stripe`、`notion`、`ibm`、`minimal`、`latte`、`mocha`、`sketch` 共 11 套。旧命令里的主题名现在按 `unknown theme` 报错，可用主题见 `--help`
- 新增 `--tone paper|neutral|product`：只覆盖块页结构（圆角/阴影/标题字体/表格头/chip 圆角），配色仍由主题决定；显式传参才生效，不传时输出不变
- 新增 `mmdx card`：Markdown 或 URL → 信息卡 PNG；默认主题 `openai`，配合 `--tone`、480/600/900+ 宽度、按实际像素高度自动拆页、`--json` 输出 `cards`/`files`/`pages`
- 画廊新增[两个 HTML 场景模板](docs/gallery/html-skills.md)与[信息卡 tone 对照页](docs/gallery/card-tones.md)；`scripts/make-gallery.ts` 同步生成三套主题的流程图/KPI/卡片、报告卡/信息卡的跨风格图与三种 tone
- skill 增加“场景 → 主题 / tone / preset”推荐表，并为 HTML 报告卡与信息卡给出主题组合；新增独立 skill `skill/info-card-designer/`
- 画廊补回 v1.4.2 的 `editorial` / `visual-explainer` 手绘 HTML 原始样张与当前主题近似映射；skill 增加手绘 HTML 模板的特点与适用场景
- 视觉 lint 增加 SVG 标签溢出（屏幕矩形对形状矩形）、真实渲染文本对比度（fill 对实际背景，3:1）、PNG 边缘裁切；确定性检查覆盖全部内置主题（含手绘抖动的 Excalidraw）
- 测试新增信息卡解析/网页提取/宽度/分页/tone 差异，以及三套主题的 4 类图与块版式审计
- 新增 `excalidraw` 主题：Pele + rough.js 手绘线条、粉彩填色、Excalifont/LXGW 字体栈；块版式改为白板卡片；`--style-fill solid|hachure` 切换填色
- `ThemeSpec` 增加 `style` / `blockCss` / `fonts`；扩展块可通过 `blockCss` 使用主题级版式
- `peleCss` 为启用 `shapeCoverage` 的主题补齐 rounded/stadium/fr-rect/hex/lean-r/odd、class/entity、state 起止等形状覆盖；旧主题保持原输出
- 新增 `scripts/make-style-review.ts`：生成 `review/styles/` 三套主题的图表与块版式预览
- 新增 [风格画廊](docs/GALLERY.md)：同一「灰度发布复盘」案例在 `tech` / `openai` / `excalidraw` 下的流程图、KPI、卡片、表格对照；总览只留一张流程图，完整四场景按风格拆页；`scripts/make-gallery.ts` 一键复现，README 已引用
- 视觉 lint 增加底部长空白规则（`max(90px, 5% × 高度)`）与超长列表 fixture，防止截屏把视口高度写进 PNG；新增 [质量门禁规划](docs/QUALITY.md)
- 新增 `src/lint.ts`：DOM 几何审计（根/文本溢出、元素越界、图题重叠）、`diffPng` 双跑确定性对比、主题对比度门禁；参考 Playwright / jest-image-snapshot / reg-suit / Mermaid 的视觉回归策略
- 块页面与图表截图统一关闭动画/过渡/光标，并等待内置字体加载，减少跨机器与跨次渲染差异
- 新增 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 `licenses/`：列明 Pele / Mermaid / ELK / rough.js / svgo / puppeteer-core / Noto Sans SC 等来源与许可证，README 已链接
- 日历热力改成办公卡：格子随周数放大、空天可见、中文日期与月标、有值格子写次数
- `tech` 默认主题：形状分色改为可见填色 + 1.5px 描边，连线/饼图/色板加饱和；默认 accent `#2563EB`
- `--preset slide` 字号 18、描边加粗；skill / AGENT_GUIDE 增加投屏/PPT 导出引导（触发词 → 命令 → 5 米自检）

## [1.4.2] - 2026-10-25

- **新增 explain 叙事档**：vendored [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer)（10.6k★，MIT，commit `5f37886` v0.14.0）**规格化改造版**进 [skill/explain/](skill/explain/README.md)——多图叙事解释页 / diff·plan 评审页 / recap / 幻灯片页；上游 renderer 一个文件不随附（路线 D：让 visual-explainer 适配 mmdx，渲染零新增、mmdx 代码零改动），`kit/*.mjs` 运行时、`plan/`、`pptx/`、`video/`、`mcp/` 全部排除，references 与 kit 资产原文保留；调研与论证见 [docs/research-visual-explainer.md](docs/research-visual-explainer.md)
- explain 用法三步：复制 `kit/starter-<register>.html`（4 register：instrument/blueprint/paper/editorial，已内联 kit.css + defs + 该 register 全部拉丁字体，[scripts/explain-starter.ts](scripts/explain-starter.ts) 生成）→ 编辑 main → `mmdx name.html --scale 3`；kit 资产不进 LLM 上下文；页内 mermaid 用 `mmdx - -f svg` 预渲后原样内联（**不要**给内联 svg 加第二个 style 属性，会因 HTML 重复属性丢弃 `--pele-*` 主题变量全图变黑）；steppers/replay/ve-ask 等 JS 交互态禁用（无 JS 时是幽灵态）
- **中文三字体家族**：exe 内嵌 Noto Serif SC（可变字重，2.6MB）与霞鹜文楷（1.6MB）GB2312 子集，与 Noto Sans SC 并列注入 HTML 页导出——serif 栈中文自动落宋体（修掉「黑体顶 serif 栈」断档）、手绘标注显式 `'LXGW WenKai'` 楷体；`serif` 泛型的 CJK 兜底 alias 换绑宋体文件；围栏/mermaid 路径维持仅黑体（避免批量渲染注入未用字体）；Latin 字体包（Geist/IBM Plex/Newsreader/Atkinson/Instrument/JetBrains，153KB，全 OFL 随附）由 starter 预嵌 data-URL @font-face，explain 页离线全 register 一致
- **figure lint（`file.html` 输入）**：导出时自动检查 figure svg——caption/aria 口径吸收自上游 render 闸门，几何检查（viewBox 越界带方向与像素、文字压形/压字、**粘连**间距 < max(4px, 字高×35%)、有效字号 <11px）为手绘场景新增；LSP 式消息带图号/文本/viewBox 坐标；豁免策略防假告警：同组标签、骑线 halo/chip 标签对线豁免对框不豁免、大框居中标签、隐藏文本与 <24px² sliver；结果进 `--json.warnings`（`figure-overflow` / `figure-text-overlap` / `figure-text-adhesion` / `figure-small-text` / `figure-uncaptioned` / `svg-aria-label`，处置表见 skill troubleshooting.md）
- 根 SKILL.md：场景分级新增**叙事档**、按需加载与适用边界挂载 explain/；editorial README「简中手绘实践要点」修订（serif 标题与楷体标注现已离线可用，几何自检交给 lint）
- 端到端实证：paper register 中文解释页（宋体标题/黑体正文/楷体旁注/手绘机制图/waffle+bars 手写展开/页内 mermaid 预渲）lint 清零 + 视觉 QA 通过；负样本（越界/压字）三条全中；既有测试 94/94 通过（fixture：tests/explain-e2e/）

## [1.4.1] - 2026-10-25

- Release 新增 `mmdx-skill-<tag>.zip` 产物：skill 目录 + 内嵌 windows-x64 CLI（`bin/mmdx.exe`）一步到位，解压后把包内内容整体拷进 agent 的 skills 目录（`~/.qwen/skills/mermaid/` 等）即完成 skill 安装，附 `INSTALL.md`（安装路径示例、CLI 验证、非 Windows 指向 dynamic 包）；README 快速上手新增方式 D（中英同步）
- skill `references/recipes.md` 新增特殊画法「对照式 timeline（事件 vs 对策）」：每时期固定两行（事件 / 处置）的阶段对照叙事，比 flowchart 平行双链省节点预算且无交叉连线，附已验证示例与 `--source "© id"` 署名水印用法
- skill `editorial/README.md` 新增「简中手绘实践要点（mmdx 语境）」：简中标题/callout 落 sans（`'Noto Sans SC'` 渲染时已注册、离线可靠；serif 标题离线不保证）、sublabel 保持 Latin mono、署名水印两种做法（围栏 `--source` / 手绘页脚 `<text>`）、4px 网格纪律
- skill `SKILL.md` 新增 §1e「回哺：新画法沉淀」：Agent Loop 自检后增加回哺步——渲染出可复用的新写法模式时建议沉淀进 recipes/fences，条目格式照抄、示例须实渲染验证，并**同步维护「按需加载」索引**；顺手把 v1.4.1 新增的「对照式 timeline」补进索引清单（修复入库不动索引的欠账）

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

[2.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v2.0.0
[1.1.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.1.0
[1.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.0.0
