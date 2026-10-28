> [English](QUALITY.en.md) · 中文

# 质量与发布门禁

这份文档记录渲染产物的 lint 覆盖、已知盲区、参考的社区策略，以及正式发布前的许可证要求。它面向后续迭代，不替代 `tests/run.ts` 里的可执行断言。

## 当前覆盖

`tests/run.ts` 与 `src/lint.ts` 共同组成视觉 lint：

- **像素层**：四边留白、左右/上下平衡、墨迹占比、近白图/过满图。
- **底部长空白**：`bottom <= max(90px, 5% × 高度)`，防止截屏把视口高度烘进 PNG。
- **超长页面**：40 条列表、600px 定宽，渲染高度超过初始视口。
- **DOM 几何**：检查根节点横向溢出、被 `overflow:hidden` 裁切的文本、越出 `.wrap` 的元素，以及图题与内容块的垂直重叠。
- **SVG 标签**：Pele 节点里每条 `<text>` 的屏幕矩形必须落在形状矩形内（横向容差 2px、纵向 4px）；长英文 token 与 CJK 不换行都会被抓住。
- **渲染对比度**：遍历 SVG 文本的 `fill` 与实际背景（向上找最近的不透明背景），低于 3:1 报 `low-contrast`；暗色主题按真实渲染色检查，而不只看 token。
- **边缘裁切**：PNG 任一方向墨迹触边（margin ≤ 0）即失败，覆盖箭头、rough 抖动和硬阴影。
- **确定性**：同一输入连续渲染两次，逐像素比较（通道容差 2），差异比例不得超过 0.05%；遍历全部内置主题，含手绘抖动的 Excalidraw。
- **对比度**：主题正文 `fg` 对背景 ≥ 4.5:1，`muted` / `accent` / `critical` 对背景 ≥ 3.0:1。
- **稳定性**：渲染前等待内置字体加载；CSS 关闭动画/过渡/光标；Chromium 使用 `--font-render-hinting=none`。
- **可读报告**：`scripts/lint-visuals.ts` 渲染全部主题（`tech` / `openai` / `excalidraw`）的流程图与卡片块，逐行输出实测边距、阈值和问题。
- **契约**：`ThemeSpec` 必需字段、`shapeCoverage`、`--style-fill`、块版式 CSS、CLI 退出码/命名/JSON/并发。

当前基线：`146/146 passed`。已用 2x 渲染验证过长页面：44,548px 高的列表底部留白 51px，56,952px 高的流程图底部留白 22px；Excalidraw 流程图连续两次渲染像素差为 0。

对比度门禁要求每套主题的 `fg` ≥ 4.5:1、`muted` / `accent` / `critical` ≥ 3.0:1；`tech` / `openai` / `excalidraw` 当前均通过，最低值来自 `excalidraw` 的 `muted`（3.32:1）。

## 下一阶段：lint 加强

| 场景 | 现状 | 目标 |
| --- | --- | --- |
| 超长页面截屏 | 底部空白规则 + 40 条列表 fixture | 覆盖 1x/2x、`--preset slide`、16,000px 视口上限、Mermaid 回退、极端宽高比 |
| 文本溢出 | HTML 块查 `scrollWidth/clientWidth`；SVG 标签已查屏幕矩形 | 覆盖 `getComputedTextLength()` 与节点宽度的直接比较、CJK 不换行 |
| 横向溢出 | 根节点与裁切容器已查 | 覆盖表格单元格、`overflow:visible` 的宽内容、卡片网格列宽 |
| 图题与图形碰撞 | 块页面 caption 已查 | 覆盖 mermaid 内标题、`--title` chrome 与 SVG 边界 |
| 边缘裁切 | PNG 四边墨迹触边已查 | 单独检查箭头、rough 抖动、硬阴影的局部裁切 |
| 暗色主题可读性 | SVG 文本 `fill` 对实际背景已查，阈值 3:1 | 正文/图表色按 4.5:1 单独设档；HTML 块文本也纳入 |
| 确定性 | 全部内置主题流程图双跑 | 所有图型双跑；SVG 结构差也纳入 |
| 多页/拆分 | 信息卡按实际像素高度拆页，`--max-height` 可调 | 块页面的分页边界、页脚重复、标题续页策略 |
| 基准图对比 | 暂未启用 | 固定 CI 容器后存 per-platform baseline，用 pixelmatch 对比 |

实施顺序：

1. 用 `src/lint.ts` 的 `auditLayout` 扫完 12 种扩展块与 slide 预设，清掉误报后固化成 fixture。
2. 给 mermaid 输出补 SVG 文本度量：当前覆盖 Pele；Mermaid 的 `foreignObject` 标签还需要单独的 DOM 度量。
3. 在 CI 固定 Chromium/字体后接入基准图：按 Playwright 的做法按平台存 baseline，pixelmatch `threshold=0.1`、`maxDiffPixels` 取 0.1%。
4. 扩展 `scripts/lint-visuals.ts`：覆盖全部图型与 slide 预设，而不只是流程图与卡片块。
5. 失败信息保留实测值和阈值，避免只报 PASS/FAIL。

阈值原则：固定 padding 用绝对像素（2x 下 90px），内容高度带来的空白用比例（5%）；两者取较大值，避免小图误报。

## 参考的社区策略

| 来源 | 策略 | 本项目的取舍 |
| --- | --- | --- |
| [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) | 基准图对比；`threshold`（默认 0.2）与 `maxDiffPixels`；按浏览器/平台存 snapshot；`--update-snapshots` 显式更新；截图前等待稳定 | 采用阈值分层、稳定性设置与更新思路；基准图等 CI 固定后再接入 |
| [jest-image-snapshot](https://github.com/americanexpress/jest-image-snapshot) | pixelmatch / SSIM；逐像素阈值 + 整图失败阈值；SSIM 建议 1% | `diffPng` 采用“通道容差 + 差异比例”两层判断 |
| [reg-suit / reg-cli](https://github.com/reg-viz/reg-cli) | baseline 与 diff 报告分离，人工审阅后更新 | 当前用测试产物人工目测；后续把 diff 报告接进 CI |
| [Mermaid](https://github.com/mermaid-js/mermaid) | PR 视觉回归由 Argos 托管，按 PR 审阅变化 | 暂不引入外部服务；本地保留可复现的 review 图 |

## 发布前：许可证与来源

- 第三方组件、字体、设计参考的清单在 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。
- EPL-2.0、Apache-2.0、OFL-1.1 的全文在 [`licenses/`](../licenses/)。
- 发布压缩包必须同时包含 `THIRD_PARTY_NOTICES.md`、`licenses/` 与二进制。
- 升级依赖或引入新的场景模板后，先核对上游许可证，再更新清单。
- 发布前从 lockfile 重新生成传递依赖列表，确认没有遗漏的 copyleft 组件。

## 相关

- [测试与视觉筛查](HUMAN_GUIDE.md#测试)
- [风格画廊](GALLERY.md)
- [交接记录](handoff/style-ports.md)
