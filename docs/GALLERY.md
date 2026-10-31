> [English](GALLERY.en.md) · 中文

# 风格画廊

同一个案例，按风格拆成独立页。主页只留一张流程图做快速对比；新增主题按同样结构追加一页，不会把总览撑爆。

[![同一案例在八套主题下的流程图](gallery/overview.png)](gallery/overview.png)

## 8 套主题总览

8 套内置主题各出一张同一流程，先看整体差异，再进分页看块版式：

[![8 套内置主题总览](gallery/all-themes-overview.png)](gallery/all-themes-overview.png)

## 场景引导（状态图）

把一次故障 / 一次审批的「处境怎么变」画成状态图，风险状态打标记。同一张图两档观感：网格纸报告（`--tone paper`）与 iOS 系统界面（`-t ios`）。

| 网格纸报告 | iOS 系统界面 |
| --- | --- |
| [![场景引导 · 网格纸报告](gallery/scenario-paper.png)](gallery/scenario.md) | [![场景引导 · iOS 系统界面](gallery/scenario-ios.png)](gallery/scenario.md) |

规则与复现命令见 [场景引导（状态图）](gallery/scenario.md)，源码在 [examples/gallery/scenario.md](../examples/gallery/scenario.md)。

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

「灰度发布复盘」：一次上线之后的流程、指标、机制和遗留项。它同时覆盖一张流程图、一张饼图（` ```chart ` 围栏）和三种办公扩展块，内容不依赖具体行业，适合横向比较版式与配色。

案例源码在 [examples/gallery/release-review.md](../examples/gallery/release-review.md)。总览图用同一案例的纵向简版，方便在 README 宽度下看清文字；分页里是完整流程图、饼图与三个扩展块。流程图用满四个形状族（胶囊 / 矩形 / 菱形 / 圆柱），饼图用满系列色，所以一张分页就能看出主题的形状分色与图表配色。

## 风格索引

先按“适合”列选场景，再看观感；`tone` 只影响块页和信息卡。

| 风格 | 适合 | 观感 | 完整对照 |
| --- | --- | --- | --- |
| `tech`（默认） | 方案文档、周报、通用交付 | 蓝 / 琥珀 / 绿形状分色，1.5px 描边，信息密度最高 | [tech](gallery/tech.md) |
| `openai` | 对外报告、工程文档、极简 README | 纯白、墨黑、薄荷绿点缀，发丝边框，形状只靠细边框区分 | [openai](gallery/openai.md) |
| `excalidraw` | 白板讨论、脑暴、非正式分享 | 粉彩填色 + 墨线抖动，白板卡片，中文用楷体回退 | [excalidraw](gallery/excalidraw.md) |
| `ios` | 产品界面、iOS 应用说明、需要「系统感」的截图 | 纯平面分组浅灰底 + 白卡片 + 发丝分隔线 + 系统色；卡片不加强调色边条 | [ios](gallery/ios.md) |
| `acnh` | 周报贴纸、团队看板、轻松汇报 | 奶油纸 + 粗棕描边 + 硬偏移贴纸阴影 + 圆体字，块页带点阵纸纹 | [acnh](gallery/acnh.md) |
| `epaper` | 黑白打印、墨水屏阅读、合规与审计文档 | `#F5F1EB` 纸底 + 纸纹颗粒 + 发丝黑描边 + 直角无阴影，形状族靠灰阶与形状区分 | [epaper](gallery/epaper.md) |
| `zed` | 暗色文档站、技术分享、终端风格的交付 | Zed One Dark：`#282C33` 画布 + 发丝线 + 无投影无底纹，节点按读取顺序轮转 8 个 player 色（非形状分色） | [zed](gallery/zed.md) |
| `zed-light` | 与 `zed` 配对的亮色编辑风 | One Light：`#FAFAFA` 画布 + `#EBEBEC` 编辑器面板 + 同一套轮转规则 | [zed-light](gallery/zed-light.md) |
| 场景引导（状态图） | 故障复盘、审批、发布的「处境怎么变」 | 状态 = 读者能看见的处境，风险状态打标记；纸底或玻璃底 | [scenario](gallery/scenario.md) |
| HTML 报告卡 / 信息卡 | 把两个引入的 HTML 场景套到不同主题 | 同一份内容，主题和 `--tone` 分别控制配色与结构 | [html-skills](gallery/html-skills.md) |
| 手绘 HTML（v1.4.2） | editorial 封面/插图；visual-explainer 解释页/复盘 | 手写 HTML + SVG，paper/ink/蓝；不属主题预设 | [vendored-html](gallery/vendored-html.md) |

八套主题共用同一套 Markdown：图还是那张图，`kpi` / `card` / `table` / `chart` 围栏也不变，只换 `-t`。`--brand` 只覆盖强调色，形状分色由主题保留。

两个 HTML 场景的跨风格对照见 [html-skills](gallery/html-skills.md)；信息卡的 `paper` / `neutral` / `product` 三种结构见 [信息卡 tone 对照](gallery/card-tones.md)。

总览（`all-themes-overview.png`）展示当前全部内置主题；后续新增主题按同样结构加分页、索引行与总览格。

## 复现

```bash
node --experimental-transform-types --no-warnings scripts/make-gallery.ts
```

脚本会读取案例源码，写入八套主题的分场景图（流程图 / 饼图 / KPI / 卡片 / 表格）、报告卡与信息卡、3 张信息卡 tone 图、`--tone paper` 的块页报告（`tone-paper-report.png`）、场景引导两张（网格纸 / iOS 系统界面），以及两张总览图。`vendored-*.png` 是 v1.4.2 的手绘 HTML 原始样张，可用 `mmdx tests/editorial-showcase/layer-stack.html --scale 3` 一类命令从 `tests/` 源码重出。

单独渲染其中一张：

```bash
mmdx examples/gallery/release-review.md -t openai -o out/
mmdx examples/gallery/release-review.md -t excalidraw --style-fill hachure -o out/
```

## 相关

- [主题定制](HUMAN_GUIDE.md#主题定制)
- [扩展块图鉴](EXTENSIONS.md)
- [风格移植决策与实现记录](STYLE_PORTS.md)
