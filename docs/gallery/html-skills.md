> [English](html-skills.en.md) · 中文

# HTML 报告卡

Open Design 的 OpenAI 编辑风 skill：用 `card` / `kpi` / `table` 围栏拼出一页报告卡。同一组块、同一份内容，只换主题。信息卡已独立为 [info-card-designer](../../skill/info-card-designer/SKILL.md)，不在本页堆变体。

## `tech` + `neutral`

蓝 / 琥珀 / 绿形状分色、1.5px 描边，报告卡沿用通用块版式，信息密度最高。

![tech 报告卡](html-report-tech.png)

## `openai` + `neutral`

纯白、墨黑、薄荷绿点缀、发丝边框，形状只靠细边框区分；最接近该 skill 的克制感。

![openai 报告卡](html-report-openai.png)

## `excalidraw` + `neutral`

粉彩填色 + 墨线抖动、白板卡片、手写字体回退；适合非正式分享。

![excalidraw 报告卡](html-report-excalidraw.png)

## 复现

```bash
mmdx examples/gallery/release-review.md -t openai --tone neutral -o out/report.png
```

信息卡（URL/文本 → 杂志感卡片）走独立 skill：

```bash
mmdx card --in note.md -t openai --tone paper -o card.png
```

见 [info-card-designer](../../skill/info-card-designer/SKILL.md) 与 [信息卡 tone 对照](card-tones.md)。

[返回画廊](../GALLERY.md) · [openai 风格](openai.md) · [excalidraw 风格](excalidraw.md)
