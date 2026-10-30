> [English](zed.en.md) · 中文 · [返回画廊总览](../GALLERY.md)

# zed

Zed 编辑器的暗色（One Dark），色板直接取自 Zed 的 `assets/themes/one/one.json`：`#282C33` 画布、`#DCE0E5` 正文、`#A9AFBC` 次要文字、`#464B57` 边框，1px 发丝线，无投影、无底纹、无手绘。适合暗色文档站、技术分享、README 与终端风格的交付。

节点上色照 Zed 自己的做法：**flowchart / class / state 的节点按读取顺序依次取 8 个 player 色（`node_counter % 8`），描边取该色原色、填充是该色按 15% 混页面底色**——所以 zed 的流程图是多色轮转，而不是按形状分色。Pele 把一张图的节点按文档顺序写进一个 `<g>`，实现就是一组 `:nth-child` 规则；状态起止标记与复合状态框属于 chrome，不参与轮转。形状族规则仍负责其余槽位（ER 实体、注释、类图分隔线、状态起止、簇），沿用 Zed 的语法色——流程 `#74ADE8`（info 蓝）、判定 `#BF956A`（number 沙）、状态 `#A1C181`（created 绿）、存储 `#B477CF`（keyword 紫）。8 色系列即这 8 个 player 色（饼图、git 分支、`cScale`），红绿色盲模拟下两两 ΔE 最低 0.040，每色对自己的 15% 底色也 ≥ 3:1。

块页跟着同一套：`#2F343E` 面板 + `#464B57` 发丝线 + `color-scheme: dark`；状态 chip 的文字由 chip 底色推导（OKLab 保 15% 彩度 + 二分保 4.5:1），所以浅底深底共用一条规则。配 `--tone paper` 会换成亮色网格纸，那时主题的暗色让位给 tone。

亮色的一半见 [zed-light](zed-light.md)。

## 流程图

![zed 流程图](zed-flow.png)

## 饼图

![zed 饼图](zed-chart.png)

## KPI

![zed KPI](zed-kpi.png)

## 卡片

![zed 卡片](zed-cards.png)

## 表格

![zed 表格](zed-table.png)

## 相关

- [主题定制](../HUMAN_GUIDE.md#主题定制)
- [扩展块图鉴](../EXTENSIONS.md)
