# 后续：从同类「文本 → 图」里抽布局/配色，不引入第二套语法

> **2026-10-28 补记：** Mermaid/ELK 回退已在 2.x 移除，Pele 是唯一引擎——`--engine`、`--layout` 不再存在。下文凡提到 `--engine`、`--layout`、mermaid 回退或 ELK 的部分都只是当时的调研记录，不是当前选项。

> 状态：调研 · 2026-10-23  
> 前提：mmdx 默认 Pele、mermaid+ELK 作回退（该回退已在 2.x 移除）；输入仍是 mermaid 围栏 + 办公扩展块  
> 对照实测（历史记录，mermaid 一版已随第二引擎删除）：同一份 `tests/diagrams`，见 [contact-sheet-pele.png](../tests/contact-sheet-pele.png)

## 结论先行

不引入 D2 / PlantUML / Kroki / 新 GitHub mermaid skill / 让模型手绘 SVG。那些项目换的是**语言或交付形态**，mmdx 的卖点是同一份围栏在任意机器上吐同一张 PNG。

值得抽的是它们已经做对、而 mmdx 还只做了一半的**底层旋钮**：

1. **语法与布局引擎解耦**（D2：dagre / ELK / TALA；mmdx 曾有 `--engine`，2.x 已移除）
2. **边路由作为一等配置**（Graphviz `splines=`、ELK `ORTHOGONAL|SPLINES`）
3. **语义角色上色**（C4 person/system/external，不是「所有 rect 一色」）
4. **先测文字再排版**（Pele / 正确的 sequence 字号；mermaid 全局 `fontSize` 不进 sequence 布局是反例）

## 明确不引进

| 对象 | 为什么停在门外 |
| --- | --- |
| D2 语法、PlantUML、Pintora 方言 | 第二套 parser；Agent 已经会写 mermaid |
| Kroki / mermaid MCP / VS Code 预览插件 | 远程服务或 IDE 壳，不解决出图确定性 |
| diagram-design、Excalidraw、模型手绘 HTML | 已在 [research-diagram-design.md](research-diagram-design.md) 否决主路径 |
| TALA 源码 | 架构布局算法可参考思路；许可证 API 标 `NOASSERTION`，未核到可复制条款前不搬代码 |
| AntV G6 / Cytoscape 当默认引擎 | 交互图库，办公 PNG 管线用不上力 |

GitHub 上热门的 mermaid skill / MCP 大多是「模型写 mermaid + 调 mermaid.js」。mmdx 已经是这条链路的渲染端；再接一个 skill 不会改善折线或 C4 配色。

## 可抽的旋钮（按收益）

### 1. 边路由从布局里拆出来 — 优先（mermaid 回退）

Graphviz 把 `splines=spline|ortho|polyline|curved` 做成图属性；ELK 有 `edgeRouting=ORTHOGONAL|POLYLINE|SPLINES`（SPLINES 的控制点按分段三次样条解释）。mermaid+ELK 现在仍偏折角，即使 `flowchart.curve: basis`。

可做（历史方案，`--engine mermaid` 已移除，仅存档）：在 mermaid 回退的 ELK 配置里打开 splines（或 layered 的 sloppy spline 模式），作为 Pele 之外的折线补丁。不换语法。**未在本仓库实测 mermaid-layout-elk 是否暴露该 option**。

### 2. 语义角色 → token，而不是按 SVG 标签上色 — 优先（Pele C4 / mindmap）

Structurizr / mermaid C4 用 person / system / external 决定填色。mmdx 的 mermaid 路径已经有 `c4:` 深色块；Pele 忽略这段，C4 变成浅色办公卡。思维导图 mermaid 按枝上色盒子，Pele 是曲线 + 纯文字叶子。

可做：在 `peleCss` 里认 `.pele-c4-person` / `external` / `pele-shape-*` 的图种类名，把现有 `c4.*` 和 mindmap section 色映射到 `--_s/--_b`。flowchart 形状分色保持。这是配色层补齐，不是新引擎。

### 3. 容器方向与「贴着谁」— 中（subgraph）

D2/TALA 允许容器级 `direction`、以及 `near`（贴某个对象）。Pele flowchart 实测里，源码写在集群外的节点会留在框外；ELK 有时把 worker 掉进框右下。

可做：文档里把「subgraph 只列成员」写成硬规则（skill 已要求命名 subgraph）；代码侧若 Pele 仍偶发吞节点，再查 compound layout 的 parent 赋值。不要为了 `near` 引入 D2。

### 4. 窄栏先翻方向再缩小 — 已有

Pele 的 `maxWidth` + `autoDirection`（&lt;640 把 LR 翻 TD）和 mmdx `--preset column` 是同一类问题。保持 column 警告，不必再接 D2 的响应式布局。

### 5. paper / ink / muted / accent / series — 已有一半

Pele 根上已是 CSS 变量；`tech` 从 themeVariables 派生。diagram-design 的一强调色不要替代 flowchart 形状分色。扩展块已经走 `--brand`。缺的是 C4/mindmap/gitgraph 也接到同一组变量（见 §2）。

## 实施顺序（有空再拆任务）

1. Pele：C4 / mindmap 类名映射到现有 token（配色补齐，行为仍是 Pele 布局）
2. ~~mermaid 回退：探 ELK `edgeRouting=SPLINES`~~（2.x 已移除该回退，此项作废）
3. skill 保持「按意图选图」；不接新 MCP、不接新图语言

## 来源（已用 gh / 文档页核对过的）

- ELK `edgeRouting`：https://eclipse.dev/elk/reference/options/org-eclipse-elk-edgeRouting.html （已读选项表）
- Graphviz `splines`：https://graphviz.org/docs/attrs/splines/ （已读）
- D2 布局引擎切换：https://d2lang.com/tour/layouts/ （已读；dagre / ELK / TALA）
- TALA：https://github.com/terrastruct/TALA （gh：304★，license 未断言；只作思路、不搬代码）
- Pintora：https://github.com/hikerpig/pintora （MIT，1282★，另一套方言 → 不引进）
- diagram-design 融合边界：本仓库 [research-diagram-design.md](research-diagram-design.md)
