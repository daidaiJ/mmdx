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
- [CLI 全参数参考](#cli-全参数参考)
- [扩展块](#扩展块)
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
mmdx doc.md -t mocha --background transparent -f png --json
mmdx doc.md --brand #E4572E --preset square
mmdx doc.md --list                          # 只列出找到的围栏块，不渲染
```

三种输入形态：

| 输入 | 行为 |
|---|---|
| `.md` 文件 | 渲染其中所有 ```mermaid 与扩展围栏（table/list/card/chart/kpi/compare/funnel/task/progress/swimlane/gauge/vs/heatmap） |
| `.mmd` 文件 | 渲染单个 mermaid 图 |
| `-`（stdin） | 从标准输入读单个 mermaid 图 |

输出命名：默认与输入同目录，`<名字>-m<N>.svg/.png` 按块序号编号；`-o` 指定输出目录；输入只含一个图时 `-o` 可以是精确文件名。

## CLI 全参数参考

| 参数 | 说明 |
| --- | --- |
| `-o, --out <path>` | 输出目录；单图输入时可为精确文件名（默认与输入同目录） |
| `-f, --format <fmt>` | `svg` \| `png` \| `both`（默认 both；`--preset` 未显式 `-f` 时默认 png） |
| `-t, --theme <name>` | `tech`（默认）· `openai` · `openai-dark` · `minimal` · `latte` · `mocha` · `sketch` |
| `--preset <name>` | `slide`（投屏/PPT：1600px@2，字号 18、描边加粗，底栏预留 ~80px）\| `a4`（900px@2）\| `square`（1080px@2）。显式 `--width`/`--scale`/`-f` 优先 |
| `--background <color>` | 页面背景，如 `white` \| `transparent` \| `#1A1A1A`（dark 主题自带深色背景，无需再传） |
| `--layout <engine>` | `elk`（默认，仅 flowchart 实际加载）\| `dagre` |
| `--scale <n>` | PNG 缩放倍数（默认 2） |
| `--width <px>` | 布局视口宽（默认 1200） |
| `--title <text>` | 图题（印在 PNG chrome 上，不再写入 mermaid frontmatter） |
| `--subtitle <text>` | 副标题 |
| `--source <text>` | 来源（底栏） |
| `--unit <text>` | 单位（底栏） |
| `--title-pos <pos>` | `top`（默认）\| `bottom`（chrome 标题在主图上方/下方） |
| `--index <n[,n…]>` | 只渲染这些 1-based 块序号 |
| `--brand <hex>` | 扩展块强调色（默认 `#2563EB`；可写 `2563EB`）；不重涂 flowchart 形状分色。投屏请用深色，避免浅蓝 |
| `--strict-chart` | mermaid pie/xychart/radar/flowchart/sequence 超限当错误（默认只警告） |
| `--icon <pack>` | iconify 图标包，支持 `A@{icon: logos:react}` 节点（可重复传；拉取后有缓存） |
| `--config <file.json>` | mermaid 原生配置，深合并到主题之上 |
| `--theme-js <file.js>` | JS 换色函数，文件体是 `(config, ctx) => config` |
| `--css <file.css>` | 追加 CSS 到主题的 themeCSS 之后 |
| `--browser <path>` | 浏览器可执行文件路径（默认自动探测 Edge/Chrome） |
| `--jobs <n>` | 并行渲染数（默认 2；单浏览器页池，别开太高） |
| `--profile` | 各阶段耗时汇总（browser-launch / page-init / mermaid-render / screenshot / svgo） |
| `--list` | 列出找到的围栏块后退出，不渲染 |
| `--json` | stdout 输出单份 JSON（files + errors），便于程序化核对 |
| `-q, --quiet` | 抑制 stderr 进度行 |
| `-h, --help` / `-v, --version` | 帮助 / 版本 |

退出码：`0` 成功 · `1` 有渲染失败（其余块照常出图）· `2` 用法错误。

`--json` 输出契约：

```json
{
  "theme": "tech", "layout": "elk", "format": "png", "background": "#FFFFFF",
  "preset": "slide", "brand": "#E4572E",
  "caption": { "title": "Q1 销售构成", "subtitle": null, "source": "财务月报", "unit": "万元" },
  "blocks": 3, "rendered": 3, "failed": 0,
  "files": ["doc-m1.png", "…"],
  "errors": [],
  "warnings": [{ "input": "doc.md", "index": 1, "code": "pie-sectors", "message": "…" }],
  "profile": { "mermaid-render": { "count": 3, "totalMs": 285, "avgMs": 95, "maxMs": 120, "maxLabel": "doc#2" } }
}
```

（`preset`/`brand`/`caption` 仅在使用对应参数时出现；`warnings` 始终为数组；`profile` 仅在同时传 `--profile` 时出现。）

## 扩展块

除 mermaid 图外，常见 Markdown 结构可直接渲染成样式化图片。扩展块**只出 PNG**——HTML 排版没有可移植的 SVG 形态。均吃 `--title`/`--subtitle`/`--source`/`--unit` 图题层，配色走 `--brand` 的 accent。

语法、上限与每种一张样图见 **[扩展块图鉴](EXTENSIONS.md)**。

## 主题定制

### 选内置主题（零成本）

| 场景 | `-t` |
| --- | --- |
| 技术方案/架构评审/投屏（默认） | `tech`（形状分色 + 可见填色） |
| 开源 README 极简 | `openai` / `openai-dark` |
| Obsidian 笔记 | `minimal` |
| 暗色文档站/深色界面 | `mocha`（或 `openai-dark`） |
| 轻松分享/博客 | `sketch`（手绘风） |

### 微调（--css 片段库，追加到主题之后）

```css
/* 更大圆角 */        .node rect { rx: 14px; ry: 14px; }
/* 节点轻阴影 */      .node rect { filter: drop-shadow(0 1px 2px rgba(0,0,0,.10)); }
/* 加粗描边 */        .node rect, .node polygon { stroke-width: 2px; }
/* 连线加粗 */        .edgePath .path { stroke-width: 2px; }
```

文字大小/连线颜色走 `--config`（原生 mermaid 变量，JSON 需落成真实文件，Windows 下不支持进程替换）：

```bash
echo '{"themeVariables":{"fontSize":"17px","lineColor":"#4E5969"}}' > mq.json
mmdx doc.md --config mq.json
```

### 整套换色（--theme-js，文件体是函数体）

```js
// brand.js — 用法: mmdx doc.md --theme-js brand.js
export default (config, ctx) => {
  // ctx.theme = 当前主题名；品牌色示例
  const ink = '#0D1B2A', brand = '#E4572E', soft = '#FDF0E5';
  config.themeVariables.primaryTextColor = ink;
  config.themeVariables.lineColor = ink;
  config.themeCSS += `
    .node rect { fill: ${soft}; stroke: ${brand}; }
    .node polygon { fill: ${soft}; stroke: ${brand}; }`;
  return config;   // 必须返回 config
};
```

更深的需求（换布局参数、关闭镜像参与者等）用 `--config` 深合并原生配置（`flowchart.curve`、`sequence.mirrorActors`…）。

**叠加顺序**：主题 → `--brand` → `--theme-js` → `--config` → `--css`。`--brand` 只映射 accent / accent-tint，flowchart 形状分色保持。低对比 accent 会警告但不改色。

## 性能调优

`--profile` 给出各阶段耗时，先看数据再动手：

```
browser-launch  ~0.5s ×1      mermaid-render ~95ms ×图
page-init       ~1.2s ×页     screenshot      ~90ms ×图（含像素级二次裁切）
```

| 手段 | 建议 |
| --- | --- |
| 批量块数 > 30 | `--jobs 4`；默认 2 已够用——单浏览器页池，更高收益递减且增加内存压力 |
| PNG 体积大 | 降 `--scale`（默认 2，聊天场景 1 足够）；PNG 无损压缩，架构图典型 20–80KB |
| 宽图被压窄 | 调 `--width`（默认 1200），横向流程图可到 1600+ |
| 只要 SVG | `-f svg` 跳过截图环节 |
| 首图慢 | browser-launch + page-init 是固定成本（~1.7s），批量摊薄；单图无解，属正常 |

管线事实：单 Chromium 实例 + 页面池 + 有界 worker；ELK（7MB bundle）只对 flowchart/graph 懒加载，sequence/pie/gantt 等零开销；截图跨页面串行化（headless Chrome 只服务活动 tab）；渲染卡死 60s 熔断，每图自动重试一次。

## 排障

| 报错/现象 | 性质 | 处置 |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | 环境缺浏览器 | 装 Edge/Chrome，或 `--browser "<path-to-msedge.exe>"`（任何 Chromium 内核）；不自动下载 |
| `render timed out after 60s` | 资源紧张/浏览器假死 | CLI 已自动重试；仍失败重跑整条命令，持续则 `--jobs 1` 隔离 |
| `icon pack "xxx" not found` | 网络不通（unpkg） | 去掉 `--icon` 或先联网跑一次用缓存 |
| 中文变方块 | 不应发生（内置字体） | 检查 `--config`/`--theme-js` 是否覆盖了 fontFamily |
| `Parsing error`（exit 1） | **图语法错误** | 按 mermaid 行信息修图，其他块不受影响 |
| exit 2 | 参数用法错误 | `mmdx --help` 对照 |
| SVG 放进非浏览器工具（Inkscape 等）文字消失 | svg 是 HTML 实现的 | 改 `-f png` |
| 文字被连线压住 | 手动 `style` 改了背景，覆盖主题的标签遮罩 | 去掉手动 style，仅强调个别节点可用 classDef |
| 同名 md 导出到同一 `-o` 目录互相覆盖 | 命名冲突 | 分目录，或用 `--index` 只导指定块 |

总原则：**exit 2 = 参数错；Parsing error = 图写错；报错关键词先查表，别盲目重装环境**。

## 测试

`bun run tests/run.ts`，三层设计——视觉审查只看脚本标记出的可疑项：

1. **库级筛查**：20 种 mermaid 图型 + 扩展块，单浏览器会话渲染后做像素分析（边距对称、内容占比、白图检测）
2. **CLI 行为**：退出码、preset 宽度、caption、brand、超限警告/`--strict-chart`、坏块隔离、stdin、JSON 契约
3. **性能插桩**：打开 Renderer `profile`，卡住 `page-reset` / `init-mermaid` 次数与各阶段 maxMs；HTML 块后只清 DOM，不得按块重注 mermaid

视觉样图：`bun scripts/make-contact-sheet.ts`（mermaid 拼图）与 `bun scripts/make-review.ts`（`docs/ext-*.png`）。
