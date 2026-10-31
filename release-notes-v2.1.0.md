mmdx 2.1.0：八套主题命名的字体全部随包（跨机器渲染一致），并砍掉 `glass` 预设。

## 亮点

- **字体随包，出图不再取决于机器上装了什么**：随包家族从 3 个增到 8 个——通用黑体 Noto Sans SC、衬线 Noto Serif SC、楷体霞鹜文楷，加上各主题的展示字体：Excalifont（`excalidraw` 手绘拉丁）、站酷快乐体 ZCOOL KuaiLe + Baloo 2（`acnh` 圆体）、Newsreader（`epaper` 衬线）、JetBrains Mono（块页 code / kicker / footer）。合计约 7.3MB，全部 OFL-1.1，许可证随字体放在 `assets/fonts/OFL-*.txt`
- **字体栈只列随包家族**：`ios` 改为随包黑体打头（原先 `-apple-system` 打头，macOS 上会走 SF Pro，与画廊不一致），`acnh` / `excalidraw` / `epaper` 去掉幼圆、Segoe Print、Comic Sans、KaiTi、Georgia、SimSun 这些系统家族；系统字体只允许排在所有随包家族之后做缺字兜底。新增 `lint/theme-fonts` 门槛守住这条
- **`theme.fonts` 正式接入渲染**：渲染器按「随包黑体 + 主题 `fonts[]` + 等宽」注入 `@font-face`，并逐家族 `document.fonts.load()` 等待——Pele 与 Mermaid 都先量标签再画，字体没就绪会量出回退宽度、标签被裁。块页的字体栈由主题自己带（`blockCss` 开头的 `:root{--font:…}`），所以 `acnh` 的卡片 / KPI / 表格真的用上快乐体
- **`zed` / `zed-light`**（2.0.0 之后的暗色一对）：取 Zed 编辑器 One Dark / One Light 的 token，节点按 Zed 的 `node_counter % 8` 轮转 8 个 player 色（描边取 accent 原色、填充 accent 15% 混页面底色），状态 chip 用 Zed 的亮度缩放 + 文字色推导配方
- **无障碍门槛扩到 8 条**：新增连线色对底 ≥3:1、8 色图表系列任意两色在色盲模拟下 ΔE ≥0.02、系列色对底 ≥3:1（Pele 的饼图数值是用页面底色抠在切片上的）、轮转主题的描边对自己填充 ≥3:1；外加主题字体门槛。`scripts/lint-a11y.ts` 逐主题输出可读报告
- **画廊八套主题 × 5 场景**：案例流程图改用满四个形状族，新增饼图场景；总览与分风格页全部重出

## Breaking

- **砍掉 `glass` 预设**（2.0.0 曾包含）：亚克力的材质感依赖 `backdrop-filter`，而 Chromium 不渲染 SVG 形状上的该属性，只能靠「半透明面板 + 底下没有锐利细节」伪造，与 `openai` / `ios` 的浅色平面区分不足。`-t glass` 现在报 `unknown theme` 并列出可用值；`docs/gallery/glass.md` 与 5 张分场景图一并删除，主题集合为 `tech` / `openai` / `excalidraw` / `ios` / `acnh` / `epaper` / `zed` / `zed-light` 八套
- 主题字体栈里的系统家族被移除，观感随之变化：`acnh` 全站快乐体、`epaper` 块页衬线、`excalidraw` 手绘拉丁 + 楷体中文、`ios` 拉丁从 Segoe UI 落到随包黑体

## 修复

- `mmdx card` 在 bun 下报 `buf.readUInt32BE is not a function`：`pngSize()` 假定拿到 Node `Buffer`，而 bun 的截图路径给的是 `Uint8Array`；现在先 `Buffer.from()`

## 产物

- mmdx-windows-x64.exe — 单文件二进制（免 Node；需系统 Edge/Chrome）
- mmdx-dynamic-v2.1.0.zip — 动态运行时（需 bun）
- mmdx-skill-v2.1.0.zip — skill 目录 + 内嵌 CLI（`bin/mmdx.exe`）

三个包都随附 `THIRD_PARTY_NOTICES.md` 与 `licenses/`（含 8 个字体家族的 OFL 全文）。

## 依赖环境

Windows 10/11 自带 Microsoft Edge 即可运行。完整变更见 [CHANGELOG.md](https://github.com/daidaiJ/mmdx/blob/main/CHANGELOG.md)。
