> English · [中文](zed-light.md) · [Back to gallery](../GALLERY.en.md)

# zed-light

Zed's light editor theme (One Light): the same rules as [zed](zed.md) on a different palette — `#FAFAFA` canvas, `#242529` body text, `#58585A` secondary text, `#C9C9CA` border, 1px hairlines. Built for editor-flavoured diagrams inside light docs, and to pair with `zed`: one source, one `-t` switch, the other canvas.

Nodes rotate the eight player colours by reading order, exactly as in [zed](zed.en.md): outline in the colour, fill at 15% over the page. That rotation is the clearest difference from `tech`, which colour-codes by shape family and stays on one hue. The shape-family rules paint the remaining slots in Zed's syntax colours: process `#5C78E2` (info blue), decision `#AD6E26` (number ochre), state `#3F953A` (terminal green), store `#984EA5` (keyword magenta). Every pair of the eight holds at least ΔE 0.040 under simulated colour-vision deficiency, and every colour clears 3:1 against its own 15% tint.

Block pages are editor panels rather than document cards: `#EBEBEC` sheets on the `#FAFAFA` canvas, `#C9C9CA` hairlines, 6px radii, no accent stripe down a card, `#E4E4E5` for table headers and heat cells. Status chips follow Zed's error / warning chip recipe — scale the accent's lightness (×1.3 on a light page, ×0.7 on a dark one), then derive the text colour from that stock.

## Flowchart

![zed-light flowchart](zed-light-flow.png)

## Pie

![zed-light pie](zed-light-chart.png)

## KPI

![zed-light KPI](zed-light-kpi.png)

## Cards

![zed-light cards](zed-light-cards.png)

## Table

![zed-light table](zed-light-table.png)

## Related

- [Theming](../HUMAN_GUIDE.en.md#theming)
- [Extension blocks](../EXTENSIONS.en.md)
