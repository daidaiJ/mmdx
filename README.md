> [English](README.en.md) · 中文

# mmdx

[![Release](https://img.shields.io/github/v/release/daidaiJ/mmdx)](https://github.com/daidaiJ/mmdx/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**为 AI agent 打造的办公出图 CLI**：把 Markdown 里的 mermaid 与办公围栏（table / chart / kpi / compare / vs / funnel / task / progress / gauge / heatmap / swimlane …）批量渲染成 PNG——主题、中文字体、布局引擎、留白全部内置，不需要 MCP server、浏览器插件，产物机器上也不需要 Node。

![二十种图型渲染示例](tests/contact-sheet.png)

## 📖 文档导航

| 读者 | 文档 | 说明 |
|---|---|---|
| 🤖 AI Agent | [docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md) | 省 token 版：环境自检、选型表、参数速查、JSON 契约、错误速诊 |
| 👤 人类用户 | [docs/HUMAN_GUIDE.md](docs/HUMAN_GUIDE.md) | 易读版：安装部署、CLI 全参数、主题定制、性能调优、排障 |
| 🖼 扩展块 | [docs/EXTENSIONS.md](docs/EXTENSIONS.md) | 每种围栏一张工具渲染的 PNG + 语法 |
| 🎭 风格画廊 | [docs/GALLERY.md](docs/GALLERY.md) | 同一案例在八套主题下的流程图 / 饼图 / KPI / 卡片 / 表格对照 |
| 🧪 质量门禁 | [docs/QUALITY.md](docs/QUALITY.md) | 像素 lint 覆盖、已知盲区、发布前许可证清单 |
| 🖋 手绘 editorial 规格 | [skill/editorial/](skill/editorial/README.md) | vendored diagram-design 规格（MIT）：偶发封面 / 方案插图按其规格手绘 HTML，`mmdx file.html --scale 3` 导出 |
| 📃 叙事解释页规格 | [skill/explain/](skill/explain/README.md) | vendored visual-explainer 规格化改造版（MIT）：解释页 / 评审页 / recap / 幻灯片页用 starter 装配 HTML，同命令导出 |
| 📚 skill 参考速查 | [skill/references/](skill/references/) | 围栏语法、图型示例、主题与 Pele 配置、排障四篇按需读取 |
| 📜 变更历史 | [CHANGELOG.md](CHANGELOG.md) | 版本变更记录 |

各文档均为中文默认，同名 `.en.md` 为英文版。

## ✨ 核心特性

- **Pele 唯一引擎**：Obsidian 开源的 Mermaid→SVG 渲染器，单图 SVG 生成 1–50ms；输入仍是 Mermaid 语法（围栏 / `.mmd` / stdin），但只有这一条渲染路径，没有第二套布局引擎
- **CSS 变量主题**：Pele 把颜色/字体/圆角全部外置为 `--pele-*` 变量，`-f svg` 默认烘焙成 hex，`--svg-themeable` 保留可换肤 SVG；八套预设多数共用形状分色（蓝=流程、琥珀=判定、绿=状态、紫=存储；`zed` / `zed-light` 改为按读取顺序轮转 8 个 player 色）
- **字体全部随包**：通用黑体 Noto Sans SC、衬线 Noto Serif SC、楷体霞鹜文楷的 GB2312 子集，加上各主题的展示字体——Excalifont（手绘）、站酷快乐体 + Baloo 2（动森圆体）、Newsreader（电子纸衬线）、JetBrains Mono（等宽小字），合计约 7.3MB。主题字体栈只列随包家族，装没装系统字体不影响出图；`lint/theme-fonts` 守住「主题不得命名未随包的字体」，`scripts/subset-font.py` 记录子集口径与来源
- **像素级均匀留白**：每张图二次裁切到墨迹包围盒，四边留白对称是构造保证，不靠引擎不可靠的 viewBox
- **扩展块**：```table / ```list / ```card / ```chart / ```kpi / ```compare / ```vs / ```funnel / ```task / ```progress / ```gauge / ```heatmap / ```swimlane 直出 PNG
- **办公交付**：`--preset slide|a4|square|column`、图题/来源/单位 chrome、`--brand` 强调色；agent 友好的 `--json`（含 `warnings`）
- **整页 HTML 截图**：`mmdx page.html` 原样截图为 PNG（fullPage，只出 PNG）——系统 Edge、免 Playwright、保留页面自身样式/脚本/背景；配套 vendored 的 [diagram-design](skill/editorial/README.md) 规格可手绘 editorial 图再导出
- **figure lint**：`.html` 输入导出时自动体检 figure——越界（`figure-overflow`）、压字/压形（`figure-text-overlap`）、粘连（`figure-text-adhesion`）、有效字号 <11px（`figure-small-text`）、缺 caption（`figure-uncaptioned`）、缺 `aria-label`（`svg-aria-label`），消息带坐标进 `--json.warnings`
- **explain 叙事档**：`skill/explain/` 提供 instrument / blueprint / paper / editorial 四个 register starter（已内联 kit 设计系统与拉丁字体），复制 → 编辑页身 → `mmdx name.html --scale 3`

## 🚀 快速上手

```bash
# 方式 A：Release 二进制（windows x64，免 Node；渲染需系统自带 Edge/Chrome）
#   最新版：https://github.com/daidaiJ/mmdx/releases/latest
#   直链：  https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe

# 方式 B：动态运行时（需要 bun）
#   下载 mmdx-dynamic-<tag>.zip 解压后：
unzip mmdx-dynamic-v*.zip && cd mmdx-dynamic && bun install && bun run src/cli.ts --help

# 方式 C：克隆构建
bun run build && ./dist/mmdx-windows-x64.exe --help
```

### 浏览器依赖

渲染内核是真实 Chromium。Windows 10/11 **自带 Microsoft Edge**，因此二进制开箱即用；Chrome 也可。查找顺序 Edge → Chrome 常见安装路径，可用 `--browser <path>` 指定任意 Chromium。找不到时快速报错并列出搜索路径——**绝不下载 Chromium**。

### 30 秒出图

```bash
mmdx README.md                              # README-m1.(svg|png), README-m2.(png|svg) …
echo "graph LR; A-->B" | mmdx - -f svg      # stdin 单图
```

更多用法（多文件批量、精确命名、标题注入）见 [HUMAN_GUIDE 快速开始](docs/HUMAN_GUIDE.md#快速开始)。

渲染引擎固定为 Pele，没有 `--engine` / `--layout` 开关；围栏写法超出 Pele 支持范围时直接报 `Parsing error`（exit 1），按提示改写图型。`-f svg` 默认把主题烘焙成 hex，`--svg-themeable` 保留 `--pele-*` CSS 变量。

## 🖼 使用示例

```bash
mmdx a.md b.md other/*.md -o dist/          # 多文件批量，并行
mmdx diagram.mmd -o out/arch.svg            # 精确命名，同目录附带 .png
mmdx page.html -o out/page.png --scale 2    # 整页 HTML 原样截图（免 Playwright）
mmdx report.md --index 2 --title "架构总览" --title-pos bottom
mmdx doc.md -t tech --background transparent -f png --json
```

Markdown 围栏：`mermaid`（图表）以及 `table` / `list` / `card` / `chart` / `kpi` / `compare` / `vs` / `funnel` / `task` / `progress` / `gauge` / `heatmap` / `swimlane`（扩展块，PNG only）。贴 PPT 用 `mmdx doc.md --preset slide --title "…" --source "…"`。贴聊天/窄栏用 `--preset column`。独立 `.html` 文件整页截图（保留页面自身样式与背景，内嵌中文字体兜底 CJK），见 [HUMAN_GUIDE](docs/HUMAN_GUIDE.md#html-整页截图)。

**卡片墙** —— ```card 围栏，约定语法：每行一张卡，`emoji | 标题 | 描述`（emoji 与描述可省略）：

```card
🚀 | 渲染管线 | 单浏览器页池复用，PNG 2x 无损导出
🎨 | 主题系统 | 八套预设，支持 theme-js、tone 与 css 自定义
```

![卡片渲染示例](docs/ext-card.png)

## 🎨 主题

| | |
| --- | --- |
| `tech`（默认） | 大厂方案文档风：白底、形状分色、细边框、正交连线 |
| `openai` | 近单色工程风：纯白底、墨黑文字、薄荷绿（teal）点缀、发丝边框；块页配 `--tone paper` 得到衬线标题与 16px 圆角 |
| `excalidraw` | 手绘：粉彩填色 + 墨线抖动（rough.js），Excalifont/LXGW；块版式为白板卡片 |
| `ios` | iOS 系统界面：**纯平面**分组浅灰底 + 白卡片 + 发丝分隔线 + 系统色（蓝 `#007AFF` / 绿 / 橙 / 紫）、12px 圆角；卡片按 iOS 分组列表做法不加强调色边条，不画底、不加投影 |
| `acnh` | 动森：奶油纸 + 粗棕描边 + 硬偏移贴纸阴影 + 圆体字、胶囊标签；块页带点阵纸纹 |
| `epaper` | 电子纸 / 墨水屏：`#F5F1EB` 纸底 + 纸纹颗粒 + `#1A1A1A` 发丝黑描边、直角、无阴影、无强调色，形状族用灰阶与形状区分；块页同纸底 + 墨线卡片 + 等宽大写表头 |
| `zed` | Zed 编辑器暗色（One Dark）：`#282C33` 画布、发丝线、无投影无底纹；flowchart / class / state 节点按 Zed 的 `node_counter % 8` 轮转 8 个 player 色（描边取色、填充同色 15% 混页面底色），所以是多色轮转而非形状分色 |
| `zed-light` | 同上取 One Light（`#FAFAFA` 画布 + `#EBEBEC` 编辑器面板）；两套是主题集合里唯一的暗色 / 亮色编辑风一对 |

`excalidraw` 默认实心填色；需要斜线填色时加 `--style-fill hachure`（体积约 1.5–2×，PPT 可读性优先时保持默认）。

`acnh` / `epaper` 都自带底：SVG 里插一层 `mmdx-backdrop`（`acnh` 是奶油纸 + 点阵网格，`epaper` 是纸底 + 纸纹颗粒），PNG 整幅截取不裁边，所以 SVG 和 PNG 观感一致。`ios` 是纯平面风格，不画底也不加投影。传 `--background transparent` 时不画底。

`--tone paper|neutral|product` 改块版式的结构（圆角、阴影、标题字体、表格头）；`paper` 另把图的配色换成编辑风纸底墨线（`#FAFAF8` 灰白纸 + 24px 细格线 / 96px 粗格线 + 焦橙强调色 `#BF4520`），块页用同一张网格纸，`neutral` / `product` 不动图的配色。信息卡是独立 skill [`info-card-designer`](skill/info-card-designer/SKILL.md)，把同一套主题和 tone 用到 Markdown/网页正文：

```bash
mmdx card --in note.md -t openai --tone neutral --width 600 -o note-card.png
mmdx card --url https://example.com/post -t openai --tone paper
```

叠加顺序：预设 → `--brand` → `--theme-js` → `--config` → `--css`。v2 的 `--theme-js` 接收 `ThemeSpec`（`theme.vars` / `theme.shapes` / `theme.css`），示例见 [HUMAN_GUIDE 主题定制](docs/HUMAN_GUIDE.md#主题定制)。

主题色板还有无障碍硬门槛（正文色 ≥7:1、次要文字 ≥4.5:1、形状描边对底与对自己的填充各 ≥3:1、红绿色盲模拟下形状族仍可区分，且四个形状族本来就是四种形状）：改色板后跑 `node --experimental-transform-types --no-warnings scripts/lint-a11y.ts`。

## 🖋 手绘 HTML 与 explain

`mmdx page.html --scale 3` 是手绘 HTML 的统一出口：页面原样截图，自身样式/脚本/背景保留，中文由内置三家族兜底。两条 vendored 规格（MIT）按档位挂载：

| 档位 | 规格 | 用法 |
| --- | --- | --- |
| editorial 封面 / 方案插图 | [skill/editorial/](skill/editorial/README.md)（diagram-design） | 按其总则 + `references/type-*.md` 手写自包含 HTML → `mmdx name.html --scale 3` |
| 叙事解释页 / 评审页 / recap / 幻灯片页 | [skill/explain/](skill/explain/README.md)（visual-explainer 规格化改造版） | 复制 `skill/explain/kit/starter-<register>.html`（instrument / blueprint / paper / editorial）→ 编辑页身 → `mmdx name.html --scale 3` |

starter 已内联 kit 设计系统与该 register 的拉丁字体，head 不用动；页内 mermaid 用 `mmdx - -f svg` 预渲后原样内联。导出时自动跑 figure lint，按 `--json.warnings` 修到清零再交付。starter 的生成脚本 `scripts/explain-starter.ts` 依赖 bun 的 `import.meta.dir`，仅在重新生成 starter 时需要。

## 🎭 风格画廊

同一个「灰度发布复盘」案例，只换 `-t` 就能切换 `tech`、`openai`、`excalidraw`。主页留一张流程图做简单对比：

[![同一案例在八套主题下的流程图](docs/gallery/overview.png)](docs/GALLERY.md)

另见 [两个 HTML 场景模板](docs/gallery/html-skills.md)（报告卡与信息卡跨风格对照）、[手绘 HTML 模板](docs/gallery/vendored-html.md)（v1.4.2 的 editorial / visual-explainer）与 [信息卡 tone 对照](docs/gallery/card-tones.md)（paper / neutral / product）。

完整五场景（流程图 / 饼图 / KPI / 卡片 / 表格）按风格拆到独立页，选型建议和复现命令见 [docs/GALLERY.md](docs/GALLERY.md)。

## ⚡ 管线与性能

单 Chromium + 页面池 + 有界 worker；`--profile` 可观测：

```
browser-launch  ~0.5s ×1      pele-render     ~26ms ×图
page-init       ~1.0s ×页     screenshot      ~90ms ×图（含像素级二次裁切）
```

- 只有一个引擎资源：Pele bundle（~700KB）懒注入；二进制不再内嵌 Mermaid（~3.5MB）与 ELK（~5MB）bundle
- 截图跨页面串行化（headless Chrome 只服务活动 tab）+ 视口按内容适配，2x 高清单图仍在 ~100ms 量级
- 渲染卡死 60s 必然报错而不是挂住整批；每个图自动重试一次
- PNG 为 2x 无损（典型架构图 20–80KB）；SVG 经 svgo 压缩——二进制内嵌 svgo 官方 browser 构建（自包含 ESM），压缩后的 SVG 与 PNG 一样开箱即得

调优手段（并发、视口、缩放）见 [HUMAN_GUIDE 性能调优](docs/HUMAN_GUIDE.md#性能调优)。

## 🧪 测试

`bun run tests/run.ts`，四层设计——视觉审查只看脚本标记出的可疑项：

1. **库级筛查**：20 种 mermaid 图型 + 表格/列表/卡片，单浏览器会话渲染后做像素分析（边距对称 ±8px、内容占比、底部空白、白图检测）
2. **CLI 行为**：退出码、`--index` 命名、坏块隔离、stdin、JSON 契约、`.html` 输入的 figure lint 告警、多文件 4 并发批次
3. **信息卡**：Markdown/网页提取、宽度、实际像素分页、tone 结构差异
4. **视觉 lint**：DOM 溢出/越界/图题重叠、SVG 标签溢出、渲染态对比度、PNG 边缘裁切、双跑确定性；规则见 [docs/QUALITY.md](docs/QUALITY.md)

## License

[MIT](LICENSE)。第三方组件、字体和设计参考的许可证与来源见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
