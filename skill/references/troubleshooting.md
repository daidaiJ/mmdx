# 排障速查（按需读取）

> 渲染失败 / `--json.warnings` 非空 / 退出码异常时读本文。预防性规则在 [../SKILL.md](../SKILL.md)。

## 退出码总原则

**exit 2 = 参数用法错（`mmdx --help` 查）；exit 1 = 图写错或超限（按信息修，同文件其他块不受影响）；exit 0 但 warnings 非空 = 能出图但有隐患（按下表处置）。**

## 报错速诊

| 报错 | 性质 | 处置 |
| --- | --- | --- |
| `no Chrome/Edge found … --browser <path>` | 环境缺浏览器 | 装 Edge/Chrome 或 `--browser`；不自动下载 |
| `svgo unavailable` | 极罕见 | 无害降级（SVG 不压缩） |
| `render timed out after 60s` | 资源紧张 | CLI 已重试；持续则 `--jobs 1` |
| 渲染慢但都成功 | 想定位瓶颈 | 加 `--profile`：stderr / `--json.profile` 给出各阶段耗时（browser-launch / init-pele / pele-render / screenshot / block-render） |
| `icon pack "xxx" not found` | 网络不通 | 去掉 `--icon` |
| 中文变方块 | 不应发生 | 检查 `--config`/`--theme-js` 是否覆盖 fontFamily |
| exit 1 + `Parsing error` / 超限信息 | **图或围栏写错** | 按信息修；围栏细则见 [fences.md](fences.md) |
| exit 2 | 参数用法错误 | `mmdx --help` |
| `unknown theme "xxx"` | 用了已移除的预设名（`openai-dark` / `sketch` / `mocha` / `vercel` / `notion` … 共 11 套） | 换成 `tech` / `openai` / `excalidraw`；旧主题没有等价物，按 [themes-engines.md](themes-engines.md) 选最近的 |
| `unknown option --engine` / `--layout` | 1.x 遗留参数，随第二引擎一起移除 | 去掉参数；间距用 `--config` 的 `flowchart.nodeSpacing` / `rankSpacing` |
| HTML 输入 `-f svg` 提示 `renders to PNG only` | 正常降级 | HTML 整页截图只有 PNG；要矢量就把图改成围栏图型（mermaid 语法）再出 SVG |

## `--json.warnings` 处置

| code | 含义 | 处置 |
| --- | --- | --- |
| `column-landscape` | 源是 `flowchart LR/RL`，窄栏会横缩 | 改 `flowchart TD` |
| `column-shrink` | 图内在宽度超 800px 栏宽，会被 CSS 缩小 | 砍节点 / 拆图 / 换 `--preset a4`；**不要**加大 `--width`（缩完字更小） |
| `pie-sectors` 等 `*-over` | 超 §1a 预算 | 拆「总览 + 局部」或交 AntV；`--strict-chart` 可把图表围栏的超限升为错误 |
| `brand-contrast` | `--brand` 色在白底上对比度 < 4.5:1（WCAG AA） | 换更深的色；颜色按原样保留未改 |
| `figure-overflow` | **`file.html` 输入**：figure svg 里有元素越出画布（消息带图号、元素、viewBox 坐标、越出方向与像素） | 按坐标改源码：加宽 `viewBox` 或把元素收进来 |
| `figure-text-overlap` | figure svg 里文字压在别的形状/文字上（带两侧名称与坐标） | 挪开标签；属于某节点的标签与其形状收进同一 `<g>` |
| `figure-text-adhesion` | 文字与节点框间距 < max(4px, 字高×35%)，视觉粘连（带方向与间距） | 缩短标签、拉开间距或抬高；骑线标签（halo/chip）对**线**豁免、对**框**不豁免 |
| `figure-small-text` | svg 被缩小后文字有效字号 <11px | 放大画布或加大字号 |
| `figure-uncaptioned` / `svg-aria-label` | 图缺 `figcaption` 主张 / svg 缺 aria-label（有 figcaption 即视为满足） | 补 caption（写图的主张，不是描述）；explain/editorial 手绘图补 aria-label |
