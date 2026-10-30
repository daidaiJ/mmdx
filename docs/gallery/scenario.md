> [English](scenario.en.md) · 中文 · [返回画廊总览](../GALLERY.md)

# 场景引导（状态图）

把一次故障、一次审批或一次发布的**处境变化**画成状态图：状态用读者能看见的处境命名，箭头写读者视角的动作，风险状态单独打标记。规则见 [mmdx skill 的 §1a-2](../../skill/SKILL.md)。

这套规则来自 pstack 的 `statechart` skill（用它把模型检验结果讲给人听），只吸收「怎么把处境讲清楚」这一层；TLA+/TLC 建模与报告那一层不在 mmdx 里。

这张图本身就是 mmdx 的使用回路——「要用 mmdx 出图 → 环境自检 → 选图型 → 先砍再画 → 渲染 → 自检图 → 交付」，带两条回退（找不到浏览器、渲染失败）和两个标记状态（`risk` 标会坏在哪，`path` 标最短路径）。

## 网格纸报告（`--tone paper`）

复盘报告、评审页、`a4` 打印用这档：灰白纸底 `#FAFAF8` + 24px 细格线 / 96px 粗格线，墨色文字、焦橙强调色 `#BF4520`，形状族改成冷蓝 / 沙 / 鼠尾草 / 紫灰。

![场景引导 · 网格纸报告](scenario-paper.png)

## iOS 系统界面（`-t ios`）

贴产品界面说明或需要「系统感」的场合用这档：分组浅灰底 + 白卡片 + 发丝分隔线 + 系统色。

![场景引导 · iOS 系统界面](scenario-ios.png)

## 复现

```bash
mmdx examples/gallery/scenario.md --tone paper --preset a4 --title "mmdx 的使用回路" --json --quiet
mmdx examples/gallery/scenario.md -t ios --preset column --title "mmdx 的使用回路" --json --quiet
```

源码在 [examples/gallery/scenario.md](../../examples/gallery/scenario.md)，两张图由 `scripts/make-gallery.ts` 一并生成。

## 相关

- [主题定制](../HUMAN_GUIDE.md#主题定制)
- [风格画廊](tech.md)
