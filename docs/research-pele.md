# 后续：Pele 作为 mermaid 渲染引擎

> 状态：**done**（v1.3.0，2026-10-23）· 对象：[obsidianmd/pele](https://github.com/obsidianmd/pele)（MIT，v1.9.0，Mermaid-12.1 语法、自研布局）

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
