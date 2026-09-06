---
name: mermaid
description: Generate and export diagrams as SVG/PNG images — Mermaid flowcharts (流程图), sequence (时序图), architecture (架构图), state (状态机), class (类图), ER (数据库模型), mindmap (思维导图), gantt (甘特图), pie, timeline, gitgraph, quadrant, C4, journey (用户旅程), xychart, kanban, radar, treemap, plus markdown tables/lists (表格/列表) rendered to styled images. Prefer this whenever the user mentions 图/图表/流程图/架构图/渲染/导出图片/画个图. NOT for AI image generation (文生图/照片级插图/艺术图) — that needs an image-generation model, not this skill.
---

# mmdx — 图表渲染导出（mermaid / 表格 / 列表 → SVG/PNG）

把 ```mermaid / ```table / ```list / ```card 围栏块渲染成高质量图片。主题、中文字体、ELK 布局、均匀留白全部内置——**不要在图代码里手工调样式，不要用 VSCode 插件**。

CLI 获取（按优先级）：

1. **Release 二进制**（推荐，免 Node）：https://github.com/daidaiJ/mmdx/releases/latest
   ```bash
   curl -L -o "$TMP/mmdx.exe" https://github.com/daidaiJ/mmdx/releases/latest/download/mmdx-windows-x64.exe
   ```
   （GitHub CDN 超时时加代理前缀 `HTTPS_PROXY=http://127.0.0.1:7897`）
2. 本机已构建：`D:\CODE\ai\mmdx\dist\mmdx-windows-x64.exe`
3. 源码动态运行（需 bun）：仓库 `D:\CODE\ai\mmdx`，`bun run src/cli.ts`

下文统一写 `mmdx`（即上面任一路径）。仓库与最新版：https://github.com/daidaiJ/mmdx

**适用边界**：流程图/架构图/时序图/状态机/ER/甘特/思维导图/表格列表转图片 → 用本 skill。唯一反例：用户要"AI 生成图片"（文生图、照片级、艺术插画）→ 那是图像生成模型的事，本 skill 不适用。

## 0. 环境自检（会话内首次使用先跑，30 秒）

```bash
mmdx --version   # 预期 1.0.0；not found → 用完整路径或 bun run build
echo "graph LR; A[自检] --> B{通过}" | mmdx - -f png -o "$TMP/mmdx-check" --json --quiet
```

冒烟输出 JSON 且 `rendered:1` → 环境就绪，开始干活。`rendered:0` → 查 §4 错误速诊表。

## 1. Agent Loop（标准工作流，每轮循环 = 选型 → 写图 → 渲染 → 自检）

### 1a. 需求 → 图型对照（选型）

| 用户要表达的 | 图型 | 最小骨架 |
| --- | --- | --- |
| 流程/步骤/判定 | flowchart | `flowchart LR` + `A[节点] --> B{判定?} -- 是 --> C[结果]` |
| 对象间消息交互/协议时序 | sequenceDiagram | `sequenceDiagram` + `A->>B: 消息` / `B-->>A: 返回`，配 `autonumber`、`alt/else`、`Note over` |
| 状态流转 | stateDiagram-v2 | `stateDiagram-v2` + `[*] --> s1: 事件` |
| 类/接口关系 | classDiagram | `classDiagram` + `class A { +方法() }` + `A --> B` |
| 数据模型/表关系 | erDiagram | `erDiagram` + `USER \|\|--o{ ORDER : has` |
| 概念发散/知识结构 | mindmap | `mindmap` + 缩进层级 + `root((主题))` |
| 排期 | gantt | `gantt` + `dateFormat YYYY-MM-DD` + `任务 :a1, 2026-01-01, 3d` |
| 占比 | pie | `pie showData` + `"标签" : 数值` |
| 阶段演进 | timeline | `timeline` + `时期 : 事件` |
| 分支策略 | gitGraph | `gitGraph` + `commit` / `branch dev` / `merge` |
| 表格 → 图片 | ```table 围栏 | GFM 管道表格原文（PNG only） |
| 列表 → 图片 | ```list 围栏 | Markdown 嵌套列表原文（PNG only） |
| 卡片墙 → 图片 | ```card 围栏 | 每行一卡：`emoji | 标题 | 描述`（后两者可省，PNG only） |

### 1b. 写图规则（违反是出丑的头号原因）

1. **节点标签 ≤ 12 个中文字（约 30 latin）**；细节放边线标签、sequence 的 note、或图下方正文（长文本自动换行约 230px，但多行节点破坏布局）
2. 方向：流水线 `LR`，决策/状态/层级 `TD`
3. `subgraph 分组名` 要命名，容器配色交给主题
4. **单图 ≤ 15 节点**，更多拆"总览 + 局部"两张
5. 不写 `style`/`classDef` 调全局色；仅强调个别节点可用 classDef
6. sequence：参与者 ≤ 6，用 `autonumber`、`alt/else`、`loop`
7. emoji 每图 ≤ 3 个；品牌图标 `A@{icon: logos:react}` + `--icon logos`
8. 标题用 `--title` 注入，不手写 frontmatter

### 1c. 渲染（渐进式，先低档跑通再升档）

```bash
# L0 默认（80% 场景）：所有块 → 同目录 <name>-m1.svg/.png …
mmdx doc.md
# L1 批量/定向
mmdx a.md b.md docs/*.md -o dist/          # 多文件合并批
mmdx doc.md --index 2 -f png                # 只导第 2 块
# L2 标题/命名
mmdx doc.md --title "系统架构" --title-pos bottom -o out/arch.svg
```

档位准则：**先 L0，看结果再升**。格式：聊天/纯图 `-f png`；md 文档默认 both；深色底图 `--background transparent`。主题选择见 §3。

### 1d. 自检闭环（渲染后必做）

1. `--json` 核对：`failed:0` 且 `files.length === 块数 × 格式数`
2. **Read 看生成的 PNG**，按此清单检查：文字无截断、与边框/连线对比清晰、连线不穿字、留白四边均匀、节点数超 15 则拆图
3. 发现问题 → 改图（§1b）或调样式（§3）→ 重渲染该块（`--index N`）
4. 最多迭代 2 轮；仍不满意与用户确认方向而不是继续盲调

## 2. 错误速诊：环境问题 vs 图的问题

| 报错 | 性质 | 处置 |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | 环境缺浏览器 | 装 Edge/Chrome 或 `--browser "<path-to-msedge.exe>"`（任何 Chromium 内核）；不自动下载 |
| `svgo unavailable — writing SVG without minification` | 极罕见（svgo 已内嵌进二进制，正常不会出现） | 无害降级：PNG 不受影响，SVG 未压缩仍可用；重跑即可 |
| `render timed out after 60s` | 资源紧张/浏览器假死 | CLI 已自动重试；仍失败重跑整条命令，持续则 `--jobs 1` 隔离 |
| `icon pack "xxx" not found` | 网络不通（unpkg） | 去掉 `--icon` 或先联网跑一次用缓存 |
| 中文变方块 | 不应发生（内置字体） | 检查是否 `--config`/`--theme-js` 覆盖了 fontFamily |
| exit 1 + `Parsing error` | **图语法错误** | 按 mermaid 行信息修图，其他块不受影响 |
| exit 2 | 参数用法错误 | `mmdx --help` 对照 |

总原则：**exit 2 = 参数错；Parsing error = 图写错；报错关键词先查表，别盲目重装环境**。

## 3. 主题与风格定制（按改动幅度从小到大）

### 3a. 选内置主题（零成本）

| 场景 | `-t` |
| --- | --- |
| 技术方案/架构评审（默认） | `tech` |
| 开源 README 极简 | `openai` / `openai-dark` |
| Obsidian 笔记 | `minimal` |
| 暗色文档站/深色界面 | `mocha`（或 `openai-dark`） |
| 轻松分享/博客 | `sketch`（手绘风） |

dark 主题自带深色背景，不用再传 `--background`。

### 3b. 微调（--css 片段库，追加到主题之后）

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

### 3c. 整套换色（--theme-js，文件体是函数体）

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

更深的需求（换布局参数、关闭镜像参与者等）用 `--config` 深合并原生配置（`flowchart.curve`、`sequence.mirrorActors`…），三个来源的叠加顺序：主题 → `--theme-js` → `--config` → `--css`。

## 4. 常见坑

- SVG 放非浏览器工具（Inkscape 等）文字消失 → svg 标签是 HTML 实现的，改 `-f png`
- 文字被连线压住 → 检查是否手动 `style` 改了背景，覆盖了主题的标签遮罩
- 同名 md 导出到同一 `-o` 目录互相覆盖 → 分目录或 `--index`
- 批量 >30 块 → `--jobs 4`（默认 2；单浏览器页池，别更高）
