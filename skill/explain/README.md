# explain — vendored 自 nicobailon/visual-explainer（规格化改造版）

> **来源**：[nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) @ commit `5f378868e0ea745a6284b51e710c390f0c76f72c`（v0.14.0，2026-10-25 嵌入）
> **许可证**：MIT，全文见 [LICENSE-visual-explainer](LICENSE-visual-explainer)；kit/fonts/ 拉丁字体均为 SIL OFL（各家族 OFL-*.txt 随附）
> **嵌入范围**：上游**规格层与静态资产**——`UPSTREAM-SKILL.md`（原名 `SKILL.md`，原文未改）、`references/` 6 篇、`kit/kit.css + defs.svg`（原文）、`templates/` 参照页、`kit/fonts/` 拉丁字体包、`kit/starter-*.html`（本仓库生成物，[scripts/explain-starter.ts](../../scripts/explain-starter.ts)）。**上游运行时一个文件不随附**（render/flow/ask/tags/html.mjs、kit.js、look.mjs、plan/、pptx/、video/、mcp/、eval/、extension.ts）——mmdx 语境下它被 starter 装配 + mmdx 导出取代（调研与论证见 [docs/research-visual-explainer.md](../../docs/research-visual-explainer.md) §5 路线 D）。`references/plans.md / motion.md / video.md` 未随附：分别依赖 plan 运行时、JS 交互、视频管线，均不在 PNG 交付场景。
> **分发**：本目录随 `skill/` 一起被宿主安装，离线可用。

## 这是什么，和 mmdx 什么关系

visual-explainer 是「工程解释页」Agent Skill（10.6k★）：把系统、代码变更、计划、概念变成**以图为主干、文字只做标注**的单页——diff/plan 评审、project recap、概念解释、HTML 幻灯片。对应 mmdx 场景分级的**叙事档**（见 [../SKILL.md](../SKILL.md)）：

- 高速办公出图 → 围栏（不变）；单张 editorial 封面 → [../editorial/](../editorial/README.md)
- **多图叙事解释页 / 评审页 / recap / 幻灯片页**（低频、要「十分钟看懂」）→ 本目录规格 + mmdx 导出
- explain 内的图只做**页内 figure**，不抢围栏/editorial 的单图交付

## 用法（三步）

1. **复制 starter**（register 决定气质：`instrument` 科技默认 / `blueprint` 工程 / `paper` 论文 / `editorial` 杂志）：

```bash
cp <skill>/explain/kit/starter-instrument.html name.html
```

starter 已内联 kit.css + defs.svg + 该 register 全部拉丁字体（data-URL，离线一致）——**head 不要动**，kit 资产永远不进上下文、不要去读 kit.css。

2. **编辑 `<main>`**：写作纪律读 [UPSTREAM-SKILL.md](UPSTREAM-SKILL.md) 的 Show, don't tell / Words / Look / Known traps 节（**Deliver 与 Animate 节作废**，见下表）；动笔前再读 [references/style-guide.md](references/style-guide.md)（register 主题）与 [references/diagrams.md](references/diagrams.md)（手绘 SVG 画法）——渐进披露，只读当前场景需要的那篇。
3. **导出自检（机器 lint + 一眼目检）**：

```bash
mmdx name.html -o out/name.png --scale 3 --json --quiet
```

导出时自动跑 **figure lint**（吸收自上游 render 闸门 + 手绘几何检查）：越界（`figure-overflow`）、压字（`figure-text-overlap`）、粘连（`figure-text-adhesion`，间距 < max(4px, 字高×35%)）、有效字号 <11px、缺 caption/aria——消息带图号、文本内容、viewBox 坐标与方向，按坐标改源码。**修到 `--json.warnings` 清零**，再 Read 看一眼 PNG（首屏即答案、每图主张式 caption）确认整体，小步修最多 2 轮。告警语义见 [../references/troubleshooting.md](../references/troubleshooting.md)。

## 对上游文本的覆盖（mmdx 适配层）

上游文件保持原文（便于 diff 同步）；在 mmdx 语境下以下列为准：

| 上游写的 | mmdx 语境下改为 |
| --- | --- |
| 写 `.src.html` + `node render.mjs` 渲染（kit 内联/错误闸/QA sheet） | **不存在**：starter 即内联产物，直接写最终 `name.html`（自包含）；错误闸的等价物 = mmdx 导出时的 figure lint（`--json.warnings`，见用法第 3 步），QA sheet 的等价物 = lint 清零后 Read PNG 一眼确认 |
| `<ve-bars>` `<ve-waffle>` `<ve-stack>` `<ve-flow>` 数据标签（渲染期展开） | **手写展开形态 SVG**：类名 `ve-bars` / `ve-waffle` / `ve-stack` 照用，几何照 [references/kit.md](references/kit.md) 尺寸约定，范例见 `templates/page.html` Fig.2 与 starter 骨架 |
| 页内 `<pre class="mermaid">`（构建期 pele 化） | **mmdx 预渲**后内联：`echo 'graph LR; A-->B' \| mmdx - -f svg -o fig1.svg`，把 SVG 文件内容**原样**贴进页内 `<div class="frame">`（吃 mmdx 引擎/主题/中文字体）。**不要改内联 svg 的标签**：根元素自带 `style="--pele-*"` 主题变量，再添一个 `style` 属性会因 HTML 重复属性被丢弃，全图回退黑色 |
| steppers / replay / flow dots / live figures（motion.md，依赖 kit.js） | **PNG 页禁用**：不写 `data-s` / `ve-player` / `ve-at`（无 JS 时是幽灵态，字会消失）；过程用静态编号箭头画；KPI 的 `data-count` 可留（无 JS 静态显示原值） |
| `<ve-ask>` 交互问答（ask.js / reply.js） | 不随附，PNG 交付无此场景 |
| Google Fonts CDN 链接 | 不需要：starter 已按 register 内嵌拉丁字体 |
| `~/.agent/diagrams/` 输出目录 | 当前工作区 / 用户指定路径 |
| MCP / Pi / 插件宿主接入 | 不适用；只取 skill 文件形态 |

## 中文实践（三家族，mmdx 渲染管线注入）

mmdx 导出时自动注入三套中文字体（GB2312 全量子集，离线一致），页面**无需内嵌任何 CJK**：

- **正文中文** → 自动走 `'Noto Sans SC'`（黑体）：不写 font-family 就是它，科技/工程 register 的正确形态
- **serif register（paper / editorial）的中文标题** → 自动走 `'Noto Serif SC'`（宋体）：serif 泛型的 CJK 兜底已换绑宋体，中文标题与 Newsreader / Instrument Serif 气质配对，不断档
- **手绘 figure 的中文标注 / 旁注** → 显式 `font-family:'LXGW WenKai'`（楷体，与手绘线条最搭）；字重只有 400，强调用颜色/下划线不加粗
- 简中写作纪律同 UPSTREAM Words 节：标题即结论、一段一义、caption 是主张不是描述

## 同步上游

嵌入是快照、不自动追更。需要更新时（references 与 kit 资产跟上游演进；运行时永远不跟）：

```bash
git clone --depth 1 https://github.com/nicobailon/visual-explainer
cd visual-explainer/plugins/visual-explainer
cp SKILL.md <mmdx>/skill/explain/UPSTREAM-SKILL.md
cp references/{diagrams,extras,kit,slides,style-guide,themes}.md <mmdx>/skill/explain/references/
cp kit/kit.css kit/defs.svg <mmdx>/skill/explain/kit/
cd <mmdx> && bun run scripts/explain-starter.ts   # 用新 kit.css 重新生成 starter
# 更新本文件的 commit 号；kit.css 若改了字体表，同步核对 kit/fonts/ 家族清单
```
