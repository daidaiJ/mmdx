> [English](acnh.en.md) · 中文 · [返回画廊总览](../GALLERY.md)

# acnh

动森风：奶油纸（`#FFF8E7`，带点阵网格）+ 粗棕描边（`#7A5C3E`，2.6px）+ 硬偏移贴纸阴影（`0 5px 0 #E2CFA9`）+ 圆体字与胶囊标签，16px 圆角。适合周报贴纸、团队看板、轻松汇报。

这一套是 `docs/STYLE_PORTS.md` 里调研阶段取消的动森原型（B2 强度）重新落地：色板与块版式取自 `.handoff/style-ports-prototypes/` 的原型 CSS，图表部分补上点阵纸纹与贴纸阴影。两个原型的坑都在本轮解决：flatten 现在会把 CSS `filter` 一起烘焙（贴纸阴影因此能进 SVG），块页通过 `theme.blockCss` 拿到面板/圆角/粗边/虚线/胶囊。

字体栈以 `ZCOOL KuaiLe`（中文）+ `Baloo 2`（拉丁）起头，两者随包（OFL-1.1，见 `assets/fonts/OFL-zcoolkuaile.txt` / `OFL-baloo2.txt`），子集口径记在 `scripts/subset-font.py`；系统圆体回退已删除，装没装幼圆都不影响出图。

## 流程图

![acnh 流程图](acnh-flow.png)

## 饼图

![acnh 饼图](acnh-chart.png)

## KPI

![acnh KPI](acnh-kpi.png)

## 卡片

![acnh 卡片](acnh-cards.png)

## 表格

![acnh 表格](acnh-table.png)

## 相关

- [主题定制](../HUMAN_GUIDE.md#主题定制)
- [扩展块图鉴](../EXTENSIONS.md)
