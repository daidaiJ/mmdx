新增 explain 叙事档（vendored visual-explainer 规格化改造版）、中文三字体家族与手绘页 figure lint，并附两个 vendored skill 的实渲展示专题。

- **新增 explain 叙事档**（[skill/explain/](https://github.com/daidaiJ/mmdx/tree/main/skill/explain)）：vendored [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer)（10.6k★，MIT）**规格化改造版**——多图叙事解释页 / diff·plan 评审页 / recap / 幻灯片页；上游 renderer 一个文件不随附（visual-explainer 适配 mmdx：starter 装配式写作 + mmdx 导出，渲染零新增、mmdx 核心代码零改动）。4 个 register starter（instrument/blueprint/paper/editorial）已内联 kit.css + defs + 全部拉丁字体（153KB，OFL 随附），kit 资产不进 LLM 上下文；页内 mermaid 由 mmdx 预渲 SVG 后内联；JS 交互态（stepper/replay/ve-ask）禁用于 PNG 交付
- **中文三字体家族**：exe 内嵌 Noto Serif SC（可变字重）与霞鹜文楷 GB2312 子集，与 Noto Sans SC 并列注入 HTML 页导出——serif 栈中文自动落宋体（修掉「黑体字形顶 serif 栈」的断档），手绘标注可显式 `'LXGW WenKai'` 楷体；围栏/mermaid 路径维持仅黑体不增负担；editorial「简中手绘实践要点」同步修订（serif 标题与楷体标注离线可用）
- **figure lint（`file.html` 输入）**：导出自动体检每个图，六类检查——越界（带方向与像素）、文字压形/压字、**粘连**（与节点框间距 < max(4px, 字高×35%)，肉眼最易漏）、有效字号 <11px、缺 caption/aria；消息 LSP 式自定位（图号 · 文本 · viewBox 坐标 · 压到的形状名 · 方向/间距），例：`figure-text-adhesion: 图1 文字「① GET」(x242,y118) 左侧贴着「客户端」(间距3px)`；进 `--json.warnings`，按坐标修到清零再交付——肉眼逐图排查升级为机器清单，editorial / explain / 任意手绘 HTML 通用；豁免策略防假告警（同组标签、骑线 halo/chip 标签对线豁免对框不豁免、大框居中标签、隐藏文本与 sliver）
- **实渲展示专题**（[docs/showcase-vendored-skills.md](https://github.com/daidaiJ/mmdx/blob/main/docs/showcase-vendored-skills.md)）：editorial 与 explain 各一张 `mmdx file.html --scale 3` 直出 PNG，展示新字体与 lint 能力，源文件可复现
- 调研与设计论证存档：[docs/research-visual-explainer.md](https://github.com/daidaiJ/mmdx/blob/main/docs/research-visual-explainer.md)（许可一票否决 vivid-illustration、路线选择、字体策略与实测数据）

- 二进制：下载 mmdx-windows-x64.exe 覆盖即可（新增字体随 exe 内嵌）
- skill 一体包：mmdx-skill-v1.4.2.zip（含 explain/ 全部规格与 starter）
- 动态运行时：解压 mmdx-dynamic-v1.4.2.zip 覆盖（assets/fonts 含三套中文字体子集）
