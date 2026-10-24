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
| `icon pack "xxx" not found` | 网络不通 | 去掉 `--icon` |
| 中文变方块 | 不应发生 | 检查 `--config`/`--theme-js` 是否覆盖 fontFamily |
| exit 1 + `Parsing error` / 超限信息 | **图或围栏写错** | 按信息修；围栏细则见 [fences.md](fences.md) |
| exit 2 | 参数用法错误 | `mmdx --help` |
| HTML 输入 `-f svg` 提示 `renders to PNG only` | 正常降级 | HTML 整页截图只有 PNG；需要矢量走 mermaid 图型的 SVG |

## `--json.warnings` 处置

| code | 含义 | 处置 |
| --- | --- | --- |
| `column-landscape` | 源是 `flowchart LR/RL`，窄栏会横缩 | 改 `flowchart TD` |
| `column-shrink` | 图内在宽度超 800px 栏宽，会被 CSS 缩小 | 砍节点 / 拆图 / 换 `--preset a4`；**不要**加大 `--width`（缩完字更小） |
| `pie-sectors` 等 `*-over` | 超 §1a 预算 | 拆「总览 + 局部」或交 AntV；`--strict-chart` 可把 mermaid 超限升为错误 |
| `brand-contrast` | `--brand` 色在白底上对比度 < 4.5:1（WCAG AA） | 换更深的色；颜色按原样保留未改 |
