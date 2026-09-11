> [English](CHANGELOG.en.md) · 中文

# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 办公出图

- 新增画幅预设 `--preset slide|a4|square`（未显式 `-f` 时默认 PNG；`slide` 加大节点字号与间距，底栏预留安全区）
- 新增图题层 `--title` / `--subtitle` / `--source` / `--unit`，印在 PNG chrome 上（mermaid 与扩展块共用）。**Breaking：** `--title` 不再写入 mermaid frontmatter
- 新增 `--brand <hex>`：只改扩展块 accent；flowchart 形状分色保持；低对比警告不阻断
- 新增 `--strict-chart` 与 `--json.warnings`：pie / xychart / radar / flowchart / sequence 预算软护栏
- 新增围栏：```chart ```kpi ```compare ```funnel ```task ```progress ```swimlane
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

[1.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.0.0
