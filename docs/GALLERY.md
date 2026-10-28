> [English](GALLERY.en.md) · 中文

# 风格画廊

同一个案例，按风格拆成独立页。主页只留一张流程图做快速对比；新增主题按同样结构追加一页，不会把总览撑爆。

[![同一案例在三种风格下的流程图](gallery/overview.png)](gallery/overview.png)

## 3 套主题总览

3 套内置主题各出一张同一流程，先看整体差异，再进分页看块版式：

[![3 套内置主题总览](gallery/all-themes-overview.png)](gallery/all-themes-overview.png)

## HTML 场景模板

两个引入的 HTML 出图场景也已按风格出图：报告卡（OpenAI 编辑风 skill）和信息卡（qiaomu 信息卡 skill）。

| 报告卡（3 套主题） | 信息卡（独立 skill） |
| --- | --- |
| [![openai 报告卡](gallery/html-report-openai.png)](gallery/html-skills.md) | [![paper 信息卡](gallery/card-tone-paper.png)](gallery/card-tones.md) |

完整对照见 [两个 HTML 场景模板](gallery/html-skills.md)。

## 手绘 HTML 模板（v1.4.2）

上一个 tag 的展示页用的是 `editorial` 与 `visual-explainer` 两个手绘 HTML skill；它们不是 v2 的主题预设，原始样张与当前主题近似映射见 [手绘 HTML 模板](gallery/vendored-html.md)。

| editorial | visual-explainer |
| --- | --- |
| [![editorial](gallery/vendored-editorial.png)](gallery/vendored-html.md) | [![visual-explainer](gallery/vendored-visual-explainer.png)](gallery/vendored-html.md) |

## 这个案例

「灰度发布复盘」：一次上线之后的流程、指标、机制和遗留项。它同时覆盖一张流程图和三种办公扩展块，内容不依赖具体行业，适合横向比较版式与配色。

案例源码在 [examples/gallery/release-review.md](../examples/gallery/release-review.md)。总览图用同一案例的纵向简版，方便在 README 宽度下看清文字；分页里是完整流程图与三个扩展块。

## 风格索引

先按“适合”列选场景，再看观感；`tone` 只影响块页和信息卡。

| 风格 | 适合 | 观感 | 完整对照 |
| --- | --- | --- | --- |
| `tech`（默认） | 方案文档、周报、通用交付 | 蓝 / 琥珀 / 绿形状分色，1.5px 描边，信息密度最高 | [tech](gallery/tech.md) |
| `openai` | 对外报告、工程文档、极简 README | 纯白、墨黑、薄荷绿点缀，发丝边框，形状只靠细边框区分 | [openai](gallery/openai.md) |
| `excalidraw` | 白板讨论、脑暴、非正式分享 | 粉彩填色 + 墨线抖动，白板卡片，中文用楷体回退 | [excalidraw](gallery/excalidraw.md) |
| HTML 报告卡 / 信息卡 | 把两个引入的 HTML 场景套到不同主题 | 同一份内容，主题和 `--tone` 分别控制配色与结构 | [html-skills](gallery/html-skills.md) |
| 手绘 HTML（v1.4.2） | editorial 封面/插图；visual-explainer 解释页/复盘 | 手写 HTML + SVG，paper/ink/蓝；不属主题预设 | [vendored-html](gallery/vendored-html.md) |

三套主题共用同一套 Markdown：图还是那张图，`kpi` / `card` / `table` 围栏也不变，只换 `-t`。`--brand` 只覆盖强调色，形状分色由主题保留。

两个 HTML 场景的跨风格对照见 [html-skills](gallery/html-skills.md)；信息卡的 `paper` / `neutral` / `product` 三种结构见 [信息卡 tone 对照](gallery/card-tones.md)。

总览固定展示这三套内置主题；后续新增主题只加分页和索引行，不再往总览里塞图。

## 复现

```bash
node --experimental-transform-types --no-warnings scripts/make-gallery.ts
```

脚本会读取案例源码，写入三套主题的分场景图、报告卡与信息卡、3 张信息卡 tone 图，以及两张总览图。`vendored-*.png` 是 v1.4.2 的手绘 HTML 原始样张，可用 `mmdx tests/editorial-showcase/layer-stack.html --scale 3` 一类命令从 `tests/` 源码重出。

单独渲染其中一张：

```bash
mmdx examples/gallery/release-review.md -t openai -o out/
mmdx examples/gallery/release-review.md -t excalidraw --style-fill hachure -o out/
```

## 相关

- [主题定制](HUMAN_GUIDE.md#主题定制)
- [扩展块图鉴](EXTENSIONS.md)
- [风格移植决策与实现记录](STYLE_PORTS.md)
