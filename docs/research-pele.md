# 后续：Pele 作为 mermaid 渲染引擎

> 状态：backlog · 前置：`--preset column` 在聊天窄栏用一段时间  
> 对象：[obsidianmd/pele](https://github.com/obsidianmd/pele)（MIT，v1.8.0+，Mermaid 12.1 语法、自研布局）

## 为什么还不动

`--preset column` 已经对准「出图宽度 ≈ 显示栏宽」。Pele 的 `maxWidth` + `autoDirection`（LR→TB）是更强的拓扑重排，但会换掉 mmdx 现在绑在 mermaid 上的东西：`tech` 形状分色、ELK、`--theme-js` / `--config`、`sketch` 手绘、像素基线。仓库也才刚开源，布局还在变。

PNG 截图和 table/kpi 等扩展块仍然走 Chromium，换引擎去不掉 Edge。

## 值得偷的（已并入 column，不必等 Pele）

| Pele | mmdx 对应 |
| --- | --- |
| `maxWidth` | `--preset column` 800px wrap（2K 约 1/3） |
| `autoDirection`（&lt;640 翻 TD） | `column-landscape` 警告 + skill 规定聊天用 TD |
| CSS 变量主题 | 已有 `--brand` token；不搬 `--pele-*` |

## 何时再拆实施任务

用现有 `tests/diagrams` 做一次视觉 spike（`--engine pele` 实验开关即可），同时满足：

1. CJK 换行与像素留白裁切仍过 `bun run test`
2. `tech` 形状分色能映射到 `.pele-shape-rect` / polygon / circle
3. flowchart / sequence 人工审查可接受（允许连线路径与 mermaid 不同）
4. `--theme-js` / `--config` / `sketch` 有明确降级或适配说明

过关后再把默认引擎从 mermaid 换成 Pele；不过关就保持 mermaid + column。

## 不做

- 用 Pele 重写扩展块
- 为了去 Chromium 而丢掉 PNG 像素裁切
- 在 column 未验收前并行换引擎
