# mmdx — Agent 入口

项目文档：`README.md`、`docs/AGENT_GUIDE.md`、`docs/HUMAN_GUIDE.md`。人类可读的完整方案见 `docs/STYLE_PORTS.md`。

## 🔄 Handoff 摘要

### 风格移植（Excalidraw / 动森）— in-progress

- **当前状态：** 方案已拍板，原型已出图；本轮未改生产代码。工作区另有前序未提交改动，开工前先 `git diff` 确认归属。
- **关键证据：** `review/style-porting/review-sheet.png` 6 图对照；`docs/STYLE_PORTS.md` 已记录决策、色板、rough 参数、CSS 配方和代码清单。
- **验收标准：** Excalidraw 在 Pele 下渲染 flowchart/state/class/ER 且文字不变形；动森覆盖 flowchart/card/kpi/task/table；旧主题不回归；用户对正式 `review/` 图二次目测通过后才推送。
- **详情指针：** [`docs/handoff/style-ports.md`](docs/handoff/style-ports.md)
- **未验证事项：**
  - [ ] 生产字体子集与跨机器渲染
  - [ ] rough 后处理覆盖 class/ER/state
  - [ ] 动森 `blockCss` 覆盖 12 种扩展块
  - [ ] Office/PPT 打开 hachure SVG
  - [ ] `--engine mermaid` + `excalidraw` 观感对比
