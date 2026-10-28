> [English](card-tones.en.md) · 中文

# 信息卡：同一模板，三种 tone

`mmdx card` 把 Markdown 或网页正文转成信息卡。`--theme` 决定配色，`--tone` 决定结构：圆角、阴影、标题字体与表格头处理。
信息卡已独立为 [`info-card-designer`](../../skill/info-card-designer/SKILL.md)：URL/文本 → 杂志感 HTML → PNG，480/600/900 宽度，>1200px 自动拆分。


三张图使用同一个案例、同一个 `openai` 配色，只换 `--tone`：

## `paper` — 纸质报告

衬线标题、16px 圆角、较大的内边距。适合打印、长文摘要和对外报告。

![paper tone](card-tone-paper.png)

## `neutral` — 中性文档（默认）

无衬线标题、10px 圆角、无阴影。适合工程文档和知识库。

![neutral tone](card-tone-neutral.png)

## `product` — 产品界面

6px 圆角、细阴影、紧凑内边距。适合产品发布说明和仪表盘侧栏。

![product tone](card-tone-product.png)

## 命令

```bash
mmdx card --in examples/gallery/info-card.md -t openai --tone paper -o card-paper.png
mmdx card --in examples/gallery/info-card.md -t openai --tone neutral -o card-neutral.png
mmdx card --in examples/gallery/info-card.md -t openai --tone product -o card-product.png
```

[返回画廊](../GALLERY.md) · [openai 风格](openai.md)
