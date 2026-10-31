> [English](CHANGELOG.en.md) · 中文

# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [3.0.0] - 2026-10-31

### 主题（新增）

- 新增 `zed` / `zed-light`：Zed 编辑器的 One Dark / One Light，色板取自 Zed 仓库 `assets/themes/one/one.json`，映射照 `crates/markdown/src/mermaid.rs` 的 `build_mermaid_theme`。这是主题集合里第一套暗色预设
- 节点上色改用 Zed 自己的规则：**flowchart / class / state 的节点按读取顺序轮转 8 个 player 色（`node_counter % 8`），描边 = 该色原色，填充 = 该色按 15% 混页面底色**（`src/color.ts` 的 `blendOver`，对齐 Zed 的 `ACCENT_FILL_OPACITY`）。Pele 把一张图的节点按文档顺序写进一个 `<g>`，所以实现是 `ThemeStyle.nodeRotation` 加一组 `:nth-child(8n+k)` 规则；状态起止标记与复合状态框用 `:not()` 排除。**这是与 `tech` 最直接的差别**：`tech` 按形状分色、单一蓝调，`zed` / `zed-light` 按顺序多色轮转
- 形状族规则保留给其余槽位（ER 实体、注释、类图分隔线、状态起止、簇），仍取 Zed 的语法色：`zed` `#74ADE8` / `#BF956A` / `#A1C181` / `#B477CF`，`zed-light` `#5C78E2` / `#AD6E26` / `#3F953A` / `#984EA5`
- 状态 chip 改用 Zed 的 chip 配方：先按 `adjust_lightness` 缩放强调色的亮度（暗色 ×0.7、亮色 ×1.3，新增 `src/color.ts` 的 `scaleLightness()`，缩放落在 OKLab 的 L 上），再由该底色推导文字色；原来用的是「强调色 15% 混页面」的节点填充配方
- `zed-light` 的块页从文档卡片改成**编辑器面板**：`#EBEBEC` 面板 + `#C9C9CA` 发丝线 + 6px 圆角，卡片去掉强调色边条，表头与热力格用 `#E4E4E5`——此前它基本沿用共享 `PAGE_CSS`，卡片观感和 `tech` 一样
- 新增 `textColorFor(bg)`（OKLab 保留底色 15% 彩度 + 二分保 ≥4.5:1）：`zed` 的块页状态 chip 文字由 chip 底色推导，浅底深底共用一条规则
- `accentTint(accent, bg)` 改为按主题页面底色混合（原先固定混白）；`PAGE_CSS` 里 6 处 `color-mix(..., white)` 改成 `color-mix(..., var(--paper))`（进度条、对比条、热力图 lv1–3）。白底主题输出逐字节不变，非白底主题（`ios` / `epaper` / `acnh` / `--tone paper`）的条与热力格向自己的纸色靠 1–3%
- 新增暗色块页样式：`color-scheme: dark`、`#2F343E` 面板、`#464B57` 发丝线，其余仍走 `var(--paper)` / `var(--ink)`
- `src/tokens.ts` 的 `contrastRatio` / `relativeLuminance` 收敛为从 `src/color.ts` 再导出
- `ios` 的系统感加强：圆角 10 → 14px、描边 1.25 → 1.6px，判定/状态/存储填充换成系统色更实的浅色调；块页按 HIG 分组列表补齐每张卡片右侧的 `›` 折角、分隔线提到 iOS 的 0.29 alpha、标题改 20px/700

### 字体（新增）

- **展示字体随包**：新增 `src/fonts.ts` 注册表（家族 → `@font-face` 描述），随包家族从 3 个增到 8 个：Excalifont（`excalidraw` 拉丁手写体，取上游按脚本切片里的两片拉丁 chunk，用 `unicode-range` 限定）、站酷快乐体 ZCOOL KuaiLe + Baloo 2（`acnh` 圆体）、Newsreader（`epaper` 衬线，保留 `opsz` / `wght` 轴）、JetBrains Mono（块页 `code` / kicker / footer）。子集口径与来源记在 `scripts/subset-font.py`（CJK 走 GB2312 全量，拉丁走 latin-1 + latin-ext + 标点 + 箭头），全部 OFL-1.1，许可证随字体放在 `assets/fonts/OFL-*.txt`，合计约 7.3MB
- `theme.fonts` 正式接入渲染（此前只有声明、没人读）：`Renderer` 按「随包黑体 + 主题 `fonts[]` + 等宽」注入 `@font-face`，并逐家族 `document.fonts.load()` 等待——Pele 与 Mermaid 都先量标签再画，字体没就绪会量出回退宽度、标签被裁
- **块页取主题字体栈**：`mkTheme()` 把 `:root{--font:<主题栈>}` 拼进 `blockCss`，`PAGE_CSS` 的 `.wrap` 读 `var(--font, …)`。此前块页固定用黑体，只有 `excalidraw` / `epaper` 在各自 `blockCss` 里硬写字体；现在 `acnh` 的卡片 / KPI / 表格也真的用上快乐体
- **字体栈只列随包家族**：`ios` 改为 `"Noto Sans SC", -apple-system, …`（原先 `-apple-system` 打头，macOS 上会走 SF Pro，与画廊不一致）、`acnh` 去掉 `YouYuan` / `幼圆` / `Segoe Print`、`excalidraw` 去掉 `Segoe Print` / `Comic Sans MS` / `KaiTi` / `STKaiti`、`epaper` 去掉 `Georgia` / `Songti SC` / `SimSun`；系统家族只允许排在所有随包家族之后做缺字兜底
- 新增 `lint/theme-fonts` 门槛：主题字体栈里排在随包家族之前的非通用家族必须自己随包、`fonts[]` 声明的家族必须在注册表里、注册表里每个家族至少被一个主题或文档路径使用
- `scripts/build.ts` 按注册表内联全部字体（`FONT_FILES`），缺文件直接报错（原先静默 `null`）

### 修复

- `mmdx card` 在 bun 下报 `buf.readUInt32BE is not a function`：`src/card.ts` 的 `pngSize()` 假定拿到的是 Node `Buffer`，而 bun 的截图路径给的是 `Uint8Array`。现在先 `Buffer.from()`（与 `src/capture.ts` / `src/lint.ts` 一致），`bun run test` 当时从 205/209 变为 **209/209**（2026-10-31 砍掉 `glass` 后为 **201/201**）

### 移除（Breaking）

- **砍掉 `glass` 预设**（2.0.0 曾包含）：亚克力的材质感依赖 `backdrop-filter`，而 Chromium 不渲染 SVG 形状上的该属性，只能靠「半透明面板 + 底下没有锐利细节」伪造，与 `openai` / `ios` 的浅色平面观感区分不足。`-t glass` 现在报 `unknown theme` 并列出可用值；`docs/gallery/glass.md` / `glass.en.md` 与 5 张分场景图一并删除，主题集合回到八套

### 无障碍（新增门槛）

- 新增 `lint/theme-connectors`：连线色对页面 ≥ 3:1（连线承载语义，与形状描边同一条非文本门槛）。实测最小 3.11（`paper` tone）；`zed` `#636D83` 2.70 与 `ios` `#8E8E93` 2.92 未过，改为 `#7A8598`（3.76）与 `#7C7C82`（3.72）
- 新增 `lint/theme-series-cvd`：8 色图表的**任意两色**在 protan / deutan / tritan 模拟下 OKLab ΔE ≥ 0.02（原先只有形状族受检）。修前最差 `openai` protan 0.005、`zed-light` deutan 0.009、`zed` tritan 0.013、`ios` tritan 0.017、`paper` protan 0.019；按「只挪必要的色、保持原色相与彩度」重挑后，八套主题全部 ≥ 0.040（多数主题只挪 0–2 个色；`epaper` 的灰阶系列原本已达标，未动）
- 新增 `lint/theme-node-rotation`：开轮转的主题（`zed` / `zed-light`）里，8 个 player 色对自己的 15% 底色各 ≥ 3:1（实测 3.00）——轮转让每个色都成了描边，不能只查形状族那 4 个
- 新增 `lint/theme-series-contrast`：8 色系列每色对页面底 ≥ 3:1。Pele 的饼图数值是用**页面底色**「抠」在切片上的，切片太浅数值就消失（修前 `acnh` 最浅一片只有 2.04:1）；重挑后八套全部 ≥ 3.00
- `scripts/lint-a11y.ts` 增加连线对比度、系列色色觉、系列色对底三行逐主题报告

### 画廊

- 案例的流程图改用四种形状族：`([需求冻结])` 胶囊起点、`[灰度 5%]` 矩形、`{错误率 < 1%?}` 菱形、`[(发布台账)]` 圆柱——此前样张只有矩形与菱形，四个形状族在画廊里看不见
- 新增第 5 个场景 `chart`：` ```chart ` pie 六片，形状族与 8 色系列色都进样张；八套主题 × 5 场景
- 画廊全量重出（本机一次渲染，图标 emoji 字形与其余分页一致）；`tests/contact-sheet.png`（README 的图型拼图）按当前产物重出

### 文档

- `docs/gallery/zed.md` / `zed-light.md`（含英文页）、`docs/STYLE_PORTS.md` 第 3.1c 节记录色板、机制与门槛实测；画廊总览改为八套主题
- 分风格页、`docs/GALLERY.md`、`docs/QUALITY.md`、skill 与 README 的主题描述同步到新的网格 / 材质 / 门槛数字

## [2.0.0] - 2026-10-30

### 渲染引擎（Breaking）

- **引擎收敛为 Pele 一套**（`pele@1.9.0`，obsidianmd/pele）：Mermaid 语法直出 SVG，单图 SVG 生成 1–50ms。移除 `--engine pele|mermaid|auto`、`--layout elk|dagre` 与 `--json.fallbacks`，同时移除 `mermaid` / `@mermaid-js/layout-elk` 依赖及随包资源（约 3.5MB 的 mermaid.min.js 与 5.0MB 的 elk.bundle.mjs）。输入语法仍是 Mermaid（围栏 / `.mmd` / stdin），`--json.engine` 固定为 `pele`；Pele 解不了的图型不再有回退引擎
- 新增 `--svg-themeable`：SVG 保留 `--pele-*` CSS 变量；默认把颜色烘焙成 hex，便于 Office/PPT 打开
- PeleError 直接映射为 exit 1；`--json` 输出 `engine: "pele"`
- Iconify `--icon` 通过 Pele `icons` 回调注入，图标按 24×24 视图缩放

### 主题（Breaking）

- 主题改为 CSS 变量契约：统一输出 `--pele-*` 变量与 `pele-shape-*` 形状规则，PNG、SVG、HTML 扩展块共用同一色板；**7 套预设**：`tech`（默认）/ `openai` / `excalidraw` / `ios` / `acnh` / `glass` / `epaper`（`zed` / `zed-light` 见 Unreleased）
- **Breaking：** `--theme-js` 改为 v2 签名 `(theme) => theme`，接收 `ThemeSpec`（`vars` / `shapes` / `css`）；1.x 的 `config.themeVariables` 脚本报迁移错误
- **Breaking：** `--config` 改为 Pele 白名单（`fontSize` / `padding` / `flowchart.nodeSpacing` / `rankSpacing` / `padding`），`themeVariables` 等 key 给 `config-ignored` 警告
- **Breaking：** 移除 11 套旧主题（`openai-dark`、`openai-editorial`、`vercel`、`linear`、`stripe`、`notion`、`ibm`、`minimal`、`latte`、`mocha`、`sketch`）；旧主题名报 `unknown theme`，可用主题见 `--help`
- 新增 `excalidraw`：Pele + rough.js 手绘线条、粉彩填色、Excalifont/LXGW 字体栈；块版式为白板卡片；`--style-fill solid|hachure` 切换填色（斜线体积约 1.5–2×）
- 新增 `ios`：纯平面 iOS 系统界面——分组浅灰底 `#F2F2F7` + 白卡片 + 发丝分隔线 `#D1D1D6` + Apple 深色变体系统色（蓝 `#007AFF` / 绿 `#248A3D` / 橙 `#C93400` / 红 `#D70015` / 紫 `#8944AB`）；块页按 HIG 分组列表做法，不给卡片加强调色边条
- 新增 `acnh`：动森风——奶油纸 `#FFF8E7` + 点阵网格 + 粗棕描边 2.6px + 硬偏移贴纸阴影 + 圆体字 + 胶囊标签；块页同纸底
- 新增 `glass`：Fluent 亚克力——淡蓝灰画布 `#E9EEF6` + 28px 网格 + 一层白色半透膜（0.30）与 4% 颗粒，面板 `rgba(255,255,255,.72)`、8px 圆角、白描边；块页走 HTML，`backdrop-filter: blur(20px)` 真实生效
- 新增 `epaper`：电子纸 / 墨水屏——`#F5F1EB` 纸底 + 5% `feTurbulence` 纸纹 + `#1A1A1A` 发丝黑描边 + 直角 + 无阴影 + 无强调色，形状族靠灰阶与形状区分；块页衬线正文 + 等宽大写表头
- 新增 `ThemeSpec.backdrop`（自带底的风格）：引擎往 SVG 插一层 `<g class="mmdx-backdrop">`（色块 + 高斯模糊 / 点阵 / 网格 `<pattern>` / 半透膜 + 噪点，外配内缩 14px 的径向淡出遮罩）；PNG 走整幅截取不按墨迹裁边，`--background transparent` 时不画底；flatten 会把 CSS `filter` 一起烘焙进 SVG
- 新增 `--tone paper|neutral|product`：覆盖块页结构（圆角/阴影/标题字体/表格头/chip 圆角）；`paper` 另把图与块页一起换成编辑风网格纸（`#FAFAF8` 纸底 + 24px 细格 / 96px 粗格、焦橙强调色 `#BF4520`），`neutral` / `product` 不动图的配色
- 新增 `--style-fill solid|hachure`：只对 `excalidraw` 生效，其他主题传了给 `config-ignored` 类 warning

### 无障碍（信息不只靠颜色承载）

- 主题色板加硬门槛，由测试守住：正文色对底 ≥ 7:1（AAA）、次要文字 ≥ 4.5:1、强调/警示色 ≥ 3:1；每个形状族的描边对底、对自己的填充都 ≥ 3:1；红绿色盲（protan / deutan / tritan）模拟下描边色不同的形状族仍两两可区分（OKLab ΔE ≥ 0.02）；四个形状族必须是四种形态（矩形 / 菱形 / 胶囊 / 圆柱）
- 新增 `src/color.ts`：WCAG 亮度与对比度、Machado 2009 色觉模拟、OKLab 感知距离；新增 `scripts/lint-a11y.ts` 逐主题报告
- 渲染态文本对比度审计改为 WCAG 分档（小字 4.5:1 / 大字 3:1，按 computed font-size 与字重判断）
- 为过门槛修正的色板：`openai` 状态/存储填充调浅（描边对填充原为 2.86:1）、`excalidraw` muted `#6C757D`、`acnh` muted `#7A6350`、`--tone paper` 存储描边 `#7A5AA8`（蓝/紫在红绿色盲下几乎重合）

### 新增

- 新增 `mmdx card`：Markdown 或 URL → 信息卡 PNG；默认主题 `openai`，配合 `--tone`、480/600/900+ 宽度、按实际像素高度自动拆页、`--json` 输出 `cards` / `files` / `pages`；新增独立 skill `skill/info-card-designer/`
- 新增 `scripts/lint-a11y.ts`（无障碍报告）、`scripts/lint-visuals.ts`（七套主题的渲染筛查报告）、`scripts/make-style-review.ts`（主题预览）
- 画廊扩为 **7 套主题 × 4 场景**，并新增 [场景引导（状态图）](docs/gallery/scenario.md)（同一张状态图两档观感）、[两个 HTML 场景模板](docs/gallery/html-skills.md)、[信息卡 tone 对照](docs/gallery/card-tones.md)、`glass` / `epaper` 分风格页，以及 v1.4.2 的 `editorial` / `visual-explainer` 手绘 HTML 原始样张与近似映射；README 已引用
- skill 增加「场景 → 主题 / tone / preset」推荐表（含玻璃封面、黑白打印、故障复盘），并为 HTML 报告卡与信息卡给出主题组合；新增场景引导的绘制规则（状态 = 读者能看见的处境、箭头 = 读者的动作）

### 管线与产物

- 引擎 bundle 按需注入：Pele ~700KB；不再随包 Mermaid / ELK 资源
- 块页面与图表截图统一关闭动画/过渡/光标，并等待内置字体加载；截取前归一化 body 盒（浏览器默认 8px body margin 会让整幅截取错位）
- 视觉 lint 覆盖 DOM 几何（根/文本溢出、元素越界、图题重叠）、SVG 标签溢出、真实渲染文本对比度、PNG 边缘裁切、底部长空白规则（`max(90px, 5% × 高度)`）与超长列表 fixture；确定性检查覆盖全部内置主题
- 测试矩阵扩到 **189 项**：七套主题 × 4 类图（flowchart / state / class / ER）+ 3 类块页审计、双跑确定性、无障碍门槛、CLI 契约（preset / caption / brand / 坏块隔离 / stdin / `--json` / 信息卡分页 / `.html` 输入与 figure lint）
- 新增 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 `licenses/`：列明 Pele / rough.js / svgo / puppeteer-core / Noto Sans SC 等来源与许可证；新增 [质量门禁规划](docs/QUALITY.md)

### 其它

- 日历热力改成办公卡：格子随周数放大、空天可见、中文日期与月标、有值格子写次数
- `tech` 默认主题：形状分色改为可见填色 + 1.5px 描边，默认 accent `#2563EB`
- `--preset slide` 字号 18、描边加粗；`--preset column` 对准 2560×1440 办公屏约 1/3 栏宽，`column-landscape` / `column-shrink` 写入 `--json.warnings`
- 中文三字体家族：exe 内嵌 Noto Serif SC 与霞鹜文楷 GB2312 子集，与 Noto Sans SC 并列注入 HTML 页导出
- `file.html` 输入的 figure lint：六类检查（越界、文字压形/压字、粘连、有效字号 <11px、缺 caption/aria），消息 LSP 式自定位并进 `--json.warnings`
- 新增 `skill/explain/`（vendored visual-explainer 规格化改造版）与 `skill/editorial/`（diagram-design）

## [1.4.2] - 2026-10-25

- **新增 explain 叙事档**：vendored [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer)（10.6k★，MIT，commit `5f37886` v0.14.0）**规格化改造版**进 [skill/explain/](skill/explain/README.md)——多图叙事解释页 / diff·plan 评审页 / recap / 幻灯片页；上游 renderer 一个文件不随附（路线 D：让 visual-explainer 适配 mmdx，渲染零新增、mmdx 代码零改动），`kit/*.mjs` 运行时、`plan/`、`pptx/`、`video/`、`mcp/` 全部排除，references 与 kit 资产原文保留；调研与论证见 [docs/research-visual-explainer.md](docs/research-visual-explainer.md)
- explain 用法三步：复制 `kit/starter-<register>.html`（4 register：instrument/blueprint/paper/editorial，已内联 kit.css + defs + 该 register 全部拉丁字体，[scripts/explain-starter.ts](scripts/explain-starter.ts) 生成）→ 编辑 main → `mmdx name.html --scale 3`；kit 资产不进 LLM 上下文；页内 mermaid 用 `mmdx - -f svg` 预渲后原样内联（**不要**给内联 svg 加第二个 style 属性，会因 HTML 重复属性丢弃 `--pele-*` 主题变量全图变黑）；steppers/replay/ve-ask 等 JS 交互态禁用（无 JS 时是幽灵态）
- **中文三字体家族**：exe 内嵌 Noto Serif SC（可变字重，2.6MB）与霞鹜文楷（1.6MB）GB2312 子集，与 Noto Sans SC 并列注入 HTML 页导出——serif 栈中文自动落宋体（修掉「黑体顶 serif 栈」断档）、手绘标注显式 `'LXGW WenKai'` 楷体；`serif` 泛型的 CJK 兜底 alias 换绑宋体文件；围栏/mermaid 路径维持仅黑体（避免批量渲染注入未用字体）；Latin 字体包（Geist/IBM Plex/Newsreader/Atkinson/Instrument/JetBrains，153KB，全 OFL 随附）由 starter 预嵌 data-URL @font-face，explain 页离线全 register 一致
- **figure lint（`file.html` 输入）**：导出时自动检查 figure svg——caption/aria 口径吸收自上游 render 闸门，几何检查（viewBox 越界带方向与像素、文字压形/压字、**粘连**间距 < max(4px, 字高×35%)、有效字号 <11px）为手绘场景新增；LSP 式消息带图号/文本/viewBox 坐标；豁免策略防假告警：同组标签、骑线 halo/chip 标签对线豁免对框不豁免、大框居中标签、隐藏文本与 <24px² sliver；结果进 `--json.warnings`（`figure-overflow` / `figure-text-overlap` / `figure-text-adhesion` / `figure-small-text` / `figure-uncaptioned` / `svg-aria-label`，处置表见 skill troubleshooting.md）
- 根 SKILL.md：场景分级新增**叙事档**、按需加载与适用边界挂载 explain/；editorial README「简中手绘实践要点」修订（serif 标题与楷体标注现已离线可用，几何自检交给 lint）
- 端到端实证：paper register 中文解释页（宋体标题/黑体正文/楷体旁注/手绘机制图/waffle+bars 手写展开/页内 mermaid 预渲）lint 清零 + 视觉 QA 通过；负样本（越界/压字）三条全中；既有测试 94/94 通过（fixture：tests/explain-e2e/）

## [1.4.1] - 2026-10-25

- Release 新增 `mmdx-skill-<tag>.zip` 产物：skill 目录 + 内嵌 windows-x64 CLI（`bin/mmdx.exe`）一步到位，解压后把包内内容整体拷进 agent 的 skills 目录（`~/.qwen/skills/mermaid/` 等）即完成 skill 安装，附 `INSTALL.md`（安装路径示例、CLI 验证、非 Windows 指向 dynamic 包）；README 快速上手新增方式 D（中英同步）
- skill `references/recipes.md` 新增特殊画法「对照式 timeline（事件 vs 对策）」：每时期固定两行（事件 / 处置）的阶段对照叙事，比 flowchart 平行双链省节点预算且无交叉连线，附已验证示例与 `--source "© id"` 署名水印用法
- skill `editorial/README.md` 新增「简中手绘实践要点（mmdx 语境）」：简中标题/callout 落 sans（`'Noto Sans SC'` 渲染时已注册、离线可靠；serif 标题离线不保证）、sublabel 保持 Latin mono、署名水印两种做法（围栏 `--source` / 手绘页脚 `<text>`）、4px 网格纪律
- skill `SKILL.md` 新增 §1e「回哺：新画法沉淀」：Agent Loop 自检后增加回哺步——渲染出可复用的新写法模式时建议沉淀进 recipes/fences，条目格式照抄、示例须实渲染验证，并**同步维护「按需加载」索引**；顺手把 v1.4.1 新增的「对照式 timeline」补进索引清单（修复入库不动索引的欠账）

## [1.4.0] - 2026-10-25

- 新增 `file.html` 整页输入：HTML 原样截图为 PNG（fullPage，只出 PNG），保留页面自身样式、脚本与背景；`--width` 为布局视口（页面显式更窄的 `body` 宽度优先），`--scale` / `--background` 照常生效——可作为手绘 HTML 工作流（如 diagram-design）的免 Playwright 导出后端
- HTML 截图自带离线中文保证：内嵌 Noto Sans SC 以 `'Noto Sans SC'` 字族注册，并按 CJK 码位区间 alias 到 `sans-serif` / `serif` 兜底链——页面声明的西文字体不变，中文字形离线一致，页面自带的 CJK 字体仍优先
- `.md` 里的 ` ```html ` 围栏仍不支持（只认独立 `.html` / `.htm` 文件），避免绕过扩展块的版式纪律；HTML 输入无预算/lint/像素筛查契约
- 文档写明配套用法：skill §1c-4 / AGENT_GUIDE / HUMAN_GUIDE / README 中英——触发词、高保真建议（`--scale 3`、画布宽对齐、显式透明底）、护栏（办公图不手写 HTML）；并确立「场景分级」总口径：高速档=围栏模板（PNG @2x / mermaid SVG，秒级），精美档=手绘 HTML（PNG @3x，分钟级），统一 mmdx 导出，清晰度靠 deviceScaleFactor 超采样一次栅格化（无事后缩放、无 JPEG）
- 嵌入 [diagram-design](https://github.com/cathrynlavery/diagram-design) skill 规格层到 **skill 目录内** [skill/editorial/](skill/editorial/README.md)（MIT，commit `0b9b10c`；上游 `SKILL.md` 改名 `UPSTREAM-SKILL.md` 避免与主 skill 撞名，63 个 `references/` 原文未改）——随 skill 目录整体分发，宿主安装后离线可用；适配层覆盖：导出走 `mmdx file.html`（替代 Playwright）、离线中文用 `'Noto Sans SC'`、选型仍以 mmdx skill 为准
- skill 渐进披露重构：`skill/SKILL.md` 收敛为索引 + 热路径（场景分级表、按需加载清单、§1a 选型、写图规则、preset 命令、四类表面路由、自检闭环），冷内容拆到 `skill/references/fences.md`（围栏语法速记/细则/能上会边界）、`references/troubleshooting.md`（报错速诊/warnings 处置/退出码）、`references/themes-engines.md`（主题/双引擎/Pele 配置键），按需读取
- 新增 `skill/references/recipes.md`：16 种 mermaid 图型最小示例（取自 `tests/diagrams` 已验证 fixture）+ 特殊画法配方——**一图并列双流程（subgraph `direction` LR+TB 混排，实测仅默认 Pele 支持，`--engine mermaid`+ELK 忽略 direction）**、嵌套包含、组织架构树、分层横切；全部示例经 mmdx 实渲染验证（18/18）
- README 增加 Pele / mermaid 双引擎拼图合集（`tests/contact-sheet-pele.png`、`tests/contact-sheet-mermaid.png`）
- skill / AGENT_GUIDE / HUMAN_GUIDE 写明两引擎差别：布局和画法，不是配色；ELK 只作用于 mermaid flowchart
- 调研后续可抽的布局/配色思路：[docs/research-layout-color.md](docs/research-layout-color.md)（不引入第二套图语法）

## [1.3.0] - 2026-10-23

- 默认渲染引擎改为 **Pele**（[obsidianmd/pele](https://github.com/obsidianmd/pele) v1.9.0，MIT）：自研布局 + 宽 S 弯连线，流程图默认曲线，不再是折线
- 新增 `--engine pele|mermaid`（默认 `pele`）；`--engine mermaid` 保留原 Chromium + mermaid.js + ELK 路径作回退
- 形状分色映射到 Pele 类：`.pele-shape-rect/rounded/stadium` 过程蓝、`.pele-shape-diam/hex` 判断琥珀、`.pele-shape-circle/ellipse` 状态绿、`.pele-shape-cyl` 存储紫；`--pele-*` 变量由各主题 themeVariables 派生
- mermaid 回退也改为曲线：`flowchart.curve` 由 `linear` 改为 `basis`（并修复 `layoutAlgorithm` 未写入、`--layout elk` 实际未激活的问题）
- `sketch` 主题无手绘 Pele 实现，自动回退 mermaid 并在 stderr 提示
- `--layout elk|dagre` 仅对 `--engine mermaid` 生效（Pele 自带布局）
- `--theme-js` / `--config` 对 Pele 生效的键：`flowchart.nodeSpacing` / `rankSpacing` / `wrappingWidth` / `curve`、`fontSize`、`padding`；mermaid 专属键（`themeCSS`、`look`、`layoutAlgorithm` 等）在 Pele 下忽略
- 扩展块（table/kpi/chart/…）与 PNG 像素裁切仍走 Chromium，不变
- `--json` 增加 `engine`；`--help` 增加 `--engine`；版本号 1.3.0

## [1.2.0] - 2026-10-22

- 新增 `--preset column`（800px@2，字号 18、标签换行 200px；对准 2K 办公屏约 1/3 栏宽）：聊天/窄栏正文出图；`column-landscape` / `column-shrink` 写入 `--json.warnings`
- skill / AGENT_GUIDE：聊天默认 `column`，投屏仍走 `slide`；流程图贴聊天用 `TD`
- Pele 换引擎列为后续：[docs/research-pele.md](docs/research-pele.md)
- 日历热力改成办公卡：格子随周数放大、空天可见、中文日期与月标、有值格子写次数
- `tech` 默认主题：形状分色改为可见填色 + 1.5px 描边，连线/饼图/色板加饱和；默认 accent `#2563EB`
- `--preset slide` 字号 18、描边加粗；skill / AGENT_GUIDE 增加投屏/PPT 导出引导（触发词 → 命令 → 5 米自检）

## [1.1.0] - 2026-09-11

### 办公出图

- 新增画幅预设 `--preset slide|a4|square`（未显式 `-f` 时默认 PNG；`slide` 加大节点字号与间距，底栏预留安全区）
- 新增图题层 `--title` / `--subtitle` / `--source` / `--unit`，印在 PNG chrome 上（mermaid 与扩展块共用）。**Breaking：** `--title` 不再写入 mermaid frontmatter
- 新增 `--brand <hex>`：只改扩展块 accent；flowchart 形状分色保持；低对比警告不阻断
- 新增 `--strict-chart` 与 `--json.warnings`：pie / xychart / radar / flowchart / sequence 预算软护栏
- 新增围栏：```chart ```kpi ```compare ```funnel ```task ```progress ```swimlane ```gauge ```vs ```heatmap
- `--help` 补 `--preset`、`--index` 及上述新参数
- skill / AGENT_GUIDE 改为办公意图选型：总览 ≤9 节点、何时不画、降级阶梯、默认 PNG
- tech 主题收一档：关掉 neo 渐变阴影，形状分色改浅底+描边，连线/灰阶降饱和；扩展块统一 8px 圆角、无阴影，kpi 仅第一项强调色
- 新增扩展块图鉴 [docs/EXTENSIONS.md](docs/EXTENSIONS.md)（每种围栏一张工具渲染的 PNG）
- 测试打开 `profile` 插桩：`page-reset` / `init-mermaid` 次数与阶段 maxMs 超预算即失败；HTML 块后只清 DOM，不按块重注 mermaid

## [1.0.0] - 2026-09

首个正式版本。

### 主题体系（tech 默认主题，官方入口优先）

- 配色按 mermaid 官方三层入口组织：**themeVariables 全量变量面**（core 派生链 primaryColor/secondary/tertiary/mainBkg/nodeBkg + 各图专属变量）→ 每图 config 节（c4/journey/radar/xyChart…）→ themeCSS 只做官方变量表达不了的事（圆角、形状编码、少量结构性修正）
- 数据类图表采用 **AntV G2 分类色板**（pie/xychart/treemap/radar），现代报表风格
- 节点 `look: 'neo'`：圆角 + 柔和渐变 + 阴影；流程图保留形状编码（蓝=过程/橙=判断/绿=状态/紫=存储）
- 20 种 mermaid 图全覆盖 + 像素级主题普查脚本（`scripts/theme-census.ts`）防回归

### 渲染管线

- 内置 Noto Sans SC 字体子集（GB2312 + latin，1.9MB woff2），中文渲染跨机一致
- ELK 布局引擎懒加载（仅 flowchart/graph），其余 dagre
- PNG 2x 无损 + 像素级留白裁切（四周留白对称）；SVG 经 svgo 压缩（官方 browser 构建内嵌二进制）
- 并发截图串行化 + 视口自适应，60s 渲染超时熔断 + 单图自动重试

### 扩展块

- ```table / ```list / ```card（约定语法：`emoji | 标题 | 描述`）渲染为样式化 PNG

### Agent 友好

- `--json` 机器可读输出、`--profile` 阶段耗时、`--theme-js`/`--config`/`--css` 自定义主题、`--icon` 图标包
- 单图失败隔离，整批不中断；配套 agent skill（触发词、选型表、自检闭环）

### 产物

- `mmdx-windows-x64.exe` — windows x64 单文件（免 Node，需系统 Edge/Chrome）

[3.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v3.0.0
[2.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v2.0.0
[1.1.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.1.0
[1.0.0]: https://github.com/daidaiJ/mmdx/releases/tag/v1.0.0
