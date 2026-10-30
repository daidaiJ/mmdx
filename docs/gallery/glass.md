> [English](glass.en.md) · 中文 · [返回画廊总览](../GALLERY.md)

# glass

Fluent 亚克力玻璃：淡蓝灰画布（`#E9EEF6`）+ 24px 网格 + 一层白色半透膜（0.16）与细颗粒（10%），面板 `rgba(255,255,255,.45)`、8px 圆角、白色描边、一层轻投影；强调色用 Fluent 蓝 `#0F6CBD`。适合玻璃质感封面、现代产品汇报、需要「材质感」的图。

亚克力按 Fluent 的配方分层：底色 → 模糊色块（soft focus）→ 网格 → 白色半透膜 → 噪点。网格在膜下面，所以透过面板能看见线，这是「玻璃」最直接的线索；Chromium 不渲染 SVG 形状上的 `backdrop-filter`，所以模糊只能落在底上，面板本身保持清晰。块页走 HTML，`backdrop-filter: blur(5px)` 是真的，模糊刻意压轻——24px 的格线一旦重度模糊就摊成一片平色，材质反而看不出来。

图自带底（`<g class="mmdx-backdrop">`），PNG 整幅截取、不按墨迹裁边。传 `--background transparent` 时不画底。

## 流程图

![glass 流程图](glass-flow.png)

## 饼图

![glass 饼图](glass-chart.png)

## KPI

![glass KPI](glass-kpi.png)

## 卡片

![glass 卡片](glass-cards.png)

## 表格

![glass 表格](glass-table.png)

## 相关

- [主题定制](../HUMAN_GUIDE.md#主题定制)
- [扩展块图鉴](../EXTENSIONS.md)
