# 后续：交互式 Web 画布编辑模式（AI 初稿 → 人微调）

> 状态：Phase 0 原型已落地 · 2026-11-20（调研为只读 spike，原型已进仓库）
> 约束：编辑器必须保持 mmdx 自己的主题、字体、形状语言与导出管线；**不基于 Excalidraw / tldraw / draw.io 二开**。
> 交互参照：Excalidraw / Visio 档——框选、移动、缩放、文本编辑、背景画布、导出；不追 draw.io 的全量 shape library、图层与实时协作。
> 目标命令：`mmdx edit <file.md|file.mmd> [--index N]`，AI 出初稿，人在浏览器里微调，保存工程、导出 SVG/PNG，并能一键还原初稿。

## 结论先行

1. **可行，但方向应改成「mmdx 自己的 SVG 编辑器」**：复用 Pele 渲染出的 SVG 与主题 CSS，编辑层只做交互与几何补丁，不引入完整编辑器框架，也不把 Excalidraw/tldraw/draw.io 的 UI 或渲染模型搬进来。
2. **交互程度按 Excalidraw/Visio 档定义**：框选、多选、移动、缩放、文本编辑、连线/重连、对齐吸附、撤销重做、画布背景与尺寸、导出选区。这个档位足以覆盖「AI 初稿 → 人微调」，又不会把项目拖进 draw.io 级编辑器的工程量。
3. **社区项目只作为交互参照与可选加速层**：Excalidraw（136k stars，MIT）交互最值得借鉴；tldraw 视觉与性能好但生产环境需要商业许可；maxGraph 是 draw.io 的引擎但 0.x 且自带渲染/样式体系；Konva/Fabric 可做大画布加速，但会绕开 mmdx 的 SVG/CSS，主题保真度要重做。
4. **体积与性能**：自研 SVG 交互核心粗估 30–80KB min / 10–25KB gzip，远小于 Excalidraw 全量（本次 spike 约 8.9MB min / 2.85MB gzip）。简化场景基准里 2,000 个节点：框选命中 0.2ms、全量 bbox 3ms、移动 100 个节点 1ms；mmdx 的典型图是 10–200 个节点，SVG DOM 足够。
5. **最大工程量不在画布，而在文档模型**：Pele 每次 render 都重新布局，没有位置持久化；编辑器必须保存「场景 + 几何补丁」，并把边路由、文本换行、子图容器三件事做扎实。

一句话：**借 Excalidraw/Visio 的交互，不借它们的界面与模型；渲染继续用 Pele + mmdx 主题，编辑层自研。**

---

## 1. 需求与边界

### 1.1 主功能

| 功能 | 说明 |
| --- | --- |
| 打开初稿 | `mmdx edit` 读取 `.md` 里的某个 mermaid 块（或 `.mmd`），用现有管线渲染出与 CLI 一致的 SVG |
| 人微调 | 框选/多选、移动、缩放、文本编辑、增删节点、连线/重连、对齐吸附、撤销重做 |
| 画布 | 主题/色调、背景色/透明、网格/点阵、纸纹、画布尺寸、留白、裁剪到选区 |
| 保存 | 工程文件保存场景与初稿快照；自动保存；可重新打开 |
| 导出 | SVG、PNG（2x、透明底、选区裁剪）；导出结果与 CLI 产物同一套主题与字体 |
| 还原初稿 | 丢弃人工修改，恢复 AI 初稿；还原本身可撤销 |
| AI 再出稿 | 源文件变化时重新渲染初稿，按节点 ID 合并人工布局（后置） |

### 1.2 交互基线（Excalidraw / Visio 档）

| 能力 | 本期目标 | 说明 |
| --- | --- | --- |
| 平移/缩放 | 必须 | 滚轮缩放、空格拖拽、适应内容 |
| 框选/多选 | 必须 | 矩形框选、Shift 加选、点击空白取消 |
| 移动/缩放 | 必须 | 8 个缩放手柄；Shift 保持比例；方向键微调 |
| 文本编辑 | 必须 | 双击编辑、自动换行、字号/颜色 |
| 连线 | 必须 | 从节点拖出连线、改接端点、直线/折线 |
| 折点/避障 | 后置 | 先做 L/Z 折线，再补拖拽折点与简单避障 |
| 子图/容器 | 后置 | 先支持移动整体，再支持缩放容器与拖入/拖出 |
| 对齐/分布/吸附 | 必须（基础） | 网格吸附、参考线、水平/垂直对齐 |
| 撤销/重做 | 必须 | 快照栈；拖拽与输入合并为一次操作 |
| 复制/粘贴/删除 | 必须 | 内部剪贴板，跨工程后置 |
| 图层/锁定/隐藏 | 后置 | 不在首版 |
| 形状库 | 不做 | mmdx 的图型只需要 Pele 已有的形状族 |
| 实时协作/评论 | 不做 | 与 CLI 产品形态无关 |
| 导出 PDF | 后置 | 先 SVG/PNG |

### 1.3 明确不做

- 不做 draw.io 的数百种 shape library、BPMN/UML 全套模板、图层树、多人实时协作。
- 不做“任意白板”：编辑器只编辑 mermaid 的 node-link 图（flowchart / state / class / ER / sequence），图表类（pie / radar / sankey / KPI / table）保持只读，改数据应回源文件。
- 不把 Excalidraw/tldraw/draw.io 的 scene / mxGraph / records 作为 mmdx 的文档格式。

### 1.4 为什么不能直接二开现成编辑器

| 方案 | 为什么不做 |
| --- | --- |
| Excalidraw | 手绘白板视觉与 mmdx 八套主题冲突；全量包约 2.85MB gzip；字体只有 Excalifont/Xiaolai 等固定族，CJK 会落到手写体；它的 scene 模型与 Pele 的节点/边/簇不是一回事，二开会变成长期 fork |
| tldraw | 交互与性能很好，但许可证明确禁止生产环境免费使用；视觉是自有设计系统；同样需要重做主题与导入 |
| draw.io | 完整 UI 最省事，但渲染与样式是 mxGraph；主题、字体、backdrop、hachure 都无法原样保留；默认还要依赖 `embed.diagrams.net` 或自托管 |
| maxGraph | draw.io 的引擎，能力最接近；但 0.x API、自带 SVG 渲染与样式体系，等于重建一套 mmdx 主题；对 10–200 节点的图属于过度工程 |
| JointJS | MPL-2.0 + 商业扩展；自带渲染/路由；同样要重做视觉 |
| React Flow | 节点/边交互很好，但节点是 HTML、边是 SVG，不是任意 Pele SVG；没有自由缩放/旋转，主题要重写 |

结论：**这些项目的价值是交互范例与局部算法，不是产品底座。**

---

## 2. mmdx 现状与约束

| 事实 | 位置 | 对编辑器的影响 |
| --- | --- | --- |
| Pele 是唯一引擎 | `src/engine/pele.ts` | 初稿必须用 Pele 渲染；编辑器不应引入第二套布局 |
| Pele 暴露 `parse` / `render` | `node_modules/pele/dist/core.d.ts` | 可拿到节点/边/子图模型；但 `render(model)` 仍会重新布局 |
| SVG 有稳定身份 | `.pele-node[data-id]`、`.pele-edge[data-id]`、`.pele-cluster[data-id]`、边标签同 `data-id` | 可直接把 SVG 元素映射回模型，做选择与补丁 |
| 节点位置在 `transform="translate(cx,cy)"` | Pele 输出 | 移动节点只需改 transform；缩放要改形状几何 |
| 边是绝对坐标路径 | Pele 输出 | 节点移动后必须重路由相连的边 |
| 边标签独立分组 | `.pele-edge-label[data-id]` | 重路由时要同步移动标签 |
| 主题是 CSS 变量 + 内联样式 | `src/themes.ts`、`src/engine/pele.ts` | 编辑器可直接复用主题 CSS；导出时沿用现有 flatten |
| 主题有 backdrop / rough / 字体 / tone | `ThemeSpec` | 第三方画布无法原样保留；自研 SVG 层可以 |
| 没有服务器与交互层 | 全仓 | `mmdx edit` 需要新增本地 HTTP server 与前端资源 |

### 2.1 Pele 布局是“一次性”的

`pele.render(model)` 每次都从模型重新算布局。也就是说：

- 人把节点拖到别处后，下一次 `render` 会回到 Pele 的自动布局；
- 不能用“改 Mermaid 源码再重渲染”来保存人工布局；
- 必须把**人工几何**存成独立场景/补丁，Mermaid 只是初稿源。

可选的三种做法：

| 做法 | 评价 |
| --- | --- |
| 改 Pele 内部布局，让节点支持 pin 坐标 | 最彻底，但要 fork Pele 内部 `FlowVariant`/`layout`，跨版本脆弱；不推荐 |
| 渲染后直接操作 SVG，保存场景补丁 | 务实；保留 Pele 的形状/主题；本期采用 |
| 自研通用场景渲染器，完全脱离 Pele SVG | 最干净但工作量最大；等编辑器稳定后再评估 |

---

## 3. 推荐架构：mmdx 自己的 SVG 编辑器

### 3.1 分层

```
┌─────────────────────────────────────────────────────────┐
│ mmdx edit (本地 HTTP server, 仅 127.0.0.1)               │
│  - 初始渲染：现有 Renderer + Pele + ThemeSpec            │
│  - 工程 API：draft / working / autosave / restore        │
│  - 导出：SVG 序列化 / Chromium PNG / 选区裁剪            │
│  - 字体与静态资源：assets/fonts、editor bundle           │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP + JSON
┌──────────────────────────▼──────────────────────────────┐
│ 浏览器编辑器（无 React，原生 TS/DOM）                     │
│  - Viewport：pan/zoom、背景画布、网格、选中框              │
│  - Scene：节点/边/簇/画布设置 + 几何补丁                  │
│  - Interactions：框选、移动、缩放、文本、连线、对齐        │
│  - History：快照栈、撤销/重做、还原初稿                   │
│  - Renderer：以 Pele SVG 为模板，应用场景补丁              │
└─────────────────────────────────────────────────────────┘
```

关键原则：

- **渲染层仍是 Pele SVG + 主题 CSS**，编辑器只改 transform、形状几何、文本、路径与背景层。
- **场景是文档，SVG 是视图**：保存场景 JSON，加载时从初稿 SVG + 场景补丁重建视图。
- **初稿快照独立保存**：`draft` 与 `working` 分开，还原初稿不改源文件。

### 3.2 从 Pele SVG 提取场景

节点：

```ts
interface SceneNode {
  id: string;                 // .pele-node[data-id]
  shape: string;              // pele-shape-rect / diam / cyl ...
  x: number; y: number;       // 中心点，来自 translate()
  w: number; h: number;       // 形状包围盒
  label: string;
  labelLines: string[];       // 现有 tspan 行
  style: { fill?: string; stroke?: string; color?: string; fontSize?: number };
  parentId?: string;          // 所属 subgraph
}
```

边：

```ts
interface SceneEdge {
  id: string;                 // .pele-edge[data-id]
  from: string; to: string;   // 从 Pele 模型解析，而不是从 id 猜
  route: Array<[number, number]>;
  label?: string;
  labelPos?: { x: number; y: number };
  style: { stroke?: string; dashed?: boolean; arrow?: 'point' | 'none' | ... };
}
```

簇：

```ts
interface SceneCluster {
  id: string;                 // .pele-cluster[data-id]
  title: string;
  x: number; y: number; w: number; h: number;
  childIds: string[];
}
```

画布：

```ts
interface SceneCanvas {
  theme: string;              // tech / openai / ...
  tone?: 'paper' | 'neutral' | 'product';
  background: string;         // hex 或 transparent
  grid: 'none' | 'dots' | 'lines';
  gridGap?: number;
  backdrop?: boolean;         // 使用主题自带底
  width?: number; height?: number; // 固定画布；缺省 fit content
  padding: number;
}
```

提取顺序：

1. 用现有 `Renderer.render` 得到初稿 SVG（与 CLI 完全一致：主题 CSS、backdrop、rough、字体）。
2. 用 Pele `parse(source)` 得到模型，建立 `edgeId -> {from,to}`、`nodeId -> shape/label` 映射。
3. 遍历 SVG 的 `.pele-node` / `.pele-edge` / `.pele-cluster`，读 transform、形状 bbox、文本、样式。
4. 生成 `draft.scene.json`，并把 SVG 存为 `draft.svg`。
5. 以后所有编辑只改 scene；视图从 `draft.svg` 克隆 + 应用 scene 补丁。

### 3.3 视图重建：以 Pele SVG 为模板

不重写 Pele 的形状函数，直接用“模板克隆”：

- **已有节点**：保留原来的 `<g class="pele-node">`，移动改 `transform`；缩放时按新宽高缩放形状子元素（rect 改 width/height；path 用 `transform="scale(sx sy)"` 或重新计算关键点）。
- **新增节点**：从当前 SVG 里找同形状族的模板节点，克隆后按新尺寸缩放，替换文本；找不到模板时用圆角矩形。
- **新增边**：克隆现有边的 `<path>` 与箭头 marker，按路由点重写 `d`；箭头按末段方向旋转。
- **文本**：克隆现有 `text/tspan` 结构，用 Canvas `measureText` 重新换行；字体从主题 CSS 继承，等待 `document.fonts.ready`。
- **主题切换**：优先改 CSS 变量/类；需要换形状/backdrop 时重新渲染初稿并按 scene 补丁重放。

这样能最大程度保留：

- 八套主题的形状语言（圆角、粗描边、硬阴影、纸纹、点阵）；
- `excalidraw` 的 rough.js 路径（缩放已有路径；新增节点可重新跑 rough.js）；
- 中文字体与 Pele 的标签布局；
- 导出 SVG 与 CLI 的观感一致。

### 3.4 交互核心

| 模块 | 实现要点 |
| --- | --- |
| Viewport | 一个外层 `<g>` 或 CSS transform 做 pan/zoom；背景层独立，不随内容移动 |
| 命中测试 | 缓存节点/边的用户坐标 bbox；框选用 AABB；边用路径采样点+容差 |
| 框选 | 空白处 pointerdown → 画 marquee → 选中相交/包含的节点与边；Shift 加选 |
| 移动 | 选中集合整体平移；每帧只改 transform；松手后提交一次 history |
| 缩放 | 8 个手柄；按形状类型重算几何；文本重新换行；相连边重路由 |
| 文本 | 双击覆盖 `<textarea>`；Enter 换行、Esc 取消、失焦提交；CJK 逐字换行，拉丁按空格/连字符 |
| 连线 | 从节点四边中点/最近边拖出；落点吸附节点；创建边并路由 |
| 重连 | 拖边端点到另一节点；更新 from/to 与箭头 |
| 对齐 | 参考线 + 网格吸附；水平/垂直对齐、等距分布 |
| 复制/粘贴 | 选中子场景序列化；粘贴偏移 16px；内部剪贴板 |
| 撤销/重做 | scene JSON 快照栈；拖拽/输入合并；限制 100 步 |
| 裁剪 | 裁剪到选区：设置画布 bbox；导出选区：只序列化选中元素 |

### 3.5 边路由

这是自研编辑器的主要难点。建议分三级：

1. **保留 Pele 原路由**：未移动的边不动；节点移动时，把路由端点平移到新位置，内部折点不变。视觉最稳定。
2. **L/Z 折线重路由**：端点变化导致路径穿过节点时，按源/目标方向生成 1–3 段折线；按“长度 + 拐点数 + 穿越节点数”打分。
3. **拖拽折点 + 简单避障**：允许用户拖路径段生成折点；用均匀网格做 A* 或候选折线避障；后置。

边标签：

- 未重路由时保持原相对位置；
- 重路由后放在路径中点或原比例位置；
- 允许拖动标签，存 `labelPos`。

### 3.6 背景画布

把 `src/engine/pele.ts` 里的 backdrop 生成逻辑抽成可复用模块（`src/backdrop.ts`），编辑器与 CLI 共用：

- `theme`：八套预设；
- `tone`：paper / neutral / product；
- `background`：hex / transparent；
- `grid`：none / dots / lines，间距与颜色；
- `backdrop`：主题自带底（acnh 点阵、epaper 纸纹）开关；
- `width/height`：fit content 或固定画布（slide/a4/square/column）；
- `padding`：导出留白。

背景层不参与框选与移动；导出时与内容一起序列化。

### 3.7 保存、还原、导出

工程目录（建议，单图也可用单文件）：

```
.mmdx/
  arch-m2/
    meta.json          # 源文件、块序号、源 hash、主题、画布、schema 版本
    draft.svg          # AI 初稿 SVG
    draft.scene.json   # 初稿场景快照
    working.scene.json # 当前编辑场景
    exports/           # 可选，导出的 SVG/PNG
```

`meta.json`：

```json
{
  "schema": 1,
  "mmdx": "2.2.0",
  "source": {
    "file": "docs/arch.md",
    "index": 2,
    "hash": "sha256:...",
    "mermaid": "flowchart LR\n..."
  },
  "render": {
    "theme": "tech",
    "tone": null,
    "width": 1200,
    "scale": 2,
    "background": "#FFFFFF"
  },
  "canvas": {
    "mode": "fit",
    "grid": "none",
    "backdrop": true,
    "padding": 20
  },
  "draft": { "createdAt": "...", "scene": "draft.scene.json" },
  "working": { "updatedAt": "...", "scene": "working.scene.json" }
}
```

保存策略：

- 编辑变更 500ms 防抖自动保存 `working.scene.json`；
- 原子写：临时文件 + rename；
- 关闭页面前 `navigator.sendBeacon` 或同步保存；
- 源文件变化时提示「重新载入 AI 初稿 / 保留当前编辑」；
- 还原初稿：把 `draft.scene.json` 复制为 working，记入 history，可撤销。

导出：

- **SVG**：从 `draft.svg` 克隆 + 应用 scene，序列化；沿用现有 svgo 压缩；可选 `--svg-themeable`。
- **PNG**：服务端把 SVG 注入 Chromium，复用 `captureElement` 的 2x 截图与墨迹裁切；或客户端 canvas 导出后由服务端裁边。优先服务端，保证与 CLI 一致。
- **选区**：只序列化选中节点/边/标签，计算 bbox + padding；透明底可选。
- **工程**：导出 `working.scene.json` 或整个目录，便于备份/换机。

### 3.8 性能与体积

本次临时基准（headless Edge，简化 rect+text，无主题 CSS/backdrop/rough）：

| 节点数 | 建 DOM | 全量 bbox | 框选命中 | 移动 100 个节点 |
| ---: | ---: | ---: | ---: | ---: |
| 200 | 12.8ms | 0.2ms | 0.1ms | 0.4ms |
| 500 | 10.9ms | 0.5ms | 0.1ms | 0.3ms |
| 1,000 | 23.7ms | 1.0ms | 0.1ms | 0.4ms |
| 2,000 | 43.2ms | 3.0ms | 0.2ms | 1.0ms |

说明：真实图有主题 CSS、文字、backdrop、rough 抖动，会慢一些；但 mmdx 典型图是 10–200 个节点，SVG DOM 的交互余量很大。超过 ~500 节点再考虑空间索引；超过 ~1,000 节点再考虑透明 canvas 覆盖层做命中/手柄，内容仍留在 SVG。

体积目标：

| 项 | 目标 |
| --- | --- |
| 编辑器 JS（不含字体） | < 150KB min / < 50KB gzip |
| 字体 | 复用 `assets/fonts/`，按主题按需加载 |
| 新增运行时依赖 | 0（可选：无） |
| 构建 | `Bun.build`/esbuild 单文件，嵌入 `src/embed.generated.ts` |

### 3.9 稳定性

- 同一套 Edge/Chrome 要求，不新增浏览器；
- 不访问外网；所有字体/资源本地提供；
- scene schema 带版本号与迁移函数；
- 原子保存 + 最近一次备份；
- 导出走现有 SVG/PNG lint（对比度、裁切、确定性）；
- E2E 覆盖：打开 → 框选 → 拖动 → 缩放 → 改字 → 连线 → 改背景 → 撤销 → 还原 → 导出。

---

## 4. 社区项目选型

### 4.1 评估口径

- **口碑/活跃度**：GitHub stars、最近推送、issue 活跃度；
- **许可**：能否随 mmdx（MIT）分发；
- **体积**：min/gzip；
- **性能**：目标图规模（10–200 节点，偶发 500+）；
- **稳定性**：版本成熟度、breaking change 频率；
- **与 mmdx 的契合**：能否保留 Pele SVG/主题，还是必须重做渲染。

### 4.2 对比

| 项目 | 定位 | 许可 | 口碑/活跃度 | 体积（min / gzip） | 适合 mmdx 的点 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| **Excalidraw** | 完整白板编辑器 | MIT | 136k stars，2026-11 仍日更 | 主包 1.12MB / 353KB；本次全量 spike 8.9MB / 2.85MB | 框选、变换手柄、文本编辑、撤销、导出交互最值得借鉴 | **只做交互参照，不二开** |
| **tldraw** | 画布 SDK | 自定义许可，生产需商业授权 | 51.5k stars，活跃 | 1.86MB / 554KB | 无限画布性能与手感好 | **排除**（许可 + 风格） |
| **maxGraph** | draw.io 的 mxGraph 后继 | Apache-2.0 | 1.1k stars，活跃 | 621KB / 168KB | 图编辑、缩放、旋转、撤销、导出齐全 | 参考/后备；0.x + 自带渲染，重建主题成本高 |
| **JointJS** | 图编辑库 | MPL-2.0（核心） | 成熟，商业支持 | 467KB / 139KB | 端口、路由、图编辑 | 参考；MPL + 风格重建 |
| **React Flow** | React 节点/边编辑器 | MIT | 39k stars，活跃 | 262KB / 88KB | 框选、拖拽、连线、minimap 的交互范式 | 参考；HTML 节点不适合 Pele SVG |
| **Konva** | Canvas 场景图 | MIT | 15k stars，活跃 | 191KB / 57KB | 高性能拖拽/变换/命中；大画布兜底 | **可选加速层**，不作为渲染层 |
| **Fabric.js** | Canvas 对象模型 | MIT | 31.5k stars，活跃 | 299KB / 92KB | 选择/变换/SVG 导入导出/序列化 | 可选；会重渲染形状，主题保真度需重做 |
| **draw.io** | 完整编辑器 | Apache-2.0 | 9.5k stars，活跃 | 应用级，非库 | 完整 UI、Mermaid 导入、导出 | **只在需要“完整 draw.io”时作为外链/可选后端**，不作为默认 |
| **自研 SVG 核心** | mmdx 自己的交互层 | MIT（本项目） | — | 约 30–80KB / 10–25KB（粗估） | 保留 Pele SVG/主题/字体；导出同源；零框架 | **推荐** |

补充：

- tldraw 的许可证明确写明 Production Environment 需要商业授权，不能随 mmdx 默认分发。
- Excalidraw 的 CJK 字体是 Xiaolai 手写体；mmdx 的八套主题字体（Noto Sans SC、Noto Serif SC、LXGW WenKai、Excalifont 等）无法原样注入。
- maxGraph 的 0.x API 仍在演进；它渲染自己的 SVG，mmdx 的主题 CSS、backdrop、hachure 都要重新映射。
- Konva/Fabric 是 canvas 渲染；如果拿它们做内容层，就需要把 Pele 的 SVG 重新画一遍，等于放弃“与 CLI 同源”的优势。

### 4.3 选型结论

| 需求 | 选择 |
| --- | --- |
| 内容渲染 | **Pele SVG + mmdx ThemeSpec**（自研保留） |
| 交互层 | **原生 SVG + Pointer Events + 自研选择/变换/历史** |
| 大画布加速 | 需要时再加**透明 Konva/Canvas 覆盖层**做命中与手柄；内容仍为 SVG |
| 交互参照 | Excalidraw（选择/变换/文本/撤销）、Visio（对齐/连接线/页面设置） |
| 不采用 | tldraw（许可）、Excalidraw/tldraw/draw.io 二开（风格/模型）、maxGraph（过重） |

---

## 5. 关键验证与已排除路线

### 5.1 Excalidraw 路线（已验证，但按约束排除）

临时 spike（2026-11-20，未进仓库）：

- `@excalidraw/mermaid-to-excalidraw` 3.6.0 依赖 Pele 1.13；`parseMermaidToExcalidraw` 把 6 节点/5 边的流程图转成 13 个可编辑元素，箭头带 start/end 绑定，`classDef` 颜色保留。
- 直接用 mmdx 的 Pele 1.9 渲染 SVG + 转换器的 SVG 解析器（deep import）也能得到 13 个元素：位置、颜色、边绑定、子图标题都保留；状态图转出 10 个元素（含起止圆点）。
- Excalidraw 编辑器在 headless Edge 中可渲染；导出 SVG 29KB、PNG 56KB；全量 bundle 8.9MB min / 2.85MB gzip。

结论：技术上走得通，而且能复用 Pele 布局；但它会把产品视觉换成 Excalidraw 的白板/手绘体系，scene 模型也不是 mmdx 的。按“风格一致、不二开原型”的约束，**不作为方向**；只保留“Pele SVG 可解析为可编辑图元”的结论，用于自研场景提取。

### 5.2 自研 SVG 基准（本次验证）

- 2,000 节点简化场景：建 DOM 43ms、全量 bbox 3ms、框选 0.2ms、移动 100 节点 1ms。
- 说明 SVG DOM 对 mmdx 的典型规模足够；真实主题/文本/backdrop 会更慢，但余量充足。

### 5.3 尚未验证

- [ ] class / ER / sequence 的场景提取与编辑（flowchart/state 已做 spike）
- [x] 八套主题下的文本换行与字体度量（`tech` / `acnh` 实测；换行走 Canvas measureText）
- [ ] 子图容器缩放/拖入拖出（当前只做成员移动后的外框重算）
- [ ] 边路由避障与折点拖拽（当前只做 L/Z 正交路由）
- [x] 撤销/重做在复杂操作下的正确性（选择/移动/缩放/改字/删除/还原的快照链已跑通）
- [ ] 500+ 节点真实图的拖拽帧率
- [ ] 导出 PNG 与 CLI 产物的逐像素一致性
- [ ] `mmdx edit` 在编译后二进制中的资源嵌入与启动时间

---

## 6. 分阶段计划

> 粗估，按一名熟悉前端的工程师计；不含主题/字体细节打磨。

### Phase 0：技术验证（3–5 天）

- [x] 从 `Renderer.render` 产出的 SVG 提取 flowchart/state 场景；
- [x] 原生 SVG 框选、移动、缩放、文本编辑的最小原型；
- [x] 一条边的 L/Z 重路由；
- [x] 背景色/网格切换；
- [ ] 200 节点拖拽基准（小图 debug bench 已通，200 节点真实图待补）。

**通过标准**：不改 Pele，能在浏览器里移动节点、改字、连线、撤销，导出 SVG 与初稿同源。—— 已满足；连线当前是移动后重路由，新建/重连在 Phase 1。

### Phase 1：MVP（3–4 周）

- `mmdx edit` 命令 + 本地 server + 工程目录；
- flowchart/state 的框选、多选、移动、缩放、文本、增删节点、连线/重连；
- 画布：主题/色调、背景、网格、backdrop、尺寸、留白；
- 撤销/重做、复制/粘贴、对齐/吸附；
- 保存/自动保存/还原初稿；
- 导出 SVG/PNG/选区；
- E2E 与视觉回归。

**通过标准**：八套主题下打开初稿观感与 CLI 一致；框选/移动/改字/连线/背景/还原/导出全链路可用；200 节点流畅。

### Phase 2：完整交互（3–4 周）

- class/ER/sequence；
- 子图容器移动/缩放/拖入拖出；
- 折点拖拽、简单避障、边标签拖动；
- 对齐/分布/参考线、批量样式；
- AI 再出稿按节点 ID 合并；
- 500+ 节点空间索引/可选 canvas 覆盖层。

### Phase 3：可选增强

- 图层/锁定/隐藏；
- 形状面板（仅 Pele 已有形状族）；
- 版本历史/多页；
- PDF 导出；
- 实时协作（如确有需求，另立项目）。

---

## 7. 风险与开放问题

### 风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 边路由复杂度 | 移动节点后连线难看/穿节点 | 先保留 Pele 原路由，再 L/Z，再避障；允许手动折点 |
| 文本换行/字体度量 | 改字后溢出/错位 | 用 Canvas measureText + 主题字体；CJK/拉丁分别换行；加 lint |
| 形状模板不全 | 新增节点形状不对 | 从当前 SVG 克隆同形状模板；缺模板用圆角矩形 |
| 子图容器 | 拖动子图散架 | Phase 1 整体移动；Phase 2 再做缩放/重排 |
| 主题切换 | 重渲染丢人工布局 | 场景补丁按 ID 重放；或只允许背景/色调切换 |
| 工程格式演进 | 旧工程打不开 | schema 版本 + 迁移；保存前备份 |
| 范围蔓延 | 变成 draw.io 克隆 | 严格按 §1.2 的交互基线；shape library/协作不做 |
| 性能 | 大图卡顿 | 缓存 bbox、空间索引、rAF 批处理；必要时 canvas 覆盖层 |

### 开放问题

1. 工程文件是否默认提交到 git？`.mmdx/` 是本地草稿还是团队资产？
2. 首版只支持 flowchart/state，还是必须同时覆盖 class/ER？
3. 导出是否需要 PDF/PPT？如果需要，走 Chromium 打印还是另接库？
4. AI 再出稿时，人工修改的冲突策略：按节点 ID 合并、整图替换、还是只提示？
5. 是否需要多页/多图工程（一个 `.md` 的多个块）？
6. 画布背景是否需要“导入图片/纹理”，还是只用主题自带底？

---

## 8. 参考

- Pele API：`node_modules/pele/dist/core.d.ts`、`types.d.ts`、`diagrams/flowchart/types.d.ts`
- mmdx 渲染管线：`src/render.ts`、`src/engine/pele.ts`、`src/capture.ts`、`src/themes.ts`
- Excalidraw：<https://github.com/excalidraw/excalidraw>（MIT）
- mermaid-to-excalidraw：<https://github.com/excalidraw/mermaid-to-excalidraw>（MIT）
- tldraw 许可证：<https://github.com/tldraw/tldraw/blob/main/LICENSE.md>
- maxGraph：<https://maxgraph.github.io/maxGraph/>（Apache-2.0）
- JointJS：<https://www.jointjs.com/>（核心 MPL-2.0）
- React Flow：<https://reactflow.dev/>（MIT）
- Konva：<https://konvajs.org/>（MIT）
- Fabric.js：<https://fabricjs.com/>（MIT）
- draw.io embed mode：<https://www.drawio.com/docs/reference/embed-mode/>（Apache-2.0）

---

## 9. Phase 0 原型落地记录（2026-11-20）

### 9.1 已实现

- **命令**：`mmdx edit <file.md|file.mmd> [--index N] [--theme] [--tone] [--style-fill] [--preset] [--background] [--width] [--scale] [--config] [--project] [--port] [--browser] [--fresh] [--no-open]`。
- **初稿**：仍走 `Renderer.render` → Pele → `peleCss` → flatten，SVG 与 CLI 同一套主题、字体、rough.js 与 backdrop；编辑器不引第二套渲染器。
- **场景提取**：节点从 `.pele-node[data-id]` 读形状包裹层、局部 bbox 与 `translate`；边从 `.pele-edge[data-id]` 的 path 读路由，用 Pele `parse(code)` 的 `edgeId → from/to` 绑定（缺失时按路径端点就近吸附节点）；边标签按同 `data-id` 独立分组；子图从模型 `subgraphs` 拿成员，容器 rect 是绝对坐标，不依赖 DOM 嵌套。
- **交互**：点选 / Shift 加选 / 框选（相交）、多选拖动、8 手柄缩放（Shift 保持比例）、双击改字、方向键微调、Delete、空格 / 中键平移、滚轮以光标为中心缩放、`F` / `0` 适应、`1` 100%。
- **文本**：双击覆盖 `<textarea>`，提交时用 Canvas `measureText` 按主题字体断行（CJK 逐字、拉丁按 token），重写成 `<tspan>`，必要时放大形状包裹层并重新路由相连边。
- **边**：节点移动 / 缩放后按中心位移选边侧，生成直线或 L/Z 折线；重写箭头三角 marker，标签平移到折线长度中点。未触碰的边保留 Pele 原曲线路由。
- **连线锚点**：点选连线显示两端圆点；拖动圆点沿目标节点四边取最近侧与归一化 `t`，写 `data-mmdx-from-anchor="right:0.4500"` / `data-mmdx-to-anchor`，拖到另一个节点上改写 `data-mmdx-from/to` 重连。锚点按节点 bbox 重新求点，所以移动 / 缩放后仍贴着同一条边、同一比例位置；落空或撤销会恢复原 path / marker / 标签位移。
- **节点配色**：单选节点后侧栏给出填充 / 描边 / 文字三个原生取色器。首次改色时从形状部件与标签的实际 `fill` / `stroke` 记录基准色（`data-mmdx-base-*`）和可涂标记（`data-mmdx-fillable/strokable`），随后把覆盖写入 `.pele-node` 的 `data-mmdx-fill/stroke/text` 并只改可涂部件；覆盖值随场景 JSON 保存，切模板、刷新与重开工程后重放。「跟随主题」按基准色恢复并清掉覆盖。取色器 `input` 开事务、`change` 提交，一次连续拖动只占一个撤销步骤。
- **连线样式**：单选或多选连线后侧栏给出颜色 / 粗细 / 线型 / 箭头。覆盖写 `.pele-edge` 的 `data-mmdx-edge-stroke/width/dash/arrow`，首次改样式时记录 path 与 marker 的 `data-mmdx-base-edge-*` 基准；应用时 path 改 `stroke` / `stroke-width` / `stroke-dasharray`，marker 按箭头模式改 `fill` / `stroke` / `display`。线型虚实与点距按线宽计算；空心箭头是描边三角形。节点移动 / 重路由只改 path `d` 与 marker `d`，样式保留；切模板时客户端把 `style` 一并放进场景补丁并重放，重置按新模板的基准恢复。多选时一次操作对全部选中边生效。
- **连线走线**：`route` 支持 `auto` / `orthogonal` / `straight` / `curved`，写 `data-mmdx-edge-route`。折线走原 L/Z 候选评分与 14px 并线；直线直接用两端锚点；曲线按两端锚点法线各推一段控制距离（20–120px）生成三次贝塞尔，箭头按 `c2→b` 切线定向，标签落在曲线 t=0.5。首次从自动改到其它模式时把原 path / marker / 标签位移存进 `data-mmdx-base-edge-*`，切回自动逐字节恢复；切模板时新主题的初稿在覆盖前重新记录基准，因此重置回到当前主题的原路径。拖锚点 / 移动节点时 `rerouteEdge()` 读取当前模式重算，样式不丢。
- **保存可靠性**：`/api/save` 落盘后同步更新服务端 `initialSvg` 与 `resumed`，刷新读取最新工作图；客户端在保存进行中再次收到保存请求时置 `saveQueued`，当前请求结束后补一次，避免最后一次编辑被 `state.saving` 直接丢弃。
- **小距离并线**：`alignRouteEnds()` 在生成 L/Z 候选前检查两端锚点：同为左右侧或同为上下侧、且共享轴坐标差在 0.01–14px 时，把两端并到中点；合并后的直线段必须完全落在两个节点外侧、不穿过任一节点 bbox，否则保留原锚点。只改路由端点，不写回 `data-mmdx-*-anchor`，所以撤销 / 重开仍是用户拖出的原始位置。
- **内置模板切换**：侧栏列出八套主题；服务端 `/api/theme/preview` 用同一份 Mermaid 与配置重出初稿，客户端重放节点中心 / 缩放 / 文字 / 颜色、连线绑定 / 锚点与删除项，`/api/theme/commit` 一次性写 `draft.svg`、`working.svg`、场景 JSON 与 meta。字体 CSS 按主题切换（`/fonts.css?theme=...`），暗色主题同步 chrome；提交失败回滚。重开工程从 meta 恢复上次模板。删除判定只比较切换前的边 id 集合，因为 state 复合状态 / 子图容器的 id 不在 `.pele-node` 里，按端点存在性判断会误删这些边。
- **画布**：背景色、点阵 / 方格网格（导出可选）、透明底（自动关闭主题底纹并保留 alpha）、主题底纹开关、8px 网格吸附。
- **工程**：默认 `<source>/.mmdx/<slug>/`，写 `meta.json`、`draft.svg`、`draft.scene.json`、`working.svg`、`working.scene.json`；自动保存 650ms 防抖，重开优先 `working.svg`，源 hash / 渲染配置变化时保留旧工作稿并重开初稿；「还原初稿」可撤销。
- **导出**：客户端序列化 SVG（背景 + 网格 + 主题底纹，按内容 bbox 扩边）；PNG 走服务端现有 Chromium + 字体注入，2× 截图，透明导出 `omitBackground`。

### 9.2 非交互 CLI 隔离

- `src/embed.ts` / `Renderer` / `src/cli.ts` 的静态模块图不加载 `src/editor/*`；`edit` 分支才动态 import `src/editor/server.ts`。
- 编辑器客户端资源有独立的 `src/editor/embed.ts` + `src/editor/embed.generated.ts`；`scripts/build.ts` 只在构建时把 `src/editor/client/*` 内联进后者，主 `src/embed.generated.ts` 保持原样。
- 编辑器字体 CSS、HTTP 服务、PNG 导出用的 Chromium 页面池只在 `edit` 生命周期存在。
- 验证：`bun run test` 201/201；普通单图 `mmdx tests/diagrams/flowchart.md -f svg` 约 1.6s（浏览器启动占主要部分），无 `.mmdx` 副作用。

### 9.3 E2E 证据（headless Edge）

| 检查 | 结果 |
| --- | --- |
| flowchart 提取 | 6 nodes / 5 edges / 1 cluster |
| 点选 / 手柄 | A 选中，8 个手柄 |
| 拖动 + 撤销 | A 位移 (56,32)，Undo 回原坐标，误差 <1e-12 |
| 框选 | B + C 同时选中 |
| 组移动 | B、C 同步位移 |
| 缩放 | C 从 96×47 → 144×72，handle 保持 8 个 |
| 改字 | `核心服务` → 两行 `核心服务 / v2`，节点高度 47 → 60.4 |
| 边重路由 | `L_B_C_0` 从 Pele 曲线改为 L/Z，路径变化 |
| 画布 | 点阵 / 方格、`#f7f3ea` 背景、透明 dataset 与控件联动 |
| 保存 / 导出 | `working.svg` 写入；SVG 可 parse、含背景与簇；PNG 200 / 54KB |
| 还原初稿 | 标签回到 `核心服务`，可 Undo |
| 连线锚点 | `L_A_B_0` 起点从 A 右侧改到 A 底边 0.5，路径与 `data-mmdx-from-anchor` 同步；Undo 移除属性并逐字节恢复原 path |
| 重连节点 | `L_C_E_0` 终点拖到 F：`from/to` 与 `data-mmdx-to="F"` 更新，路由经过新端点；Undo 恢复 C→E |
| 落空回滚 | 端点拖到空白处：属性不写、Undo 计数不变、path `d` 与拖前完全一致 |
| 节点配色 | 真实鼠标点选 A 后出现 3 个取色器；DOM 设 `#FFCCE0` 并派发 input / change，填充立即变 `rgb(255,204,224)`、`data-mmdx-fill="#ffcce0"`；Undo 恢复主题色并移除属性，Redo 重新应用；点「跟随主题」清空覆盖、按钮回到禁用 |
| 连线样式（单边） | 点选 `L_A_B_0`：颜色 / 粗细 / 线型 / 箭头四个控件；设 `#E4572E` 后 path 与 marker 同步、3px、虚线 `12px, 7.5px`；空心箭头 marker `fill=none`、`stroke=线色`，无箭头 `display=none`；Undo / Redo 在空心与无箭头之间切换；重置清空 4 个属性并恢复 1.5px / 实线 / 实心箭头 |
| 连线样式（多选） | Shift 点选 `L_A_B_0` + `L_B_C_0`，面板显示「连线样式（2 条）」；设点线后两条 path 均为 `1.35px, 3.75px`，`data-mmdx-edge-dash="dotted"` |
| 连线样式持久化 | 设色 `#E4572E` / 4px / 点线 / 无箭头，`tech → zed` 后四项保留；重置回 zed 的 1px / 实线 / 实心；再设 `#2255AA` / 虚线，`acnh` 下重置回 2.6px 与 acnh 线色；再设 `#B14356` / 3px / 虚线 / 空心，save + reload 后四项与主题均保持 |
| 走线算法 | `L_B_C_0` 原路径含 `C`；直线后 `M…L…` 共 2 点，折线后 4 点且无 `C`，曲线后单个 `C`；切回自动逐字节回到原路径 |
| 走线随几何变化 | 曲线模式下把起点拖 8px，路径仍含 `C`；Undo 恢复曲线；直线模式下拖 B 节点，路径仍是 2 点直线，`data-mmdx-edge-route="straight"` 保持 |
| 走线持久化 / 主题 | 曲线 + `#B14356` / 3px / 虚线 / 空心，save + reload 后全部保持；`acnh` 下仍为曲线且样式保留，重置后路径等于 acnh 新基准（`data-mmdx-base-edge-path`），属性清空；多选 A→B 与 B→C 设曲线后两条都含 `C` |
| state 走线 | `edge4` 设曲线 + `#B14356`、`edge1` 设直线 + 点线；reload 后保持；`tech → openai` 后仍为 8 nodes / 7 edges / 1 cluster，走线与样式保持；`edge4` 重置后回到主题基准 |
| 样式随重路由 | 3px 虚线空心边拖 9px 后 path 只剩一个 y，样式属性不变；拖 B 节点产生新折线后样式仍在，Undo 恢复路径且样式不丢 |
| state 连线样式 | `edge1` 设 `#2255AA` / 2px / 点线、`edge4` 设 `#B14356` / 虚线 / 无箭头，save + reload 后保持；`tech → openai` 后仍为 8 nodes / 7 edges / 1 cluster，两组样式与 `edge4` 的箭头隐藏均保持 |
| 保存队列 | 拦截 `/api/save` 延迟 700ms：首次保存进行中再改色并触发保存，最终发出 2 个请求；reload 后读到第二次保存的 `#2255AA` / 虚线 |
| 移动端 | 390×844 打开侧栏并选中连线：5 行样式控件（走线 + 颜色 + 粗细 + 线型 + 箭头）左 27 / 右 363，页面无横向溢出，面板可滚动 |
| 小距离并线（拖拽） | 选中 `L_A_B_0`，鼠标把起点沿 A 右侧上拖 9px：锚点 `right:0.3394`，path 只剩一个 y（153.65），四条水平段共线；Undo 回原锚点 |
| 大偏移保留折线 | 同一端点拖 22px：path 保留两个 y（138.97 / 157.42），仍是 L/Z 折线 |
| 移动 / 缩放保锚点 | A 底部锚点 `t=0.5` 在移动与 SE 缩放后仍落在 A 底边中点 |
| 多选连线 | Shift 点选两条边，Delete 删 2 条、节点数不变，Undo 恢复 |
| 模板切换 | tech → acnh：字体切到 ZCOOL KuaiLe / Baloo 2，图形填充与画布色切换，节点位移 <1e-5，文字、锚点、删除项保留 |
| state 模板切换保边 | 8 nodes / 7 edges 的 state fixture，`tech → openai` 后仍是 8 / 7；`edge4`（`已支付 → 退款中`，终点为复合状态 id）保留，全部 id 与绑定不变 |
| 模板重开 / 落盘 | 页面 reload 与进程重启后仍是 acnh；meta 记录主题，`working.svg` 保留锚点与删除项 |
| 提交失败回滚 | 拦截 `/api/theme/commit`：画布恢复 acnh、主题 select 回 acnh、文字与删除项不变 |
| state 图 | 8 nodes / 7 edges / 1 cluster；移动 `已支付` 后 2 条边重路由；Undo 回原坐标 |
| acnh backdrop | 基底 rect 与 `.mmdx-backdrop` 同时隐藏 / 恢复；透明 PNG 角 alpha=0、非透明像素 28% |
| 移动端 390px | stage 489px、侧栏默认收起、按钮展开；节点仍可编辑 |
| 编译二进制 | 最新 build 后启动 `dist/mmdx-windows-x64.exe edit`：8 个模板、真实鼠标点选出现 3 个取色器并能改色 / Undo / Redo / 跟随主题、拖 9px 并线 / 拖 22px 保留折线、state 图 `tech → openai` 8 nodes / 7 edges 全保留；tech→acnh→zed→tech 与 reload 后颜色、锚点、并线结果保持 |

200 节点 / 370 边真实图（`--width 2400`，headless Edge）：浏览器 boot 455ms；场景提取 70ms；2000 次节点命中 2.8ms；100 次连线命中 2.6ms（缓存世界坐标折线 + bbox 预筛，首次实现逐边采样时为 9.2s/100 次）；锚点重路由 + overlay 0.072ms/次；移动 20 / 50 / 200 个节点分别 0.4 / 1.4 / 5.6ms。

### 9.4 已知限制（Phase 1 入口）

- 只支持 flowchart / state；新增节点 / 新建连线 / 复制粘贴未做。
- 缩放是形状包裹层整体 scale，圆角、描边、图标会随比例变化；形状几何级缩放（rect 改 width/height、diamond 重算 points）留到 Phase 1。
- 文本编辑只改标签，不提供字号 / 对齐面板；颜色已支持填充 / 描边 / 文字覆盖。换行后宽度不会先扩张，只保证高度不裁。
- 连线样式只覆盖走线 / 颜色 / 粗细 / 线型 / 箭头；标签字体、折点圆角与虚线偏移未做。空心箭头是描边三角形，主线从三角形内部穿过，箭头尺寸也不随线宽缩放。
- 子图容器只在成员移动后重算 bbox，没有容器自身拖动、拖入 / 拖出与嵌套布局。
- 边支持自动 / 折线 / 直线 / 曲线；直线可能穿过节点，曲线只按锚点法线生成控制点，没有避障、折点拖拽与曲线控制柄；锚点没有磁吸到形状的几何交点。
- 模板切换会清空撤销栈；极大的图（数百节点以上）重出初稿要等一次 Pele 渲染。
- 导出 PNG 与 CLI 的逐像素一致性未验证；编辑器导出的 SVG 会把主题 backdrop 元素一起序列化，Office 兼容性未测。
- 编译后二进制已跑通编辑器启动、节点配色、连线样式、小距离并线、锚点与模板切换（含 state 复合边保留）；更长的编辑会话与 class / ER / sequence 仍只在源码模式或未覆盖。

