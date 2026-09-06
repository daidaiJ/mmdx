> [English](AGENT_GUIDE.en.md) · 中文

# mmdx — Agent Guide

Mermaid 图表导出 CLI。把 ```mermaid / ```table / ```list / ```card 围栏块批量渲染成 SVG + PNG；主题、中文字体、ELK 布局、留白全部内置。**不要在图代码里手工调样式，不要用 VSCode 插件。**

> 人类阅读版：[HUMAN_GUIDE.md](HUMAN_GUIDE.md) · 项目概览：[README](../README.md)

## 获取（按优先级）

```bash
# 1. Release 二进制（推荐，免 Node）
curl -L -o "$TMP/mmdx.exe" https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe
# 2. 源码动态运行（需 bun）：bun run src/cli.ts
```

下文统一写 `mmdx`（即上面任一路径）。渲染需系统 Edge/Chrome，找不到时报错 `no Chrome/Edge found`，用 `--browser <path>` 指定；**绝不自动下载浏览器**。

## 环境自检（会话内首次使用先跑，30 秒）

```bash
mmdx --version   # 预期 1.0.0；not found → 用完整路径
echo "graph LR; A[自检] --> B{通过}" | mmdx - -f png -o "$TMP/mmdx-check" --json --quiet
```

冒烟输出 JSON 且 `rendered:1` → 环境就绪。`rendered:0` → 查下方[错误速诊](#错误速诊)。

## 命令档位（先低档跑通再升）

```bash
# L0 默认（80% 场景）：所有块 → 同目录 <name>-m1.svg/.png …
mmdx doc.md
# L1 批量/定向
mmdx a.md b.md docs/*.md -o dist/          # 多文件合并批
mmdx doc.md --index 2 -f png               # 只导第 2 块
# L2 标题/命名
mmdx doc.md --title "系统架构" --title-pos bottom -o out/arch.svg
echo "graph LR; A-->B" | mmdx - -f svg     # stdin 单图
```

格式：聊天/纯图 `-f png`；md 文档默认 both；深色底图 `--background transparent`（dark 主题自带深色背景，不用再传）。

## 选型速查

| 用户要表达的 | 图型 | 要点 |
| --- | --- | --- |
| 流程/步骤/判定 | `flowchart LR/TD` | 流水线 LR，决策/层级 TD |
| 消息交互/协议时序 | `sequenceDiagram` | 参与者 ≤ 6，用 `autonumber`、`alt/else` |
| 状态流转 | `stateDiagram-v2` | `[*] --> s1: 事件` |
| 类/接口关系 | `classDiagram` | |
| 数据模型 | `erDiagram` | `USER \|\|--o{ ORDER : has` |
| 概念结构 | `mindmap` | 缩进层级 + `root((主题))` |
| 排期/占比/演进 | `gantt` / `pie` / `timeline` | |
| 表格/列表/卡片 → 图片 | ```table / ```list / ```card 围栏 | **PNG only**；card 语法 `emoji \| 标题 \| 描述` |

## 写图规则（违反是出丑的头号原因）

1. 节点标签 ≤ 12 中文字（约 30 latin）；细节放边线标签/note/正文
2. 单图 ≤ 15 节点，更多拆"总览 + 局部"两张
3. 不写 `style`/`classDef` 调全局色；仅强调个别节点可用 classDef
4. `subgraph` 要命名，容器配色交给主题
5. emoji 每图 ≤ 3；品牌图标 `A@{icon: logos:react}` + `--icon logos`
6. 标题用 `--title` 注入，不手写 frontmatter

## 自检闭环（渲染后必做）

1. `--json` 核对：`failed:0` 且 `files.length === 块数 × 格式数`
2. **Read 看生成的 PNG**：文字无截断、对比清晰、连线不穿字、四边留白均匀
3. 问题 → 改图或调样式 → `--index N` 重渲染该块；最多迭代 2 轮，仍不满意问用户

## JSON 契约（--json）

stdout 单份 JSON：`theme/layout/format/background/blocks/rendered/failed/files[]/errors[{input,index,error}]`；加 `--profile` 时附 `profile{stage:{count,totalMs,avgMs,maxMs,maxLabel}}`。非 JSON 模式 stdout 逐行输出产物路径，stderr 输出进度。

## 错误速诊

| 报错 | 性质 | 处置 |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | 环境缺浏览器 | 装 Edge/Chrome 或 `--browser "<path-to-msedge.exe>"`；不自动下载 |
| `render timed out after 60s` | 资源紧张/假死 | CLI 已自动重试；重跑整条命令，持续则 `--jobs 1` |
| `icon pack "xxx" not found` | 网络不通（unpkg） | 去掉 `--icon` 或先联网跑一次用缓存 |
| 中文变方块 | 不应发生（内置字体） | 检查 `--config`/`--theme-js` 是否覆盖 fontFamily |
| `Parsing error`（exit 1） | **图语法错误** | 按 mermaid 行信息修图，其他块不受影响 |
| exit 2 | 参数用法错误 | `mmdx --help` 对照 |
| SVG 在非浏览器工具文字消失 | svg 是 HTML 实现 | 改 `-f png` |

总原则：**exit 2 = 参数错；Parsing error = 图写错；报错先查表，别盲目重装环境**。

## 主题速记

`-t`：`tech`（默认，技术文档）· `openai`/`openai-dark`（极简）· `minimal`（Obsidian）· `latte`/`mocha`（Catppuccin）· `sketch`（手绘）。
叠加顺序：预设 → `--theme-js`（函数体 `(config, ctx) => config`，必须 return config）→ `--config`（原生 mermaid 配置深合并）→ `--css`。

## 退出码

`0` 成功 · `1` 有块失败（其余照常出图）· `2` 用法错误。

## 常见坑

- 批量 >30 块 → `--jobs 4`（默认 2；单浏览器页池，别更高）
- 同名 md 导出到同一 `-o` 目录互相覆盖 → 分目录或 `--index`
- `--config` 的 JSON 要落成真实文件（Windows 无进程替换）
