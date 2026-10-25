# 调研：社区 HTML 生图 skill（vivid-illustration 同类）哪些值得引入

> 对象：用户点名的 [yjz211/vivid-illustration-skill](https://github.com/yjz211/vivid-illustration-skill) 及社区同类（2026-10-25 核实）
> 对照：`skill/SKILL.md` 场景分级（高速围栏 / 精美 editorial）+ `issues/README.md` 边界（复杂统计图 → AntV，信息图模板 → Infographic）
> 用户标准（五轴）：**口碑好、风格一致性高、输出稳定、产物可 `mmdx file.html` 直转 PNG、与现有能力零重叠（扩展领域场景）**
> 结论先行：**vivid-illustration 本尊许可一票否决（个人非商业，禁改禁再分发）；真正值得引入的是 nicobailon/visual-explainer（10.6k★，MIT，五轴全过），作为「解释页」新域 vendor 进 `skill/explain/`。官方 canvas-design / algorithmic-art 领域全新但风格一致性故意低、离线性差，不引入。运行时方面：**不引入它的 renderer**——skill 规格化改造（§5 路线 D），写作模型（register / kit 类名 / 图型 references）保留、交付换成 mmdx 既有模式（自包含 HTML → `mmdx --scale 3`），渲染零新增、上游运行时一个文件不随附、mmdx 代码零改动。**
>
> **落地状态（2026-10-25，v1.4.2）**：本方案已实施并验证——`skill/explain/` 四 register starter + Latin 字体包、mmdx 三家族中文字体注入（§6.3）、§5.4 吸收清单中的错误闸/QA 以 **figure lint**（figure-overflow / text-overlap / **text-adhesion** / small-text / caption / aria，LSP 式消息）形式提前落地；端到端 lint 清零 + 负样本全中 + 94/94 回归，实证记录见 CHANGELOG 1.4.2 与 `tests/explain-e2e/`。

## 1. 候选全景与淘汰理由

| 候选 | 口碑 | 许可 | 领域 | 结论 |
| --- | --- | --- | --- | --- |
| **yjz211/vivid-illustration-skill** | 543★ | ❌ **Personal Non-Commercial v1.0**：禁修改、禁二次开发、禁再分发（私有备份除外）、禁商业 | 科研图表（数据图 matplotlib + 架构图 SVG 双通道，108 配方） | **不引入**。vendored 快照 = 再分发，直接违反条款 3；即使个人用也禁二开。且数据图域撞 AntV 边界 |
| **nicobailon/visual-explainer** | **10,619★** | ✅ MIT (v0.14.0) | 工程解释页：diff/plan 评审、project recap、概念解释、HTML 幻灯片、PPTX、MP4 视频 | **主推荐引入**（§3） |
| anthropics/skills `canvas-design` | 官方（仓库 183k★） | Apache-2.0 | 艺术海报 / design philosophy → PNG/PDF | 不引入：**每次生成全新设计哲学，风格一致性是故意反的**；渲染路径不绑 HTML（agent 自选）；字体包 85+ TTF 需随附 |
| anthropics/skills `algorithmic-art` | 官方 | Apache-2.0 | p5.js 生成艺术（seed 确定性） | 不引入：viewer.html 依赖 **CDN p5.js 1.7.0 + Google Fonts**，离线即死，违反 mmdx「离线中文一致」护城河；风格同为哲学驱动 |
| tt-a1i/archify | 88,844★ | — | 交互式图解（idea/plan/codebase → interactive diagram） | 不引入：**图/diagram 域与围栏 + editorial 正面撞车**，违反「零重叠」；交互产物也非 PNG 交付 |
| Egonex-AI/Understand-Anything | 88,109★ | — | 代码 → 交互式知识图谱 | 不引入：代码理解工具，非出图管线 |
| K-Dense-AI/scientific-agent-skills | 54,464★ | — | 科研技能库（含图表） | 不引入：数据图域 = AntV 地盘 |
| nicobailon 其余 / cathrynlavery 其余 | — | — | — | cathrynlavery 只有 diagram-design 一个出图 skill，已 vendor |

社区里「HTML→图」口碑集中在两条线：**editorial 结构图**（diagram-design，已引入）和**工程解释页**（visual-explainer，本次建议引入）。海报/生成艺术线只有官方两个 skill，风格一致性不达标。科研图表线（vivid-illustration、scientific-agent-skills）整体撞 AntV 边界 + 许可参差，不值得开域。

## 2. visual-explainer 是什么、怎么工作

> [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer)：把系统、代码变更、计划、数据、技术概念变成「十秒能看懂」的富样式 HTML 页。默认产物 = 一个以图为主干、文字只做标注的单页。

工作管线（与 diagram-design 的「纯规格」不同，它带**运行时**）：

1. agent 写 `name.src.html`（骨架 + 页内内容 + `<link data-ve-kit>` 标记），风格由 **kit 设计系统**约束：token、字体、figure CSS、脚本全部来自 kit
2. `node kit/render.mjs name.src.html` → 产出 **`name.html` 单文件自包含页**：kit CSS/字体/SVG defs/脚本在标记处全部内联（源码有错则一个字都不写，错误闸 `✗` 逐条列出）
3. render 附带视觉 QA（problem sheet），按 sheet 小步修 `.src.html` 重渲，不许整页重写
4. mmdx 适配点：**PNG 交付用 `mmdx name.html --scale 3`**，与 editorial 同一条导出路径

风格一致性的构造来源：`kit.css`（23KB 设计 token）+ `data-register` 语域机制（concept/essay/paper…）+ `references/style-guide.md` + `references/themes.md`。**这是同类 skill 里唯一把「风格一致性」做成构造保证而非口头期望的**。

规模：规格层（SKILL.md + 9 个 references，约 60KB）非常轻；运行时（kit/plan/templates/pptx/video + vendor 的 pele.mjs）合计约 1MB——注意它 vendor 了 **PELE**，与 mmdx 默认引擎同源。

## 3. 五轴评估（对照用户标准）

| 轴 | vivid-illustration | visual-explainer | canvas-design / algorithmic-art |
| --- | --- | --- | --- |
| 口碑 | 543★ | **10.6k★，多宿主适配（Claude/Codex/Cursor/Copilot/OpenCode/Pi/Antigravity）** | 官方背书 |
| 许可 | ❌ NC，禁再分发 | ✅ MIT | ✅ Apache-2.0 |
| 风格一致性 | ✓（鲜艳/稳重双风格体系） | ✅✅ **kit token + register + style-guide 构造保证** | ✗ 每次新哲学（by design） |
| 输出稳定 | ✓ 配方制 | ✅✅ render 错误闸 + QA sheet + 「源码有错不产出」 | ✗ 自由发挥；art 有 seed 但依赖 CDN |
| mmdx 直转 | ✗ 非 HTML 主路径 | ✅ **render 后单文件自包含 HTML；`mmdx file.html --scale 3` 即可**（Google Fonts CDN 离线回退，同 editorial 处理） | △ 路径不绑 HTML / CDN p5 |
| 领域零重叠 | ✗ 撞 AntV | ✅ **解释页/评审页/recap/HTML 幻灯片/PPTX/视频——全新域**；仅 diagrams 子能力与图域相邻，可分界（见 §4-2） | ✅ 艺术海报/生成艺术是全新域，但被风格轴否决 |

诚实标注：visual-explainer 仍是「模型手绘 + 规格约束」，不是围栏那种确定性渲染——和 editorial 同级，定位**低频、叙事性、一次性**；稳定性来自 kit 约束与 render 闸门，高于裸 prompt，低于围栏。不改变「高频办公出图默认走围栏」的纪律。

## 4. 引入方案（若确认，后续任务执行）

### 4.1 目录：目录即域

```
skill/
├── SKILL.md          # 场景分级表加「解释页」档 + 按需加载清单加 explain/ 一行，默认零加载
├── references/       # mmdx 自有规格（不变）
├── editorial/        # vendored diagram-design —— 精美结插图域（不变）
└── explain/          # vendored visual-explainer（规格化改造版）—— 工程解释页域（新）
    ├── README.md     # mmdx 适配层：来源 commit / MIT / 嵌入范围 / 覆盖表 / 改造点与同步口径（照抄 editorial/README.md 模式）
    ├── UPSTREAM-SKILL.md
    ├── SKILL.md      # 改造版工作流：starter 装配式写作 → mmdx 直截（替代上游 .src.html + render.mjs 流程）
    ├── references/   # 9 个 .md，约 60KB（写作模型全保留；提及 render.mjs 处由 README 覆盖表接管）
    ├── kit/          # 仅静态资产：kit.css / defs.svg / mermaid.css + starter 模板；*.mjs、kit.js/ask.js/reply.js 一律不随附
    ├── plan/ templates/  # 纯 HTML 模板保留、含运行时的剔除（vendor 时逐个核定）
    └── LICENSE-visual-explainer
```

### 4.2 分界线（写进根 SKILL.md 与 explain/README.md，防域间渗漏）

| 场景 | 归属 |
| --- | --- |
| 多图叙事解释页、diff/plan 评审页、project recap、HTML 幻灯片/PPTX、MP4 讲解 | **explain** |
| 单张结构图/数据图/版式块交付（贴 PPT、周报） | 围栏（高速档） |
| 单张 editorial 质感封面/方案插图 | editorial（diagram-design） |
| 分组柱/双轴/散点等分析级图表 | AntV mcp-server-chart |
| explain 内的 hand-drawn SVG | 只做**页内 figure**，不做独立图交付——不抢围栏/editorial 的单图场景 |

### 4.3 适配层覆盖表（mmdx 语境以下列为准；references 与 kit 资产原文保留，SKILL.md 工作流改写）

| 上游写的 | mmdx 语境下改为 |
| --- | --- |
| 浏览器查看 / look 步骤的截图路径 | PNG 交付一律 `mmdx name.html --scale 3`（系统 Edge，不下载浏览器） |
| `node kit/render.mjs` 整条运行时（kit 内联、标签展开、构建期 mermaid SVG 化、错误闸） | **不跑、不随附**：kit 内联改写作期装配（starter 模板 + shell 拼装）；ve-bars / ve-waffle / ve-stack / ve-flow 按 references 手写展开形态；页内 mermaid 先用 `mmdx` 预渲成 SVG 再内联（§5.3） |
| ve-ask 交互与 ask.js / reply.js / kit.js | 不随附：PNG 交付用不到交互；出图图型避免依赖 JS 初始态（端到端实测项） |
| Google Fonts（Geist 等 4 register 拉丁家族） | **不依赖 CDN**：核心拉丁包（153.5KB，§6.2）以 data-URL @font-face 预嵌 starter，离线一致；中文按 §6.3 由 mmdx 管线注入黑/宋/楷三家族兜底，register 气质中文不断档 |
| `~/.agent/diagrams/` 默认输出目录 | 沿用当前工作区/用户指定路径 |
| MCP / Pi / 插件宿主接入 | 不适用；只取 skill 文件形态（SKILL.md + references + kit 静态资产） |

### 4.4 上下文治理六条（「分门别类」的落点）

1. **目录即域，一域一 README**：每个 vendored 目录自带唯一适配层（来源、许可、范围、覆盖、同步），根 SKILL.md 只保留一行档位 + 一行按需加载入口 + 触发词，**默认零加载**。
2. **渐进披露**：进 explain 先读其 README（三步用法），动笔前才读 `style-guide.md` + 当前场景对应的一个 references 文件；9 个 references 约 60KB，**不预读**（editorial 先例：全量 90 万字符只按需取一个 type 文件）。
3. **许可门**：vendored 必须可再分发（MIT / Apache-2.0）；NC / 禁衍生类（vivid-illustration）**永久不进 `skill/`**，只在调研文档记录「为什么不」。
4. **导出统一走 mmdx**：所有域的位图交付收敛到 `mmdx file.html --scale N`，上游自带的浏览器/截图路径在适配层一律覆盖；离线字体栈兜底是硬规则。
5. **运行时零新增（论证见 §5 路线 D）**：editorial 是规格-only，**explain 同样规格-only**——上游 renderer（render/flow/ask/tags.mjs、html.mjs、vendor/pele.mjs、kit.js 等）一个文件不随附，写作模型（register / kit 类名 / 图型 references）保留，交付改走 mmdx 既有管线：自包含 HTML → `mmdx --scale 3`，中文自动吃到注入的 Noto Sans SC 兜底（既有行为）。kit.css 内联由 starter 模板 + shell 装配完成，不进 LLM 上下文。错误闸随 renderer 放弃，QA 靠看 PNG 迭代（editorial 同级），补回手段见 §5.4 吸收清单。
6. **回哺同构**：explain 域的新画法沉淀进其 references，并同步根 SKILL.md「按需加载」索引——复用现有 §1e 机制，不为新域另造流程。

### 4.5 落地顺序建议

1. vendor 快照 + README 适配层 + LICENSE（一次 commit，标注上游 commit 号）
2. 规格化改造（§5.3 路线 D）：SKILL.md 工作流改写（starter 装配式写作、数据标签手写展开、页内 mermaid 预渲内联）、kit 静态资产 + starter 模板落位、plan/templates 逐个核定去留（纯模板保留、运行时剔除）；README 记录改造点与上游同步口径（spec/设计系统跟上游演进，runtime 不跟）
3. 字体策略落地（§6，可与步骤 2 同 PR）：Latin 包 woff2 + OFL 全文入 `skill/explain/kit/fonts/`，starter 按 register 预嵌 data-URL @font-face（§6.2）；mmdx 侧 Noto Serif SC + 霞鹜文楷子集进 exe、`fontCss/cjkFallbackCss` 扩三家族（§6.3，独立核心增强，可另立任务先行）
4. 根 SKILL.md：场景分级表加行、按需加载清单加行、适用边界补「解释页 → explain/」
5. 实测一条端到端：概念解释页（含中文 + 手绘 SVG figure + 一张页内 mermaid 预渲，paper register 验证宋体配对）→ `mmdx name.html --scale 3` → 视觉 QA（重点验证：无 JS 初始态是否完整可见，stepper 类图型静态可读）；简中三家族实测结论回写 README（照 editorial 的「简中手绘实践要点」节）
6. CHANGELOG + release notes（feature 级版本号）

（§5.4 的吸收项不进首期，逐项另立任务。）

## 5. 运行时依赖消除：规格化复用 mmdx 管线（2026-10-25 逐文件核实上游 v0.14.0）

> 背景矛盾：mmdx 本体是 TypeScript + bun 工具链，Release 二进制 = `bun build --compile` 单文件 exe（`scripts/build.ts`）——**exe 里内嵌的运行时本来就是 bun，不是 node**；README 承诺「产物机器上也不需要 Node」。explain 域若照上游原文要求 `node kit/render.mjs`，等于给每个用户平白加一个 Node 运行时依赖（装 Node 或内嵌 Node 都不可接受）。最终结论（2026-10-25 二次迭代）：**比 bun 迁移更进一步——renderer 一个文件都不引入，skill 规格化改造（路线 D），渲染全部复用 mmdx 既有管线，mmdx 代码零改动。**「render 路径零 npm 依赖」的事实核查（§5.1）保留，作为路线 B 兜底的可行性依据。

### 5.1 依赖面核实：render 路径零 npm 依赖，本来就为「拷走即跑」设计

| 文件 | 核实结果 |
| --- | --- |
| `kit/render.mjs`（17KB） | 只 import `node:fs`（lstatSync/readFileSync/realpathSync/renameSync/writeFileSync）、`node:path`、`node:url`、`node:child_process`——后者仅 `openFile()` 打开系统浏览器（darwin `open` / win32 `cmd /c start` / linux `xdg-open`），正是 §4.3 覆盖表第 1 行要替换成 mmdx 导出的那一步 |
| `kit/html.mjs` | 自带约百行正则 HTML 解析器，设计约束写在首行注释：「未触碰部分序列化逐字节原样」——**不用** node-html-parser |
| `kit/{flow,ask,tags}.mjs`、`plan/render.mjs` | 纯逻辑模块；plan/render.mjs 甚至零 import |
| `kit/vendor/pele.mjs` | 上游自 vendor 的 mermaid 渲染器，与 mmdx vendor 的 pele 同源 |
| 上游 package.json 的 4 个 deps | node-html-parser / pptxgenjs / @modelcontextprotocol/server / zod 全部只服务 mcp/、pptx/ 宿主分支；playwright-core（optional peer）只在 look.mjs 视觉 QA——这些入口 mmdx 一律不随附（§4.1），故 **npm 依赖面 = 0，node_modules 无需存在** |

上游在 render.mjs 第 4 行自我声明："No installed dependencies (Pele is vendored), so it runs from a copied skill folder."——自包含本就是它的设计目标，缺的只是「机器上有某个 JS 运行时」。

bun 兼容性无需实验证明：fs/path/url/child_process 属 bun 一等兼容面，mmdx 本体 `scripts/build.ts` 与 `src/` 就在用同款 `node:fs` + bun API，且已随生产 exe 发行多版本。

### 5.2 四条路线（D 选定，B 降为兜底）

| 路线 | 做法 | 自包含程度 | 代价 | 结论 |
| --- | --- | --- | --- | --- |
| A. bun 直跑 | 适配层把 `node kit/render.mjs` 写成 `bun kit/render.mjs`（一字之差） | 动态运行时用户（mmdx 方式 B，本就有 bun）✓、源码开发 ✓；**Release exe 用户 ✗（无 bun 无 node）** | ≈0 | 仅开发期顺手可用，不解决根本问题 |
| B. 内嵌进 mmdx exe | kit/*.mjs 照 `vendor/pele.global.js` 先例 verbatim 进仓，src/ 加薄 wrapper import 其导出的 `renderPage()`，`bun build --compile` 进同一个 exe | 全部用户 ✓；产物机器依旧零 Node 零 bun | 一个资产定位接触点（§5.5）；上游 runtime 变更需重新 vendor、重编译、重测 | 技术完全可行（§5.1），**降为兜底**：D 实测不达标时启动 |
| C. 独立 render exe | 单独 `bun build --compile` 一个 renderer 随 release 发 | ✓ | 每个目标平台多一个数十 MB 二进制（内嵌第二份 bun 运行时），skill 一体包膨胀 | 否决：与主 exe 双份运行时，纯浪费 |
| **D. skill 适配 mmdx（选定）** | **renderer 一个文件不随附**：skill 规格化改造——写作模型保留、交付改自包含 HTML 直截，渲染零新增（§5.3） | 全部用户 ✓；**mmdx 代码零改动** | 一致性降为规格约束级（与 editorial 同档）；错误闸放弃 | **选定（2026-10-25）：让 visual-explainer 适配 mmdx，不硬融入它的渲染管线** |

路线 B 的可行性依据保留备用：render.mjs 本就 `export function renderPage() / renderPageForHost()` 供 MCP server 与 Pi extension 两个宿主 import，CLI 只是第三入口——「一个 renderer、多宿主」是上游显式架构，mmdx 随时可以做第四宿主（verbatim vendor + 1 行补丁，见 §5.5）。但维护账算下来不如 D：B 把约 50KB 上游运行时的演进、bug 修复背进 mmdx exe 的发布节奏；D 只跟上游的规格文档与设计系统（纯文本 diff，低风险），出问题靠重画页面（分钟级迭代），不碰 mmdx 代码。

### 5.3 路线 D 展开：skill 规格化改造清单（选定方案）

> 本质：**让 visual-explainer 适配 mmdx**——保留上游的写作模型（register / kit 类名 / 图型 references / 设计 token），交付换成 mmdx 既有模式，与 editorial 完全同构。上游 render.mjs 的四个职责逐一改判归宿：

| 上游 render.mjs 职责 | D 下的归宿 |
| --- | --- |
| kit 资产内联（kit.css / defs.svg / 字体链接 → 单文件页） | **写作期装配**：starter 模板（kit.css + defs.svg + 字体按 §6 策略已嵌），agent 只写页身，shell 拼装整页——kit.css 不经 LLM 上下文（23KB ≈ 每页 6-7k token 的搬运成本归零） |
| 页内 mermaid 构建期 SVG 化（vendor pele） | **mmdx 预渲**：`mmdx` 先把 mermaid 片段渲成 SVG（现有矢量输出）再内联——吃 mmdx pele 引擎/主题/内嵌中文字体，比上游构建期 pele 化更强（上游中文字体落系统栈会漂移；mmdx 截图时还自动注入 Noto Sans SC CJK 兜底，render.ts:269-271 既有行为） |
| 数据标签展开（ve-bars / ve-waffle / ve-stack / ve-flow，确定性几何） | agent 按 references **手写展开形态** SVG（editorial 手绘先例，风格由 kit.css 类名锚定）；B2 评估吸收为 mmdx 围栏/展开器 |
| 错误闸 + QA report + render-to-itself | 随 renderer 放弃；视觉 QA = 直接看 mmdx 出的 PNG（editorial 同款分钟级迭代）；⚠/✗ 分级与 lint 留 B2（§5.4） |

不随附清单（在 §4.1 基础上再明确）：render.mjs、html.mjs、flow.mjs、ask.mjs、tags.mjs、vendor/pele.mjs、kit.js、ask.js、reply.js、look.mjs；ve-ask 交互问答不适用于 PNG 交付。

**mmdx 侧改动 = 零**。事实依据（已核实）：`mmdx file.html` 走 `page.setContent()`（render.ts:268），页面基址 about:blank——**相对路径资产本来就不解析**，所以「页面必须自包含」不是 D 新加的约束，而是当前管线的既有契约（editorial 一直这么活）；CDN 字体、data-URL 字体、内联 SVG 均正常（等待 fonts.ready 与图片加载是既有行为）。可选后续增强 D1（独立小改进、不绑 explain）：html 路径改 `page.goto(file://…)` 让相对资产可解析、省掉 starter 内联——editorial 同样受益，单独立项评估。

代价（诚实）：一致性从「kit + render 构造保证」降为「规格约束 + starter 模板锚定」，与 editorial 同级——§3 的诚实标注本就把 explain 定位在这个档位；错误闸保护消失，坏页靠看 PNG 重画。若实测手写展开质量不达标，路线 B 随时启动兜底——两路线共用同一份上游快照，切换成本 ≈ 0。

### 5.4 设计吸收清单：以 mmdx 原生能力补回构造保证（B2，逐项独立做）

路线 D 放弃了 renderer 的错误闸与确定性展开，吸收是把这些保护以 mmdx 原生能力补回的长期路径——全部落在 mmdx 自己的 src/，不碰 skill，上游同步零冲突（按价值排序）：

1. **错误闸**：源码有错则产物一个字都不写（先写 `.$PID.tmp` 再原子 rename 落盘），`✗ N error(s); nothing written` + exit 1。错误/警告分级（✗ 阻断、⚠ 提示），每条带行号定位（`line N <tag#id>`，从字符偏移反算）且**说清怎么修**（"add aria-label=…"、"keep one in <head>"）。可对齐 mmdx `--json` 的 warnings 契约。
2. **标记式内联 + render-to-itself**：`<link data-ve-kit>` 一个标记位，CSS/字体/SVG defs/脚本全部在该处内联；只有标记元素变化，「渲染后的页再渲染得到自身」，QA 修稿循环不漂移。editorial 手绘 HTML 的公共资产内联可用同一机制。
3. **页内 mermaid SVG 化**：D 已落地基础形态（mmdx 预渲 → 内联 SVG，中文直接吃内嵌 Noto Sans SC——kit 字体表全是西文，上游此路径中文会漂移）；B2 补齐上游的进位设计：双宽渲染（960/280px）与「字号自增到最小标签 ≥12px」。
4. **a11y 构造检查**：每张 SVG 必须有 aria-label 说清「画了什么」，装饰图必须显式 `aria-hidden="true"`，`role="img"` 自动补——零成本顺手吸收。
5. **量化 report**：figures / 无 caption 图 / 数据标签 / **figure 外 prose 词数**——把「图为主干、文字只做标注」变成可检查数字，editorial/explain 两域共用。
6. 细节两枚：内联 JS 时 `</script` → `<\/script` 转义（防提前闭合）；charset/viewport/lang/favicon 缺啥补啥、已有不动。

终态形态：explain 页就是普通自包含 HTML，`mmdx name.html --scale 3` 一步出图（D 已达成）；B2 之后 mmdx 可原生识别 kit 页与数据标签，展开/lint/错误闸成为 mmdx 自身能力，explain 与 editorial 两域共同受益。

### 5.5 路线 B 的工程点（仅兜底启动时适用）

| 接触点 | 说明 | 处置 |
| --- | --- | --- |
| kit 资产定位 | render.mjs 用 `dirname(fileURLToPath(import.meta.url))` 定位 kit.css/defs.svg 等（3 处 readFileSync）；bun compile 后模块在虚拟路径，相对定位失效 | 最小补丁：`here` 允许环境变量覆盖（改 1 行，README 记录该补丁与同步流程）；资产照 FONT_B64/embed.generated.ts 先例内联进 exe，wrapper 解出或指路。完全自包含，方式 A 单 exe 用户也覆盖 |
| 双 pele 副本 | 上游 vendor/pele.mjs（版本随上游）vs mmdx vendor/pele.global.js（1.9.0） | 首期各留各的（隔离上游同步风险）；合流列为 B2 吸收项，吃 mmdx 布局/中文字体改进 |
| look.mjs 视觉 QA | playwright-core 截图 problem sheet | 不随附（§4.1 已排除）；QA report 并入 mmdx --json warnings，截图素材就是 mmdx 自己出的 PNG |
| 错误输出对接 | 上游 human-readable ✗/⚠ | wrapper 转译进 mmdx --json 契约（AGENT_GUIDE） |

## 6. 字体策略：Latin 字体包内联 + 中文美化（2026-10-25 实测）

> 总纲（体积与归属的分工）：**重 CJK 进管线，轻 Latin 进页面**——CJK 子集以 MB 计，进 exe 由 mmdx 注入、全局复用、页面零成本；Latin 家族以 10KB 计，作为 skill 域资产以 data-URL @font-face 预嵌 starter，页面自包含。两类字体全部 OFL，可再分发。

### 6.1 两域 skill 的默认字体盘点（事实）

| 域 | 默认字体（Latin） | 加载方式 | 中文现状 |
| --- | --- | --- | --- |
| explain（visual-explainer kit） | 4 register：instrument = Geist + Geist Mono（默认）；blueprint = IBM Plex Sans/Mono；paper = Newsreader + Atkinson Hyperlegible Next/Mono；editorial = Instrument Serif/Sans + JetBrains Mono | render.mjs 在 `<link data-ve-kit>` 标记处注入 Google Fonts CDN 链接；kit.css 无 @font-face，回退栈 Segoe UI / Georgia / ui-monospace | **无任何 CJK 字体**：中文落系统栈，mmdx 管线内由注入的 Noto Sans SC 兜底（黑体） |
| editorial（diagram-design，已 vendor） | Instrument Serif（+斜体）+ Geist + Geist Mono；另有 Noto Serif/Sans KR、TC 系列 | style-guide web 默认 = Google Fonts CDN 链接；system 模式 = 纯系统栈 | 简中走系统栈（'PingFang SC','Noto Sans SC','Microsoft YaHei'），mmdx 注入兜住；KR/TC 靠 CDN |

共同核心 = **Geist + Geist Mono + Instrument Serif**（两域直接共用）；扩展 = Instrument Sans、JetBrains Mono、IBM Plex、Newsreader、Atkinson。

### 6.2 Latin 字体包：全家 153KB，starter 内嵌（推荐，mmdx 零改动）

Google Fonts latin 子集实测（可变字体一文件全字重，仅 Instrument Serif 静态含独立斜体）：

| 文件 | 体积 |
| --- | --- |
| Geist（VF，400-700 全字重） | 28.7 KB |
| Geist Mono（VF） | 22.6 KB |
| Instrument Sans（VF） | 29.4 KB |
| Instrument Serif roman + italic | 20.5 + 21.6 KB |
| JetBrains Mono（VF） | 30.7 KB |
| **核心包合计** | **153.5 KB（base64 后 ≈ 205 KB）** |

按 register 取用更小：instrument register 一页仅 Geist + Geist Mono ≈ 69 KB base64；editorial register ≈ 137 KB。**整个 Latin 包比 mmdx 已嵌的 Noto Sans SC 子集（1.94MB）小一个数量级**——「内联不过分膨胀」直接成立。

方案对比：a) 进 mmdx exe（FONT_B64 扩展）——mmdx 核心耦合 skill 域字体、字体演进绑 mmdx 发版，否决；**b) skill 域资产 + data-URL @font-face 预嵌 starter（推荐）**——woff2 + OFL 全文随 `skill/*/kit/fonts/` 走，starter 按 register 生成对应 @font-face 块，页面真·自包含（离线/内网/归档/任意浏览器一致，比上游 CDN 链接形态更彻底）；c) 维持 CDN + 系统回退——离线漂移，违背护城河，否决。editorial 同步受益：style-guide 增「离线模式」一节（data-URL 块替代 CDN link），Geist 三件套两域共用同一份资产。

### 6.3 中文美化：候选实测与场景映射（贴合 mmdx 使用场景）

现状缺口：mmdx 全局只有 Noto Sans SC（黑体）一个 CJK 兜底。`cjkFallbackCss()` 用 unicode-range 把它别名到 `serif` 泛型族——**serif register 页的中文实际是「黑体字形顶 serif 栈」，与 Newsreader/Instrument Serif 的编辑部气质断档**；手绘 figure 标注则落黑体/系统字体（editorial「简中手绘实践要点」目前无楷体指引），手绘线条配印刷黑体同样断档。

候选筛选（许可 / 体积 / 风格三轴，**按 mmdx 场景定制**）：

| 候选 | 许可 | GB2312 子集实测（mmdx 同款 subset-font.py 管线） | 场景适配 | 结论 |
| --- | --- | --- | --- | --- |
| Noto Serif SC（思源宋体，VF 全字重） | OFL | **2.60 MB**（VF 保 200-900） | serif register（explain paper/editorial）+ editorial 封面标题，与 Latin serif 气质正确配对 | **引入** |
| LXGW WenKai（霞鹜文楷 Regular） | OFL | **1.61 MB** | hand-drawn figure 标注/旁注、人文叙事页——楷体气质与手绘线条最搭；editorial 手绘域差异化 | **引入** |
| HarmonyOS Sans / MiSans / 阿里普惠体 | 免费商用但再分发受限或条款不明 | — | 围栏黑体场景 Noto Sans SC 已正确，无必要冒险 | 否决（vendoring 许可不干净） |
| 系统楷体 KaiTi | 系统字体不可随附 | 0 | Windows 有、Linux 常缺，跨平台不一致 | 否决（违背「任意机器一致」） |
| Noto Sans KR/TC（editorial style-guide 的韩繁家族） | OFL | 每家族数 MB 级 | KR/TC 非 mmdx 主场景 | 不做，README 注明边界 |

场景映射（美化后）：

| mmdx 场景 | 中文 |
| --- | --- |
| 围栏 / mermaid 高速档 | Noto Sans SC 不变（科技图正确） |
| explain instrument / blueprint register | Noto Sans SC 不变 |
| explain paper / editorial register、editorial 封面标题 | `'Noto Serif SC'`（宋体 VF 400-600，与 Latin serif 配对） |
| hand-drawn SVG figure 标注 / 旁注 | `'LXGW WenKai'`（手绘气质，跨平台一致） |

体积账：exe 现况 100.8MB；两款子集合计 +4.21MB 原文件（base64 进 embed.generated.ts ≈ +5.6MB）→ **~106MB，+5.6%**；保守起步可先文楷一款（+1.6MB）。实现落点：`fontCss()/cjkFallbackCss()` 增补 `'Noto Serif SC'`、`'LXGW WenKai'` 两个 @font-face（页面按家族名直配即命中），`serif` 泛型别名换绑宋体文件；embed 可顺手改为 exe 内二进制资产、运行时再转 base64，省回 1/3 膨胀（实现细节，立项时定）。

**与路线 D 的关系**：中文字体进 exe 是独立的 mmdx 核心增强，不属于 explain 引入的改动范围（explain 没有它也成立——只是 serif register 中文暂落黑体）；但它与 §6.2 同属「这波字体策略」，可同波落地。skill 页面因此无需内嵌任何 CJK（每页 MB 级不现实），在 mmdx 管线内自动命中三家族——PNG 是主交付物，HTML 离开 mmdx 后中文回退系统栈，可接受。

### 6.4 许可与合规

Latin 与中文字体全部 SIL OFL：随附（vendored 或 exe 内嵌）需附各家族 OFL 许可全文与来源版本记录（Google Fonts / GitHub release tag）；子集文件在 @font-face 沿用原家族名，与 Google Fonts 官方子集分发同款做法，如上游声明 Reserved Font Name 且需绝对保守，改别名并同步字体栈即可（一处 CSS）。

## 7. 明确不引入（及为什么）

| 不拿 | 原因 |
| --- | --- |
| vivid-illustration 的任何文件 | 许可禁再分发/禁二开，连原文快照都不行；其 108 配方思路可参考但不可搬 |
| canvas-design / algorithmic-art | 风格一致性轴不达标（哲学驱动、每次全新）；algorithmic-art 还有 CDN 离线死穴 |
| archify / Understand-Anything | 图域/代码理解域与现有能力撞车，违反「零重叠」 |
| visual-explainer 的 video/（MP4 管线）与 mcp/ | 视频非 mmdx 出图场景，MCP 宿主接入不适用；首期不随附，README 注明，需要时再补 |
| explain 域反向渗透单图交付 | 围栏纪律优先：不为绕开预算/lint 用解释页画单图（与 editorial 同一条护栏） |

## 8. 许可

- visual-explainer 为 MIT：vendored 需保留其 LICENSE 全文（`LICENSE-visual-explainer`）与出处标注。路线 D 下原则微调为「references 与 kit 资产原文保留、SKILL.md 工作流改写」，全部改造点记录在 explain/README，上游同步按 README 口径执行。
- 字体（§6）：Latin 包与中文黑/宋/楷三家族均 SIL OFL，随附 OFL 全文与来源版本，合规细则见 §6.4。
