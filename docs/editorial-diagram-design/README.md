# editorial-diagram-design — vendored 自 cathrynlavery/diagram-design

> **来源**：[cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) @ commit `0b9b10cab3dbf695642fa1a6c4b4f60df9083689`（2026-10-25 嵌入）
> **许可证**：MIT，全文见 [LICENSE-diagram-design](LICENSE-diagram-design)
> **嵌入范围**：skill 的规格层——`SKILL.md` 与 `references/` 全部 63 个文件，**原文未改**。上游 `assets/`（示例 HTML / 图标页，约 4.7MB）与 `scripts/` 未随附：本仓库只用它的**规格与纪律**，不用它的模板库和工具链（调研结论见 [docs/research-diagram-design.md](../research-diagram-design.md) §5）。

## 这是什么，和 mmdx 什么关系

diagram-design 是「模型按规格手绘 editorial HTML+SVG」的 Agent Skill（约 3.8 万星）；mmdx 是确定性围栏渲染器。两者互补而非替代：

- **办公出图**（流程 / KPI / 周报贴片，高频、要稳定）→ 走 mmdx 围栏，**不要**手绘——预算、lint、像素筛查只在围栏体系内生效
- **editorial 封面 / 方案插图**（低频、一次性、要杂志感）→ 按本目录规格手写 HTML，再用 **mmdx 导出高保真 PNG**（系统 Edge、免 Playwright、离线中文一致）

## 用法（三步）

1. 读 [SKILL.md](SKILL.md) 总则 + 目标图型的 `references/type-*.md`（渐进披露，**只读需要的那个**，全量约 90 万字符）
2. 按 [references/style-guide.md](references/style-guide.md)（`paper`/`ink`/`muted`/`accent`/`rule` 角色）与 [references/output-spec.md](references/output-spec.md)（format × size × detail × audience 四旋钮）写一个自包含 HTML；中文场景直接用 `'Noto Sans SC'` 字族名
3. 导出（**覆盖**上游 export.md 的 Playwright 路径）：

```bash
mmdx diagram.html -o out/diagram.png --scale 3
```

## 对上游文本的覆盖（mmdx 适配层）

上游文件保持原文（便于 diff 同步）；在 mmdx 语境下以下列为准：

| 上游写的 | mmdx 语境下改为 |
| --- | --- |
| `/export-diagram`（Playwright，需下载一份 Chromium） | `mmdx file.html --scale 3`：系统 Edge，**绝不下载浏览器** |
| Google Fonts（Geist / Instrument Serif） | 联网时可用；**离线 / 内网**写系统字体栈，中文可靠落 `'Noto Sans SC'`——mmdx 渲染时已注册该字族并 alias 进 `sans-serif`/`serif` 的 CJK 兜底 |
| 45 种图型随意选 | 选型仍以 mmdx [skill/SKILL.md](../../skill/SKILL.md) §1a 为准；polar / scatter / waterfall / Wardley / medallion 等 mmdx 明确不接（AntV / Infographic 地盘），手绘路径同样不做 |
| `assets/` 示例做参照 | 未随附；以 `references/` 规格文本为准 |

## 同步上游

嵌入是快照、不自动追更。需要更新时：

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/cathrynlavery/diagram-design
cd diagram-design && git sparse-checkout set skills/diagram-design
cp skills/diagram-design/SKILL.md <mmdx>/docs/editorial-diagram-design/
cp skills/diagram-design/references/*.md <mmdx>/docs/editorial-diagram-design/references/
# 更新本文件的 commit 号
```
