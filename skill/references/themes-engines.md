# 主题与双引擎（按需读取）

> 换主题、选引擎、调 Pele 布局参数时读本文。日常出图不需要——默认 `tech` + `--engine pele` 已覆盖办公场景。

## 主题速记

| 场景 | `-t` |
| --- | --- |
| 技术方案/周报/投屏（默认） | `tech`（形状分色：蓝流程 / 琥珀判定 / 绿状态 / 紫存储；填色可见，不是发丝描边） |
| 开源 README | `openai` / `openai-dark` |
| 暗色文档 | `mocha` |
| 轻松分享 | `sketch`（手绘风，自动切 `--engine mermaid`——Pele 无手绘实现） |

`--brand` 只改扩展块强调色（卡片左边条、kpi 数字、swimlane 第一条跨带箭头），**不**把判定菱形改成品牌色、不重涂 flowchart 形状分色。叠加顺序：主题 → `--brand` → `--theme-js` → `--config` → `--css`。

## 双引擎差别

差别在**布局和画法**，不是配色更好。flowchart 蓝/琥珀/绿/紫是同一套 `tech` token。拼图对照（仓库内）：`tests/contact-sheet-pele.png` / `tests/contact-sheet-mermaid.png`。

| 要什么 | 用哪个 |
| --- | --- |
| 流程 / 时序 / 状态（办公默认） | `--engine pele`（默认）：宽 S 弯、subgraph 成员位置更贴源码、sequence 带序号且中文能换行 |
| C4 深色块 + 小人、思维导图按枝上色盒子、`@{icon}` | `--engine mermaid`（flowchart 才走 ELK；C4 吃主题 `c4` 节） |
| 手绘风 | `-t sketch`（自动 mermaid） |

## 引擎相关参数

- `--layout elk|dagre` **只作用于 mermaid 的 flowchart**；Pele 自带布局，时序/C4/思维导图/gitgraph 是两套引擎各自排版
- Pele 下 `--config` 只认：`flowchart.nodeSpacing` / `rankSpacing` / `wrappingWidth` / `curve`、`fontSize`、`padding`；mermaid 专属键（`themeCSS`、`look`、`layoutAlgorithm` 等）在 Pele 下忽略
- 扩展块与 PNG 像素裁切始终走 Chromium，与引擎无关

## 附录 — 开发文档场景（能渲染、不主推）

sequence、state、class、ER、gitgraph、C4。办公选型不要从这里起；确属开发文档场景直接用，语法与 mermaid 相同。
