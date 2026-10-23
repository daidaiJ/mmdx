# mmdx v1.3.0

默认引擎换成 Pele，流程图连线默认走曲线。

## 亮点

- 默认渲染引擎 **Pele**（obsidianmd/pele v1.9.0，MIT）：自研布局 + 宽 S 弯路由，流程图不再折线
- 新增 `--engine pele|mermaid`（默认 pele）；`--engine mermaid` 保留 Chromium + mermaid.js + ELK 回退
- 形状分色映射到 Pele 类：过程蓝 / 判断琥珀 / 状态绿 / 存储紫；各主题 `--pele-*` 由 themeVariables 派生
- mermaid 回退也改曲线（`curve: basis`），并修复 `--layout elk` 实际未激活的问题
- `sketch` 自动回退 mermaid；`--layout` 仅对 mermaid 生效；扩展块与像素裁切仍走 Chromium
- `--json` 增加 `engine`，`--help` 增加 `--engine`

## 产物

- mmdx-windows-x64.exe — windows x64 单文件（免 Node，需系统 Edge/Chrome）
- mmdx-dynamic-v1.3.0.zip — 动态运行时（需 bun）
