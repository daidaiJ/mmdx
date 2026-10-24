# mmdx v1.4.0

整页 HTML 原样截图 + diagram-design 手绘规格内嵌：场景分级正式成型——高频办公图走围栏模板（秒级、稳定），偶发 editorial 封面按内嵌规格手绘 HTML，两档统一经 mmdx 导出高保真 PNG。

## 亮点

- **新增 `file.html` 整页输入**：HTML 原样截图为 PNG（fullPage，只出 PNG），保留页面自身样式、脚本与背景；`--width` 为布局视口（页面显式更窄的 `body` 宽度优先），`--scale` / `--background` 照常生效——手绘 HTML 工作流（如 diagram-design）的免 Playwright 导出后端
- **离线中文保证延伸到 HTML**：内嵌 Noto Sans SC 注册为 `'Noto Sans SC'` 并按 CJK 码位区间 alias 到 `sans-serif` / `serif` 兜底链——页面西文字体不动，中文字形任意机器一致
- **内嵌 diagram-design 手绘规格**（MIT，commit `0b9b10c`）：`skill/editorial/`，UPSTREAM-SKILL + 63 个 references 原文，随 skill 目录整体分发；适配层覆盖导出命令 / 字体 / 选型边界
- **skill 渐进披露重构**：SKILL.md 收敛为索引 + 热路径，冷内容拆 `references/{fences, recipes, troubleshooting, themes-engines}.md` 按需读取
- **新增 `references/recipes.md`**：16 种 mermaid 图型最小示例（取自已验证 fixture）+ 特殊画法——一图并列双流程（subgraph `direction` LR+TB 混排，实测仅默认 Pele 支持，mermaid+ELK 忽略）、嵌套包含、组织架构、分层横切；全部实渲染验证 18/18
- **场景分级立为总口径**：高速档 = 围栏模板（PNG @2x / mermaid SVG，每图 ~0.3–1.5k token 秒级）；精美档 = 手绘 HTML（PNG @3x，~10–20k token 分钟级）；清晰度 = deviceScaleFactor 超采样一次栅格化、无事后缩放、无 JPEG
- `.md` 内 ` ```html ` 围栏仍不支持（只认独立 `.html` 文件），围栏版式纪律不可绕过

## 升级

- 二进制：下载 mmdx-windows-x64.exe 覆盖即可
- 动态运行时：解压 mmdx-dynamic-v1.4.0.zip 覆盖（skill/ 目录结构有变化）

## 产物

- mmdx-windows-x64.exe — windows x64 单文件（免 Node，需系统 Edge/Chrome）
- mmdx-dynamic-v1.4.0.zip — 动态运行时（需 bun），含重构后的 skill/ 目录
