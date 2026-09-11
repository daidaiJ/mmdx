# mmdx v1.1.0

办公出图：画幅预设、图题层、品牌色、轻量数据围栏。

## 亮点

- `--preset slide|a4|square`；图题/来源/单位印在 PNG 上（**Breaking：** `--title` 不再写入 mermaid frontmatter）
- `--brand` 只改扩展块强调色；`--strict-chart` + `--json.warnings`
- 新围栏：chart / kpi / compare / funnel / task / progress / swimlane / gauge / vs / heatmap
- skill / AGENT_GUIDE 按办公意图选型（总览 ≤9 节点）；图鉴见 docs/EXTENSIONS.md
- 测试打开 profile 插桩，避免 HTML 块后按块重注 mermaid

## 产物

- mmdx-windows-x64.exe — windows x64 单文件（免 Node，需系统 Edge/Chrome）
- mmdx-dynamic-v1.1.0.zip — 动态运行时（需 bun）
