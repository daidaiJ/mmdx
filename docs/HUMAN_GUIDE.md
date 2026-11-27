> [English](HUMAN_GUIDE.en.md) · 中文

# HUMAN_GUIDE — 安装 · 配置 · 调优 · 排障（人类阅读版）

本指南面向**人类用户**，覆盖 mmdx 的安装部署、CLI 全参数、主题定制、性能调优与问题排查。给 AI Agent 看的省 token 版见 [AGENT_GUIDE.md](AGENT_GUIDE.md)；项目概览见 [README](../README.md)。

## 目录

- [安装部署](#安装部署)
  - [方式 A：Release 二进制（推荐）](#方式-a-二进制推荐)
  - [方式 B：动态运行时](#方式-b-动态运行时需要-bun)
  - [方式 C：克隆构建](#方式-c-克隆构建)
  - [浏览器依赖](#浏览器依赖)
- [快速开始](#快速开始)
- [交互式编辑 / 手动微调](#交互式编辑--手动微调)
- [CLI 全参数参考](#cli-全参数参考)
- [扩展块](#扩展块)
- [HTML 整页截图](#html-整页截图)
- [主题定制](#主题定制)
- [性能调优](#性能调优)
- [排障](#排障)
- [测试](#测试)

---

## 安装部署

### 方式 A：二进制（推荐）

从 [Release 页面](https://github.com/daidaiJ/mmdx/releases/latest) 下载 `mmdx-windows-x64.exe`，单文件、免 Node 运行时，放到 PATH 里或直接用完整路径调用：

```bash
# 直链下载
curl -L -o mmdx.exe https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe
./mmdx.exe --version
```

GitHub CDN 超时时给命令加代理前缀（如 `HTTPS_PROXY=... curl ...`）。

### 方式 B：动态运行时（需要 bun）

下载 Release 里的 `mmdx-dynamic-<tag>.zip`，解压后用 bun 直接跑源码（改主题、调渲染逻辑时方便）：

```bash
unzip mmdx-dynamic-v*.zip && cd mmdx-dynamic
bun install
bun run src/cli.ts --help
```

### 方式 C：克隆构建

```bash
git clone https://github.com/daidaiJ/mmdx.git && cd mmdx
bun install
bun run build          # 产物在 dist/mmdx-windows-x64.exe
```

### 浏览器依赖

渲染内核是**真实 Chromium**（puppeteer-core 驱动），mmdx 自己不打包浏览器、也**绝不下载 Chromium**：

- Windows 10/11 自带 Microsoft Edge，二进制开箱即用；Chrome 同样可用
- 查找顺序：Edge → Chrome 的常见安装路径（注册表 + 默认目录）
- 非标准安装位置或想用其他 Chromium：`--browser "C:\path\to\msedge.exe"`
- 找不到时快速报错并列出全部搜索路径，不会挂住

## 快速开始

```bash
mmdx README.md                              # README-m1.(svg|png), README-m2.(svg|png) …
mmdx a.md b.md other/*.md -o dist/          # 多文件批量，并行
mmdx diagram.mmd -o out/arch.svg            # 精确命名，同目录附带 .png
echo "graph LR; A-->B" | mmdx - -f svg      # stdin 单图
mmdx report.md --preset slide --title "架构总览" --unit 万元 --source 月报
mmdx doc.md --preset column                 # 聊天/窄栏正文（800px@2）
mmdx doc.md -t tech --background transparent -f png --json
mmdx doc.md --brand #E4572E --preset square
mmdx doc.md --list                          # 只列出找到的围栏块，不渲染
```

四种输入形态：

| 输入 | 行为 |
|---|---|
| `.md` 文件 | 渲染其中所有 ```mermaid 与扩展围栏（table/list/card/chart/kpi/compare/funnel/task/progress/swimlane/gauge/vs/heatmap） |
| `.mmd` 文件 | 渲染单个 mermaid 图 |
| `.html` / `.htm` 文件 | 整页原样截图为 PNG（fullPage，只出 PNG），见 [HTML 整页截图](#html-整页截图) |
| `-`（stdin） | 从标准输入读单个 mermaid 图 |

输出命名：默认与输入同目录，`<名字>-m<N>.svg/.png` 按块序号编号；`-o` 指定输出目录；输入只含一个图时 `-o` 可以是精确文件名。

## 交互式编辑 / 手动微调

当你想「手动改一下这张图」「交互式出图 / 渲染」「AI 出初稿、我来微调」时，用本地浏览器画布：

```bash
mmdx edit docs/arch.md --index 2 -t openai   # Markdown 里的第 2 个图块
mmdx edit diagram.mmd --project .mmdx/arch   # 单图 / 指定工程目录
```

浏览器打开后可以框选 / 多选、移动、8 手柄缩放、双击改字、改节点填充 / 描边 / 文字色；选中连线可改颜色、粗细、线型、箭头，并切换走线算法（自动 / 折线 / 直线 / 曲线）、拖两端锚点或拖到另一个节点重连；侧栏可即时切换八套主题，画布背景 / 网格 / 透明底 / 主题底纹也可调。支持撤销重做、SVG 下载、2× PNG 导出；PNG 按钮旁的质量下拉提供「自动均衡 / 质量 / 快速」三档，默认跟随启动时的 `--png-quality`，每次导出单独生效。导出的 SVG / PNG 自带图片元信息（时间、标题、主题、版本、作者与版权），启动 `mmdx edit` 时可用 `--author` / `--copyright` / `--meta` 定制。

工程写在源文件旁的 `.mmdx/<slug>/`（`draft.svg` / `working.svg` / 场景 JSON），自动保存；重开恢复工作稿，「还原初稿」丢弃人工修改但不改 Markdown。服务只监听 `127.0.0.1`，URL 带随机 token。Phase 0 支持 flowchart / state；新增节点、新建连线与 class / ER / sequence 暂未覆盖。

## CLI 全参数参考

| 参数 | 说明 |
| --- | --- |
| `-o, --out <path>` | 输出目录；单图输入时可为精确文件名（默认与输入同目录） |
| `-f, --format <fmt>` | `svg` \| `png` \| `both`（默认 both；`--preset` 未显式 `-f` 时默认 png） |
| `-t, --theme <name>` | `tech`（默认）· `openai` · `excalidraw` · `ios` · `acnh` · `epaper` · `zed` · `zed-light` |
| `--tone <name>` | `paper` \| `neutral` \| `product`；改块版式结构（圆角/阴影/标题字体/表格头），`paper` 另把图的配色换成灰白纸底 + 网格线 |
| `--style-fill <mode>` | `solid`（默认）\| `hachure`；仅 `excalidraw` 生效 |
| `--preset <name>` | `slide`（投屏/PPT：1600px@2，字号 18、描边加粗，底栏预留 ~80px）\| `a4`（900px@2）\| `square`（1080px@2）\| `column`（聊天/窄栏：800px@2，2K 屏约 1/3 栏宽，字号 18、标签换行 200px）。显式 `--width`/`--scale`/`-f` 优先 |
| `--background <color>` | 页面背景，如 `white` \| `transparent` \| `#1A1A1A`（需要深色页面时显式传） |
| `--svg-themeable` | SVG 保留 `--pele-*` CSS 变量；默认烘焙成 hex，便于 Office/PPT 打开 |
| `--scale <n>` | PNG 缩放倍数（默认 2） |
| `--png-colors <mode>` | `auto`（默认）按主题质量门槛自动选调色板；`near` 是任意 HTML 截图的低损档（256 色，约 34.5 dB，渐变不达标时回退无损）；`off` 不量化（仍做无损重压缩）；`2..256` 固定调色板色数 |
| `--png-quality <tier>` | `fast` \| `balanced`（默认）\| `best`；无损重滤波与量化的速度 / 质量档位，见下文 |
| `--width <px>` | 布局视口宽（默认 1200；Pele 作为 `maxWidth`，不自动翻转方向） |
| `--title <text>` | 图题（印在 PNG chrome 上，不再写入 mermaid frontmatter） |
| `--subtitle <text>` | 副标题 |
| `--source <text>` | 来源（底栏） |
| `--unit <text>` | 单位（底栏） |
| `--title-pos <pos>` | `top`（默认）\| `bottom`（chrome 标题在主图上方/下方） |
| `--meta <key=value>` | 图片元信息，可重复；已知 key：`title` / `author` / `copyright` / `created` / `software` / `version` / `theme` / `tone` / `source` / `description`，其余按自定义 key 写入。值可为 UTF-8；空值删除该字段 |
| `--author <text>` | 元信息作者，等价 `--meta author=...`；不传则不写 Author |
| `--copyright <text>` | 元信息版权；默认 mmdx 项目版权，可改为你的项目版权 |
| `--no-meta` | 不写入任何图片元信息 |
| `--index <n[,n…]>` | 只渲染这些 1-based 块序号 |
| `--brand <hex>` | 扩展块强调色（默认 `#2563EB`；可写 `2563EB`）；不重涂 flowchart 形状分色。投屏请用深色，避免浅蓝 |
| `--strict-chart` | mermaid pie/xychart/radar/flowchart/sequence 超限当错误（默认只警告） |
| `--icon <pack>` | iconify 图标包，支持 `A@{icon: logos:react}` 节点（可重复传；拉取后有缓存） |
| `--config <file.json>` | Pele 白名单：`fontSize` / `padding` / `flowchart.nodeSpacing` / `rankSpacing` / `padding`；其他 key 报警告 |
| `--theme-js <file.js>` | v2 换色函数：`(theme, ctx) => theme`，theme 是 `ThemeSpec`（`vars` / `shapes` / `css`） |
| `--css <file.css>` | 追加 CSS 到主题样式之后（选择器用 Pele 类名） |
| `--browser <path>` | 浏览器可执行文件路径（默认自动探测 Edge/Chrome） |
| `--jobs <n>` | 并行渲染数（默认 2；单浏览器页池，别开太高） |
| `--profile` | 各阶段耗时汇总（browser-launch / page-init / init-pele / pele-render / screenshot / svgo） |
| `--list` | 列出找到的围栏块后退出，不渲染 |
| `--json` | stdout 输出单份 JSON（files + errors），便于程序化核对 |
| `-q, --quiet` | 抑制 stderr 进度行 |
| `-h, --help` / `-v, --version` | 帮助 / 版本 |

退出码：`0` 成功 · `1` 有渲染失败（其余块照常出图）· `2` 用法错误。

`--json` 输出契约：

```json
{
  "theme": "tech", "engine": "pele", "format": "png", "background": "#FFFFFF",
  "preset": "slide", "brand": "#E4572E",
  "caption": { "title": "Q1 销售构成", "subtitle": null, "source": "财务月报", "unit": "万元" },
  "blocks": 3, "rendered": 3, "failed": 0,
  "files": ["doc-m1.png", "…"],
  "errors": [],
  "warnings": [{ "input": "doc.md", "index": 1, "code": "pie-sectors", "message": "…" }],
  "profile": { "pele-render": { "count": 3, "totalMs": 78, "avgMs": 26, "maxMs": 40, "maxLabel": "doc#2" } }
}
```

（`preset`/`brand`/`caption` 仅在使用对应参数时出现；`engine` 恒为 `"pele"`；`warnings` 始终为数组；`profile` 仅在同时传 `--profile` 时出现。）

### PNG 调色板压缩

PNG 默认走调色板量化：按出现次数加权聚类颜色，再按主题的实测门槛从 128 / 160 / 192 / 224 / 256 色中挑最小的一档。门槛由固定语料（8 套主题 × flowchart / state / class / ER / pie / xychart / mindmap / sequence / table，共 72 张 2x 图）标定，标准是文字/描边边缘的 p99 Oklab 色差 ≤0.035，全局 PSNR 统一不低于 53 dB（`fast` 档放宽 1.5 dB）；没有候选能过门槛或索引文件不更小时保留原始 RGBA，不硬压。`balanced` 档总输出为原始体积的 41.2%，最差 p99 边缘 ΔE 0.035。逐主题门槛与复跑方法见 [QUALITY.md](QUALITY.md#png-调色板量化门槛实测)。

| 值 | 行为 |
| --- | --- |
| `auto`（默认） | 按主题自动选色数，质量不达标就回退 RGBA |
| `off` | 不量化；截图仍先做无损重压缩（全不透明时去掉 alpha，颜色不变） |
| `2..256` | 固定调色板色数；显式覆盖质量门槛，色数越少体积越小 |

| 档位 | 做法 | 总输出 | 最差 p99 边缘 ΔE | 中位耗时 |
| --- | --- | --- | --- | --- |
| `fast` | 2048 色采样、3 轮迭代、3 个候选色数、全局 / 边缘门槛 -1.5 dB | 40.9% | 0.040 | 49 ms |
| `balanced`（默认） | 8192 色采样、10 轮迭代、5 个候选色数、标定门槛 | 41.2% | 0.035 | 69 ms |
| `best` | 16384 色采样、10 轮 ×2（稀有颜色反馈）、色数下限 160、边缘门槛 +0.5 dB（全局保持 53 dB） | 41.8% | 0.033 | 81 ms |

同一色数下三档的 PSNR 差 <0.15 dB——k-means 已收敛，档位差异主要来自候选色数与门槛。`fast` 适合批量预览，`best` 适合交付物，默认 `balanced`。

透明底（`--background transparent`）会写 `tRNS`；`--scale`、`--preset`、`mmdx card` 与 `mmdx edit` 的 PNG 导出走同一套逻辑。`--profile` 会多一行 `png-quant`，显示色数与 PSNR。编辑器的 PNG 导出在按钮旁有「自动均衡 / 质量 / 快速」下拉，默认取启动时的 `--png-quality`，每次导出的档位写进请求并由 `X-Mmdx-Png-Quality` 响应头回显。

### 图片元信息

每张 PNG / SVG 默认带一组元信息，便于资产管理和 agent 追踪来源：

| 字段 | 默认 / 来源 |
| --- | --- |
| `Title` | `--title` / 块 frontmatter 标题 / 输出文件名（如 `flowchart-m1`） |
| `Author` | `--author` 或 `--meta author=...`；不传则不写 |
| `Copyright` | `--copyright`；默认 `Copyright © 2026 daidaiJ`（mmdx 项目） |
| `Creation Time` | 当前 UTC 时间；`--meta created=2026-01-02T03:04:05Z` 可固定 |
| `Software` / `Version` | `mmdx <version>` / `<version>` |
| `Theme` / `Tone` | 当前主题 / `--tone`（有则写） |
| `Source` | 输入文件或 URL |
| 自定义 | `--meta key=value`，可重复 |

PNG 用标准文本块：值只含 Latin-1 时写 `tEXt`，含中文等 UTF-8 时写 `iTXt`；写入发生在调色板量化之后。SVG 写 RDF/Dublin Core `<metadata>`（`dc:title` / `dc:creator` / `dc:rights` / `dc:date` / `xmp:CreatorTool` / `mmdx:theme` 等），写入发生在 svgo 之后，不会被压缩掉。`mmdx card` 的 PNG 与 `mmdx edit` 的 SVG/PNG 导出使用同一套字段；编辑器的 SVG 导出经 `/api/export/svg` 加元信息。

```bash
mmdx doc.md --title "架构总览" --author "张三" --copyright "© 2026 Acme" \
  --meta project=支付平台 --meta description="Q4 架构评审"
mmdx doc.md --meta created=2026-01-02T03:04:05Z --meta author=
mmdx card --in note.md --author "平台工程组" --copyright "© 2026 Acme"
mmdx doc.md --no-meta
```

`--meta` 的 key 限 Latin-1 可打印字符（PNG 关键字约束），值可写中文；空值会删除该字段，例如 `--meta author=` 不写作者。PNG 可用 `exiftool image.png` / `magick identify -verbose` 查看，SVG 直接搜 `<metadata>`。

## 信息卡（mmdx card）

把 Markdown 或网页正文排成可贴进飞书/PPT 的信息卡。`--theme` 选配色，`--tone` 选结构，`--width` 选 480/600/900 等画幅；超过 `--max-height`（默认 1200 CSS px）会自动拆成多张。

```bash
mmdx card --in note.md -t openai --tone neutral --width 600 -o note-card.png
mmdx card --url https://example.com/post -t openai --tone paper --json
```

`--json` 输出 `cards`、`files` 和每张的像素尺寸。`--url` 只做轻量正文提取（`article` / `main` / `body` 优先），需要登录或强 JS 的页面请先保存为 Markdown。

## 扩展块

除 mermaid 图外，常见 Markdown 结构可直接渲染成样式化图片。扩展块**只出 PNG**——HTML 排版没有可移植的 SVG 形态。均吃 `--title`/`--subtitle`/`--source`/`--unit` 图题层，配色走 `--brand` 的 accent。

语法、上限与每种一张样图见 **[扩展块图鉴](EXTENSIONS.md)**。

## HTML 整页截图

`file.html` 作为输入时，整页 HTML **原样截图为 PNG**（fullPage，只出 PNG）：保留页面自身的样式、脚本与背景，`--width` 是布局视口（页面显式 `body` 宽度更窄时以 body 为准），`--scale` / `--background` 照常生效。显式传 `-f svg` 时仍只写 PNG，并在 stderr 提示 `... renders to PNG only`。

```bash
mmdx page.html -o out/page.png --scale 3
mmdx page.html --background transparent   # 显式覆盖才有透明背景
```

- **中文字体兜底（三家族）**：内嵌 Noto Sans SC / Noto Serif SC（可变字重）/ 霞鹜文楷，按 CJK 码位区间 alias 到 `sans-serif` / `serif` 兜底链——页面声明的西文字体原样渲染，中文黑体走 sans、衬线栈中文落宋体、手绘标注写 `'LXGW WenKai'` 得楷体，离线一致；页面自己声明的中文字体仍然优先。围栏与 mermaid 路径只注入黑体，不吃这三套字体。
- **figure lint**：导出时自动体检每个 figure，结果进 `--json.warnings`，消息带图号、文本、viewBox 坐标与方向；按坐标改源码，修到清零再交付。
- **高保真建议**：印刷 / 大屏缩放用 `--scale 3`（默认 2 够 PPT）；固定画布页让 `body` 宽 = 画布宽（或 `--width` 对齐设计宽），避免响应式重排；需要透明底才显式 `--background transparent`；webfont 与图片的加载等待渲染器自动处理。PNG 是本档的保真形态——字体与超采样都烘进像素，任意查看机器一致。
- **定位是渲染工具，不是版式闸**：预算、超限警告、像素筛查只适用于围栏块。`.md` 里的 ` ```html ` 围栏**不支持**（避免绕过扩展块的版式纪律），只认独立的 `.html` / `.htm` 文件。
- **配套手绘 HTML 工作流**：两条 vendored 规格（MIT）——偶发 editorial 封面 / 方案插图见 [skill/editorial/](../skill/editorial/README.md)（diagram-design）；叙事解释页 / 评审页 / recap / 幻灯片页见 [skill/explain/](../skill/explain/README.md)（visual-explainer 规格化改造版，复制 `kit/starter-<register>.html` → 编辑页身 → `mmdx name.html --scale 3`）。starter 由 `bun run scripts/explain-starter.ts` 生成（脚本用 `import.meta.dir`，需要 bun），只在重新生成 starter 时才要跑。

告警码一览：

| code | 含义 |
| --- | --- |
| `figure-overflow` | figure svg 里有元素越出画布（带越出方向与像素） |
| `figure-text-overlap` | 文字压在别的形状或文字上 |
| `figure-text-adhesion` | 文字与节点框间距 < max(4px, 字高×35%)，视觉粘连 |
| `figure-small-text` | svg 被缩小后文字有效字号 <11px |
| `figure-uncaptioned` | `<figure>` 缺 `figcaption` |
| `svg-aria-label` | figure svg 缺 `aria-label`（且无 figcaption 兜底） |

豁免策略防假告警：同组标签、骑线标签对「线」豁免对「框」不豁免、大框居中标签、隐藏文本与 sliver 交集。

## 主题定制

### 选内置主题（零成本）

| 场景 | `-t` |
| --- | --- |
| 技术方案/架构评审/投屏（默认） | `tech`（形状分色 + 可见填色） |
| 工程师文档/README/架构图（干净） | `openai`（纯白、墨黑、薄荷绿点缀、发丝边框） |
| 对外报告/打印/合规交付 | `openai` 配 `--tone paper`（衬线标题、10px 圆角、网格纸底，`--preset a4` 打印最佳） |
| 知识库/内部说明/长文 | `tech`（信息密度最高） |
| 白板/头脑风暴/轻松分享 | `excalidraw`（手绘线条 + 粉彩填色；`--style-fill hachure` 切斜线） |
| 产品界面截图 / iOS 应用说明 | `ios`（分组浅灰底 + 白卡片 + 发丝分隔线 + 系统色；图自带底） |
| 周报贴纸 / 团队看板 / 轻松汇报 | `acnh`（奶油纸 + 粗棕描边 + 硬偏移阴影 + 圆体字；块页带点阵纸纹） |
| 黑白打印 / 墨水屏阅读 / 合规文档 | `epaper`（电子纸：纸底 + 发丝黑描边 + 直角无阴影 + 灰阶区分形状） |
| 暗色文档站 / 技术分享 / 终端风格的图 | `zed`（Zed One Dark：暗画布 + 发丝线 + 语法色形状族）；配套亮色用 `zed-light` |
| 需要深色页面 | `openai` 或 `tech` 配 `--background '#1A1A1A'`（深色页面不要投会议室） |

### 无障碍底线（改色板前先看）

主题色板有硬门槛，`tests/run.ts` 与 `scripts/lint-a11y.ts` 都会守：

- 正文色对底 ≥ 7:1（WCAG AAA），次要文字 ≥ 4.5:1（AA），承载语义的强调色/警示色 ≥ 3:1；
- 每个形状族的描边对底、对自己的填充都 ≥ 3:1（填充再浅也不能把描边吃掉）；
- 红绿色盲（protan / deutan / tritan）模拟下，描边色不同的形状族仍两两可区分（OKLab ΔE ≥ 0.02）；
- 信息不靠颜色单独承载：四个形状族本来就是四种形状（矩形 / 菱形 / 胶囊 / 圆柱），黑白打印与色盲读者都能读。

自己改色板后跑 `node --experimental-transform-types --no-warnings scripts/lint-a11y.ts`，它会逐主题打印对比度与色觉模拟距离。

### 微调（--css 片段库，追加到主题之后）

Pele 的类名是稳定的，按形状选选择器：

```css
/* 更大圆角 */        .pele-flowchart .pele-shape-rect rect { rx: 14px; ry: 14px; }
/* 节点轻阴影 */      .pele-node { filter: drop-shadow(0 1px 2px rgba(0,0,0,.10)); }
/* 加粗判定描边 */    .pele-shape-diam polygon { stroke-width: 2px; }
/* 连线加粗 */        .pele-edge path { stroke-width: 2px; }
/* 标签加粗 */        .pele-label { font-weight: 600; }
```

字号、节点间距、内边距走 `--config`（JSON 需落成真实文件，Windows 不含进程替换）：

```json
{ "fontSize": 18, "flowchart": { "nodeSpacing": 88, "rankSpacing": 88, "padding": 22 } }
```

```bash
mmdx doc.md --config mq.json
```

Pele 不读取 `themeVariables` / `themeCSS`；这两类 key 会被忽略并给出 `config-ignored` 警告。颜色请用 `--theme-js` 或 `--css`。

### 整套换色（--theme-js v2）

```js
// brand.js — 用法: mmdx doc.md --theme-js brand.js
export default (theme) => {
  const brand = '#E4572E';
  theme.vars.accent = brand;                    // 强调色
  theme.vars.line = '#0D1B2A';                  // 连线/箭头
  theme.shapes.process.fill = '#FDF0E5';        // 流程节点
  theme.shapes.process.stroke = brand;
  theme.shapes.decision.fill = '#FFF4D6';       // 判定
  theme.shapes.decision.stroke = '#A87428';
  theme.css += `.pele-label { font-weight: 600; }`;
  return theme;                                 // 必须返回 ThemeSpec
};
```

`theme.vars` 对应 `--pele-bg/fg/muted/line/surface/surface-alt/border/accent/critical/radius/font/series`；`theme.shapes` 有 `process` / `decision` / `state` / `store` / `cluster`。

**叠加顺序**：主题 → `--brand` → `--theme-js` → `--config` → `--css`。`--brand` 只改 `theme.vars.accent`，不重涂形状分色。低对比 accent 会警告但不改色。

### 从 1.x 迁移（v2 破坏性变更）

| 1.x 写法 | v2 行为 |
| --- | --- |
| `--theme-js` 改 `config.themeVariables` | 报错并提示迁移到 `theme.vars` / `theme.shapes` |
| `--config` 传 `themeVariables` / `themeCSS` | Pele 忽略并给 `config-ignored` 警告 |
| `--layout elk`（1.x 遗留） | 参数已移除，按用法错误退出（exit 2）；改用 Pele 自带布局，或用 `--config` 调 `flowchart.nodeSpacing` / `rankSpacing` |
| `excalidraw` 线条仍是直的 | 检查 `-t excalidraw`；`rough.js asset missing` 表示 `vendor/rough.js` 未随构建打包 |
| `--style-fill` 对非 `excalidraw` 无效 | 预期行为；`--json` 的 `warnings` 会提示只对 `excalidraw` 生效 |
| `-f svg` 默认颜色 | 仍烘焙成 hex；需要可换肤 SVG 时加 `--svg-themeable` |
| `--title-pos bottom` + frontmatter title | Pele 把图内标题留在顶部；底栏标题请用 `--title` chrome |

## 性能调优

`--profile` 给出各阶段耗时，先看数据再动手：

```
browser-launch  ~0.5s ×1      pele-render     ~26ms ×图
page-init       ~1.0s ×页     screenshot      ~90ms ×图（含像素级二次裁切）
```

| 手段 | 建议 |
| --- | --- |
| 批量块数 > 30 | `--jobs 4`；默认 2 已够用——单浏览器页池，更高收益递减且增加内存压力 |
| PNG 体积大 | 默认 `auto` 已按主题量化，且截图会先做无损重压缩（重滤波 + 更优 deflate，照片页约省 10%，渐变/文字页约省 20%）；照片/渐变多的 HTML 用 `--png-colors near`（低损，约 1/5 体积），或 `--png-quality fast` / `--png-colors 64` 再压，或降 `--scale`（默认 2，聊天场景 1 足够） |
| 聊天/窄栏里字太小 | `--preset column`（800px@2），流程图用 `TD`；不要加大 `--width`（画布更宽，缩完字更小） |
| 宽图被压窄 | 调 `--width`（默认 1200），横向流程图可到 1600+ |
| 只要 SVG | `-f svg` 跳过截图环节 |
| 首图慢 | browser-launch + page-init 是固定成本（~1.7s），批量摊薄；单图无解，属正常 |

管线事实：单 Chromium 实例 + 页面池 + 有界 worker；唯一的引擎资源 Pele bundle（~700KB）按需注入，没有第二套引擎可回退，也没有额外的布局 bundle；截图跨页面串行化（headless Chrome 只服务活动 tab）；渲染卡死 60s 熔断，每图自动重试一次。

## 排障

| 报错/现象 | 性质 | 处置 |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | 环境缺浏览器 | 装 Edge/Chrome，或 `--browser "<path-to-msedge.exe>"`（任何 Chromium 内核）；不自动下载 |
| `render timed out after 60s` | 资源紧张/浏览器假死 | CLI 已自动重试；仍失败重跑整条命令，持续则 `--jobs 1` 隔离 |
| `icon pack "xxx" not found` | 网络不通（unpkg） | 去掉 `--icon` 或先联网跑一次用缓存 |
| 中文变方块 | 不应发生（内置字体） | 检查 `--config`/`--theme-js` 是否覆盖了 fontFamily |
| `Parsing error` / `pele: Parse error`（exit 1） | **图语法错误** | 按行信息修图；Pele 不支持的写法改成等价的可渲染图型（flowchart / state / sequence 等），没有别的引擎可切 |
| `unknown option --engine` / `--layout` | 1.x 遗留参数，已随第二引擎移除 | 去掉这两个参数；布局与间距用 `--config` 的 `flowchart.nodeSpacing` / `rankSpacing` 调 |
| `--theme-js v2 receives a ThemeSpec` | 1.x 换色脚本 | 按提示改 `theme.vars` / `theme.shapes` |
| `config "…" is not supported by the pele engine` | `--config` 白名单之外 | 颜色用 `--theme-js`，字号/间距用 `fontSize` / `flowchart.*` |
| exit 2 | 参数用法错误 | `mmdx --help` 对照 |
| SVG 放进 Office 颜色丢失 | 使用了 `--svg-themeable` | 去掉该 flag（默认烘焙 hex），或改 `-f png` |
| 文字被连线压住 | 手动 `style` 改了背景，覆盖主题的标签遮罩 | 去掉手动 style，仅强调个别节点可用 `classDef` |
| 同名 md 导出到同一 `-o` 目录互相覆盖 | 命名冲突 | 分目录，或用 `--index` 只导指定块 |
| `.html` 输入加 `-f svg`，stderr 提示 `renders to PNG only` | 正常降级 | 整页截图只有 PNG；需要矢量就用 mermaid 图型的 SVG |
| `.html` 输入时 `-t` / `--tone` / `--title` 看不出效果 | 这些是围栏参数 | HTML 页自带样式与版式，截图不叠加主题或图题层 |
| `--json.warnings` 出现 `figure-*` / `svg-aria-label` | 手绘 figure 几何或结构问题 | 按消息里的图号与坐标改源码，见 [HTML 整页截图](#html-整页截图) |
| `column-landscape` / `column-shrink` | `--preset column` 下流程图太宽 | 改 `flowchart TD` 或拆图；不要加大 `--width` |

总原则：**exit 2 = 参数错；Parsing error = 图写错；报错关键词先查表，别盲目重装环境**。

## 测试

`bun run tests/run.ts`，四层设计——视觉审查只看脚本标记出的可疑项：

1. **库级筛查**：20 种 mermaid 图型 + 扩展块，单浏览器会话渲染后做像素分析（边距对称、内容占比、白图检测）
2. **CLI 行为**：退出码、preset 宽度、caption、brand、超限警告/`--strict-chart`、坏块隔离、stdin、JSON 契约、信息卡分页与 tone、`.html` 输入与 figure lint
3. **性能插桩**：打开 Renderer `profile`，卡住 `page-reset` / `init-pele` 次数与各阶段 maxMs；HTML 块后只清 DOM，不得按块重注引擎
4. **视觉 lint**：底部空白带、DOM 溢出/越界/图题重叠、SVG 标签溢出、渲染态对比度、PNG 边缘裁切、双跑确定性；规则见 [QUALITY.md](QUALITY.md)

视觉样图：`bun scripts/make-contact-sheet.ts`（mermaid 拼图）与 `bun scripts/make-review.ts`（`docs/ext-*.png`）。
