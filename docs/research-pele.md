# 后续：Pele 作为 mermaid 渲染引擎

> **2026-10-28 补记：** Mermaid/ELK 回退已在 2.x 移除——`--engine`、`--layout` 与 `--json.fallbacks` 都不存在了，Pele 是唯一引擎（`sketch` 也已随主题收敛移除）。下面「已落地 / 降级说明」两节是当时的记录：其中 `--engine mermaid`、`--layout elk|dagre`、「`sketch` 自动回退」、「`--icon` 未接线」均已过时——图标现已通过 Pele 的 `icons` 回调注入，C4 的 `UpdateElementStyle` 也能改单个元素颜色。

> 状态：**done**（v1.3.0，2026-10-23）· 对象：[obsidianmd/pele](https://github.com/obsidianmd/pele)（MIT，v1.9.0，Mermaid-12.1 语法、自研布局）

> 另见 [research-zed-mermaid.md](research-zed-mermaid.md)：Zed 用纯 Rust 的 merman 出 SVG，并把每个 mermaid 块做成「图 / 源码」两个 tab——引擎与交互两条线的移植评估（2026-10-29）。

## 已落地

`--engine pele|mermaid`（默认 `pele`）。Pele 在页面内渲染（复用 Chromium 已加载的 CJK 字体），自研布局 + 宽 S 弯路由，流程图连线默认曲线。mermaid 保留为回退（`--engine mermaid`），并把 `flowchart.curve` 从 `linear` 改为 `basis`。

- 形状分色映射到 `.pele-shape-*`（过程蓝 / 判断琥珀 / 状态绿 / 存储紫），各主题 `--pele-*` 由 themeVariables 派生。
- `sketch` 无手绘 Pele 实现 → 自动回退 mermaid；`--layout elk|dagre` 仅对 mermaid 生效（并修复了此前 `layoutAlgorithm` 未写入导致 ELK 未激活的问题）。
- 扩展块（table/kpi/…）与 PNG 像素裁切仍走 Chromium，未变。
- 依赖：`pele@1.9.0`，`vendor/pele.global.js` + `src/embed.generated.ts` 的 `PELE_JS`。

详细落地清单与剩余缺口见 [tasks/p3-pele-engine.md](../tasks/p3-pele-engine.md)。

## 降级说明

- `--theme-js` / `--config`：Pele 生效 `flowchart.nodeSpacing/rankSpacing/wrappingWidth/curve`、`fontSize`、`padding`；mermaid 专属键（`themeCSS`、`look`、`layoutAlgorithm`、`sequence.*`）忽略。
- `--icon`：iconPacks 仍只注册给 mermaid，Pele 下不解析图标（未接线）。
- C4 / mindmap 的 mermaid 专属配色（`c4` 节、按枝上色）Pele 未吃到；补齐思路见 [research-layout-color.md](research-layout-color.md)。

## 不做

- 用 Pele 重写扩展块
- 为了去 Chromium 而丢掉 PNG 像素裁切
