# 调研：diagram-design 哪些值得融进 mmdx

> 分支：`feat/diagram-design-fusion-research`
> 对象：[cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design)（MIT，约 3.8 万星，skill 标 2.6 / 40 种图）
> 对照：本仓库 `tasks/` + `issues/` 的办公 Agent 出图看板（P0–P2）
> 结论先行：**学它的 skill 纪律和交付规格，不要学它「让模型手绘 HTML/SVG」这条主路径。**

## 1. 两个项目不是一类东西

| | mmdx | diagram-design |
| --- | --- | --- |
| 是什么 | **确定性 CLI 渲染器**：围栏 → Chromium → PNG/SVG | **Agent Skill 设计系统**：模型按规格手写 HTML+SVG |
| 输入 | mermaid / table / list / card | 自然语言 + 可选 mermaid/draw.io/excalidraw（**重绘**，不是渲染） |
| 输出 | 可粘贴位图；Windows 上走系统 Edge | 自包含 `.html`；PNG 另走 Playwright 再下一份 Chromium |
| 字体 | 内嵌 Noto Sans SC，离线中文一致 | Google Fonts（Geist / Instrument Serif），简体中文仍靠本机回退 |
| 布局 | mermaid + ELK | 模型按 4px 网格手摆坐标 |
| 主题 | 形状分色 `tech`（蓝流程 / 琥珀判定 / 绿状态 / 紫存储） | **一强调色** paper/ink/muted/accent，1–2 个焦点 |
| 质量闸 | 像素留白筛查、块级隔离、JSON 契约 | skin lint、几何重叠检测、节点预算、保真台账 |
| 默认读者 | 办公 Agent 贴 PPT（`issues/` 已改定位） | 博客 / 方案文档的 editorial 插图 |

diagram-design 的 README 写得很清楚：它**故意丢掉** mermaid 的自动布局和配色，把同一份内容重画成 editorial 图。mmdx 的卖点正好相反——同一份围栏在任意机器上吐同一张图，中文字体、留白、主题都是构造保证。

把 40 套 HTML 模板搬进 mmdx，等于拆掉 CLI、像素测试和「免 Node 二进制」。**融合只发生在 skill 层、交付规格层、扩展块层。**

## 2. 办公看板已经对上的部分

`issues/README.md` 把 mmdx 钉在「结构图 + 轻量数据图 + 版式块」，复杂统计图交给 AntV，信息图模板库交给 Infographic。diagram-design 正好踩在这三块的**审美和选型**上，但图型扩张方向（Wardley、polar、scatter、waterfall、数据平台矩阵）会把 mmdx 拖进 Infographic / AntV 的地盘。

| 办公任务 | diagram-design 对得上的部分 | 建议 |
| --- | --- | --- |
| **P0-1** skill 改成办公选型表 | 意图 → 图型表；「先行为模式再布局」；复杂度预算；反模式；画之前先陈述计划 | **主融合点。** 把他们的纪律写进 `skill/SKILL.md`，不要按 mermaid 关键字排 |
| **P0-2** `--preset slide\|a4\|square` | `output-spec.md` 的 format × size × **字号阶梯** × 安全区 | 预设值可对齐；**slide 要放大节点字号**，不能只拉宽画布 |
| **P0-3** caption 图题层 | full-editorial 的页眉/页脚/底栏图例；`title`/`desc` 无障碍 | chrome 结构可借；**不要**默认三张摘要卡（他们自己列为 slop） |
| **P1-1** ` ```chart ` | bar / line 作为独立 type；系列色板 | 仍走 mermaid 后端 + 上限；只借「表数据进、一强调色 + 系列色」 |
| **P1-2** kpi / compare / funnel | pyramid/funnel type；「前后对比用表不要硬画」 | funnel 按他们的层级预算做；compare 保持双栏卡，不要做成 Venn |
| **P1-3** 能上会边界 | 每图 ≤9 节点、降级阶梯、超限拆总览+局部 | 与 pie≤6 / xychart≤6×2 **合并成一张预算表** |
| **P2-1** ` ```task ` | kanban 的 WIP / blocked | 保持现有分工：快照用 task，泳道用 kanban |
| **P2-2** ` ```progress ` | 无同心环 | 不融合；这是 mmdx 独有版式 |
| 画布里的 P2 `--brand` | URL/skill/folder 品牌入职 + WCAG + 语义 token | **只收 paper/ink/muted/accent 映射 + 对比度检查**；不抓网页、不引 Google Fonts |

## 3. 该融的五件事（按收益）

### 3.1 Skill：渐进披露 + 先砍再画 — 并入 P0-1

diagram-design 的 `SKILL.md` 是索引：日常请求只加载「总则 + 一个 type 文件」。选型按「读者要理解什么」，不是按引擎关键字。画之前强制输出：图型、画幅、预算会砍掉什么。

mmdx 的 `skill/SKILL.md` 现在第一行仍是 flowchart / sequence / class / ER / gitgraph，和 `issues/p0-office-skill.md` 指出的问题一致。办公意图表已经在 P0-1 里写了；建议**额外吸收**：

- **何时不要画**：列表、前后对比、单盒子——直接 table / 一句话（他们 §2）。周报 Agent 最容易为了「有图」硬画 flowchart。
- **复杂度预算**（他们 §7）：总览 ≤9 节点 / ≤12 边 / 强调 ≤2；sequence 生命线 ≤5。mmdx 现在写 ≤15 节点，办公贴片偏松，建议总览改为 **≤9**，超过走「总览 + 局部」。
- **降级阶梯**（`output-spec.md`）：装饰 → 副本合并 → 叶子簇折叠 → 度-1 汇点 → 横切基础设施 → 拆图。写进 §1b，替代空泛的「节点太多就拆」。
- **保真台账**：Agent 在 `--json` 之外用一句话报告砍了什么。不改渲染器。
- **读者档**（engineer / mixed / executive）：只改**用词**，不改节点数。办公默认 `mixed`；给老板的图把端口/协议拿掉。这是 skill 规则，不是 CLI 参数。

安全/合规向的 8 个 semantic pattern（信任边界、policy trace、SysML 块分解）**不要整表搬来**。办公只留两条就够：

| 触发 | 落到 mmdx |
| --- | --- |
| 多路汇入一个卡点 / 产能 | flowchart，标容量与排队，不要画成等宽管道 |
| 跨部门交接 | 优先 swimlane（见 §4）；没有 swimlane 时用命名 subgraph |

### 3.2 交付四旋钮 — 并入 P0-2 / P0-3

他们把「这张图给谁看、贴到哪」拆成四个旋钮：format、size、detail、audience。mmdx 的 CLI 只需要前两个；后两个放 skill。

P0-2 现案是 `slide` 内容宽 1600、高度随内容、scale=2。对齐时注意三点：

1. **字号阶梯**：他们 `slide-16x9` 节点名 16px、盒高 64、间距 40；普通文档 12/48/24。只加宽不加字，投影上看不清。preset 要进 `render.ts` 的字体/间距，不只是 `--width`。
2. **安全区**：幻灯片底栏预留 ~80px；四边至少 40px。和现有像素裁切不冲突——caption chrome（P0-3）占上下，主图仍居中裁切。
3. **不要一次做 9 个 preset**。`social-og` / `print-letter` 留 P2。办公三档已经覆盖 PPT / Word / 飞书。

P0-3 的 matplotlib「题上源下」比他们的 editorial 页眉更适合上会。可借的只有：图例必须在底栏、不要和图面抢位；SVG 保留 `title`/`desc`（mermaid 的 accTitle 不够，因为扩展块不走 mermaid）。

### 3.3 语义 token，而不是再抄一套彩虹 — 留给 P2 `--brand`，但主题层现在就可以定口径

`style-guide.md` 的角色表（`paper` / `ink` / `muted` / `accent` / `rule`）比 mmdx 各主题里散落的 hex 更适合 Agent 定制。建议：

- `tech` **保持形状分色**——这是流程图「能扫一眼」的办公优势，不要改成一强调色。
- 扩展块（card / 未来的 kpi、funnel、task）的 CSS **改走同一组角色变量**，品牌只要改 accent。
- `--brand #4098FC` 只映射 `accent` + 派生 `accent-tint`，并做 WCAG AA（ink on paper ≥ 4.5）。不要做 URL 爬站入职。
- 明确拒绝 Google Fonts 和 Playwright 第二套 Chromium。中文一致性是 mmdx 的护城河。

### 3.4 版式块的造型纪律 — 并入 P1-2 / P2-1 / P2-2

他们把「AI slop」写成可执行清单：阴影、过大圆角、每个节点都强调、图例漂在图内、等宽三卡。扩展块实施时写死：

- 圆角 ≤ 8px，无阴影（和 `tech` 已有描边一致）
- 间距 / 尺寸尽量 4 的倍数
- kpi 最多 1 个数字用强调色；compare 用中缝而不是双强调
- funnel 层宽表示数量，**颜色不表示数量**
- 中文标签 ≥ 12px，不塞进细环/细箭头（P2-2 已写「中文进图例列」——与他们的 CJK 12px 地板一致，应升为全局规则）

### 3.5 几何与预算闸 — 软接到 P1-3

他们用 `verify-geometry.py` 抓「标签遮罩被后画的节点裁掉」。mmdx 已有像素留白/空白图筛查。P1-3 做 pie/xychart 软警告时，把 **节点预算超限** 也放进 `--json` 的 `warnings`：flowchart 超 9 节点、sequence 超 5 生命线。不引 parser 也行，正则够用。

## 4. 图型覆盖：只补 mermaid 真做不好的

40 个 type 里，和 mermaid 重叠的（flowchart / sequence / state / er / gantt / kanban / journey / quadrant / radar / sankey / treemap / timeline / class）**只改 skill 写法，不改引擎。**

明确不要接（交给 AntV 或太窄）：polar、waterfall、scatter、Wardley、medallion、DP integration / security matrix、story map、IT current-state、UML 细类。

办公高频、mermaid 别扭、又落在 Infographic「200 套模板」之外的，只剩三个候选 HTML 块——都放 **P2 之后**，且每块有条目上限：

| 候选围栏 | 办公场景 | 为什么不是 mermaid | 和现有任务的关系 |
| --- | --- | --- | --- |
| ` ```swimlane ` | 跨部门审批 / 研发-运营交接 | subgraph 泳道弱、handoff 看不清 | 比再发明 `process` 值；P0-1 选型表先写「用命名 subgraph 凑合」，块落地后替换 |
| ` ```fishbone ` | 复盘 / RCA | mermaid 无鱼骨 | 周报有用；上限 ≤6 骨、每骨 ≤4 因 |
| ` ```loop ` | 增长飞轮 / 飞轮战略 | 环形+中心枢纽，flowchart 会画成普通环 | 少而精；≤6 步 + 1 hub |

Venn / 嵌套包含 / 层叠 / 组织架构：skill 里给 mermaid 配方即可（flowchart TD、subgraph），不要新围栏。

漏斗不要第二套：P1-2 的 ` ```funnel ` 就是他们的 pyramid/funnel。

## 5. 明确不融（以及为什么）

| 不拿 | 原因 |
| --- | --- |
| LLM 手写 SVG 作为出图主路径 | 毁掉确定性、测试和二进制；和「结构化文本模板转图像」相反 |
| 40 套 example HTML 当模板库 | 维护爆炸；issues 已禁止 200 套 Infographic |
| mermaid/draw.io/excalidraw **重绘**管线 | mmdx 的工作是渲染，不是换皮；重绘是另一个产品 |
| Playwright + 再下一份 Chromium | 违反「用系统 Edge、绝不下载浏览器」 |
| Google Fonts / Instrument Serif 默认皮肤 | 离线中文、内嵌字体是差异化；serif 标题也不像国内办公材料 |
| 可选 motion / 动画控制器 | 办公贴 PNG；他们自己也默认 static |
| 从官网抽品牌 | 办公 Agent 在内网；`--brand` 一色足够 |
| 一强调色替换 `tech` 默认 | 流程图靠形状分色扫读；editorial 可做可选 `-t editorial`，不要改默认 |

## 6. 建议落地顺序（不打乱现有看板）

现有 8 个任务的依赖图保持不变。diagram-design 的内容**写进这些任务的「参考 / 写死决策」**，而不是插队开新 P0。

1. **P0-1**（纯文档）— 最大一块融合：办公意图表 + 何时不画 + 9 节点预算 + 降级阶梯 + 读者档。参考链接补 diagram-design 的 `SKILL.md` §1–3、§7 和 `output-spec.md` 的 audience/detail。
2. **P0-2** — preset 带字号阶梯和底栏安全区；尺寸仍可按现任务微调。参考补 `output-spec.md` §2。
3. **P0-3** — chrome 题上源下不变；底栏给来源/单位，不要 editorial 摘要卡。
4. **P1-3** — 预算表与超限 `warnings` 与 skill 同一口径。
5. **P1-1 / P1-2 / P2-*** — 造型纪律（无阴影、4px、12px 中文地板、单强调）。
6. **P2-3 `--brand`** — 任务文档 `tasks/p2-3-brand.md`：语义 token + 对比度；不爬站。
7. **P2-4 ` ```swimlane `** — 任务文档 `tasks/p2-4-swimlane.md`。fishbone / loop 仍在看板 backlog，先不拆。

若只做一件事：做 P0-1 时把 diagram-design 的选型纪律写进去。那是 3.8 万星仓库里对 mmdx **唯一不可替代**的部分；图型皮肤可以以后再碰。

## 7. 许可

两边都是 MIT。若直接摘抄 `SKILL.md` 段落或 token 表，在对应文件保留出处即可。本调研只吸收规格，不搬运他们的 example HTML / 图标集。
