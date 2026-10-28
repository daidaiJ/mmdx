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
