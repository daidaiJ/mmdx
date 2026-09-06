> [English](README.en.md) · 中文

# mmdx

[![Release](https://img.shields.io/github/v/release/daidaiJ/mmdx)](https://github.com/daidaiJ/mmdx/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**为 AI agent 打造的 Mermaid 图表导出 CLI**：把 Markdown 里的 ```mermaid / ```table / ```list / ```card 围栏块批量渲染成 SVG + PNG——主题、中文字体、布局引擎、留白全部内置，不需要 MCP server、浏览器插件，产物机器上也不需要 Node。

![二十种图型渲染示例](tests/contact-sheet.png)

## 📖 文档导航

| 读者 | 文档 | 说明 |
|---|---|---|
| 🤖 AI Agent | [docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md) | 省 token 版：环境自检、选型表、参数速查、JSON 契约、错误速诊 |
| 👤 人类用户 | [docs/HUMAN_GUIDE.md](docs/HUMAN_GUIDE.md) | 易读版：安装部署、CLI 全参数、主题定制、性能调优、排障 |
| 📜 变更历史 | [CHANGELOG.md](CHANGELOG.md) | 版本变更记录 |

各文档均为中文默认，同名 `.en.md` 为英文版。

## ✨ 核心特性

- **tech 默认主题**：大厂技术文档风——白底、形状分色（蓝=流程、琥珀=判定、绿=状态、紫=存储）、正交连线，外加 6 套不同气质的预设；20 种 mermaid 图型全覆盖
- **内置中文字体**：Noto Sans SC 子集（GB2312 全量汉字 + 拉丁，仅 1.9MB），任意机器渲染一致，中文标签换行正确
- **ELK 布局引擎**：官方 `@mermaid-js/layout-elk`，只对 flowchart 懒加载；连线避让、长文本换行开箱即用
- **像素级均匀留白**：每张图二次裁切到墨迹包围盒，四边留白对称是构造保证，不靠 mermaid 不可靠的 viewBox
- **扩展块**：```table / ```list / ```card 三种 Markdown 结构直接渲染成样式化图片（聊天窗口、幻灯片、截图笔记都能用）
- **agent 友好**：`--json` 机器输出、`--profile` 阶段耗时、失败块隔离、瞬时故障自动重试、60s 超时保护、并发有上限

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

## 🖼 使用示例

```bash
mmdx a.md b.md other/*.md -o dist/          # 多文件批量，并行
mmdx diagram.mmd -o out/arch.svg            # 精确命名，同目录附带 .png
mmdx report.md --index 2 --title "架构总览" --title-pos bottom
mmdx doc.md -t mocha --background transparent -f png --json
```

Markdown 围栏语言：`mermaid`（图表）、`table` / `list` / `card`（扩展块）。扩展块只出 PNG——HTML 排版没有可移植的 SVG 形态。

**卡片墙** —— ```card 围栏，约定语法：每行一张卡，`emoji | 标题 | 描述`（emoji 与描述可省略）：

```card
🚀 | 渲染管线 | 单浏览器页池复用，PNG 2x 无损导出
🎨 | 主题系统 | 七套预设，支持 theme-js 与 css 自定义
```

![卡片渲染示例](docs/ext-card.png)

## 🎨 主题

| | |
| --- | --- |
| `tech`（默认） | 大厂方案文档风：白底、形状分色、细边框、正交连线 |
| `openai` / `openai-dark` | 近单色、细边框、薄荷点缀 |
| `minimal` | Obsidian Minimal 风格：暖中性色 + 单一紫罗兰强调 |
| `latte` / `mocha` | Catppuccin 配色 |
| `sketch` | Mermaid `look: handDrawn` 白板手绘风 |

叠加顺序：预设 → `--theme-js` → `--config` → `--css`。定制方法（CSS 片段库、整套装色函数）见 [HUMAN_GUIDE 主题定制](docs/HUMAN_GUIDE.md#主题定制)。

## ⚡ 管线与性能

单 Chromium + 页面池 + 有界 worker；`--profile` 可观测：

```
browser-launch  ~0.5s ×1      mermaid-render ~95ms ×图
page-init       ~1.2s ×页     screenshot      ~90ms ×图（含像素级二次裁切）
```

- ELK（7MB bundle）懒解析：只有 flowchart/graph 真正渲染时才加载，sequence/pie/gantt 等零开销
- 截图跨页面串行化（headless Chrome 只服务活动 tab）+ 视口按内容适配，2x 高清单图仍在 ~100ms 量级
- 渲染卡死 60s 必然报错而不是挂住整批；每个图自动重试一次
- PNG 为 2x 无损（典型架构图 20–80KB）；SVG 经 svgo 压缩——二进制内嵌 svgo 官方 browser 构建（自包含 ESM），压缩后的 SVG 与 PNG 一样开箱即得

调优手段（并发、视口、缩放）见 [HUMAN_GUIDE 性能调优](docs/HUMAN_GUIDE.md#性能调优)。

## 🧪 测试

`bun run tests/run.ts`，两层设计——视觉审查只看脚本标记出的可疑项：

1. **库级筛查**：20 种 mermaid 图型 + 表格/列表/卡片，单浏览器会话渲染后做像素分析（边距对称 ±8px、内容占比、白图检测）
2. **CLI 行为**：退出码、`--index` 命名、坏块隔离、stdin、JSON 契约、19 文件 4 并发批次

## License

[MIT](LICENSE)
