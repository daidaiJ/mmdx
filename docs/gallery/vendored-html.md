> [English](vendored-html.en.md) · 中文

# 两个手绘 HTML 模板（v1.4.2）

上一个 tag 的展示页用的是 vendored 的两个手绘 HTML skill，不是 mmdx 主题预设：

- **editorial**：来自 `diagram-design`，paper/ink 色板、4px 网格、衬线标题、mono 小标签、手绘 SVG。
- **visual-explainer**：来自 `visual-explainer` 的 `paper` register，暖纸底、Newsreader 衬线标题、Atkinson 正文、墨蓝强调、10px 圆角。

它们都走「手写自包含 HTML → `mmdx page.html --scale 3`」导出，和当前 v2 的围栏/主题管线不同。

导出这条链路的三项能力（v1.4.0–v1.4.2）：整页 `.html` 原样截图为 PNG（fullPage，只出 PNG，页面自带样式/脚本/背景全保留，`--width` 是布局视口，页面显式更窄的 `body` 宽优先）；三套内嵌中文字体——Noto Sans SC 黑体（默认）、Noto Serif SC 宋体（serif 栈与 `serif` 泛型的 CJK 兜底）、霞鹜文楷楷体（`'LXGW WenKai'`，手绘标注显式声明）；导出时自动跑 figure lint（`figure-overflow` / `figure-text-overlap` / `figure-text-adhesion` / `figure-small-text` / `figure-uncaptioned` / `svg-aria-label`），结果进 `--json.warnings`。两项样张都是 lint warnings = 0。

## editorial（diagram-design）

![editorial 原始展示](vendored-editorial.png)

**特点**：`#F7F4EE` 纸底、`#1F2328` 墨线、`#2563EB` 蓝强调、`#D8D2C4` 分隔线；Georgia / Noto Serif SC 标题，`ui-monospace` 小标签；4px 网格、2px 描边、手绘层带。

**适合**：封面、架构插图、方案一页纸、设计评审、低频高价值的 editorial 页面。

**避免**：高频周报、密集数据表、需要逐像素对齐的合规材料。

**当前近似**：`excalidraw` 承接手绘线条与粉彩手感；`openai` 承接克制配色与发丝边框。这些只是围栏主题的近似；要原版 paper 色板与 4px 网格，直接走下面的 HTML 导出。

## visual-explainer（paper register）

![visual-explainer 原始展示](vendored-visual-explainer.png)

**特点**：`#F7F7F4` 暖纸底、`#17191C` 正文、`#2C4CD0` 墨蓝强调、`#E3E3DC` 边框；Newsreader 衬线标题、Atkinson Hyperlegible 正文、10px 圆角；叙事段落 + 手绘机制图 + waffle/bars。

**适合**：解释页、复盘页、评审页、recap、幻灯片页；需要“讲故事”的技术内容。

**避免**：合规/审计、严格数据表、高密度仪表盘。

**当前近似**：`openai + paper` 最接近克制版式与衬线图题；蓝色强调可借 `tech` 的 accent。暖纸底没有对应预设保留。

## 对照

| 旧模板 | 当前主题近似 | tone | 关键差异 |
| --- | --- | --- | --- |
| `editorial` | `openai` | `neutral` | 旧模板是 paper/ink/蓝 + 4px 网格；`openai` 是纯白/墨黑/薄荷 + 发丝边框 |
| `editorial`（手绘层带） | `excalidraw` | `neutral` | 旧模板是纸底手绘 SVG；`excalidraw` 是白底 + 墨线抖动 + 粉彩填色 |
| `visual-explainer`（paper） | `openai` | `paper` | 旧模板是暖纸底 + Newsreader 衬线；`openai` 是纯白底，衬线只来自 tone |
| `visual-explainer`（蓝强调） | `tech` | `neutral` | 旧模板单一墨蓝；`tech` 用蓝/琥珀/绿承担形状语义 |

## 复现

原始手绘 HTML（源文件在 `tests/`，需要用当前二进制重出样张时）：

```bash
mmdx tests/editorial-showcase/layer-stack.html -o out/editorial.png --scale 3
mmdx tests/explain-e2e/cache-read-path.html -o out/explain.png --scale 3
```

只想在围栏管线里近似那种观感：

```bash
mmdx card --in note.md -t openai --tone paper -o out/editorial-like.png
mmdx card --in note.md -t openai --tone neutral -o out/explainer-like.png
```

[返回画廊](../GALLERY.md) · [两个 HTML 场景模板](html-skills.md)
