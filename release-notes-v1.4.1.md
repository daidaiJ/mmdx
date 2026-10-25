新增 skill + CLI 一体发布包 `mmdx-skill-<tag>.zip`，并沉淀两份配图实践中验证过的 skill 文档。

- **新增 `mmdx-skill-<tag>.zip` 发布产物**：skill 目录（`SKILL.md` / `references/` / `editorial/`）与 windows-x64 CLI 一步到位——解压后把包内内容整体拷进 agent 的 skills 目录（`~/.qwen/skills/mermaid/`、`~/.grok/skills/mermaid/`、`~/.claude/skills/mermaid/` 等）即完成 skill 安装；CLI 内嵌在 `bin/mmdx.exe`（与独立 exe 同一构建），附 `INSTALL.md`（安装路径、CLI 验证、非 Windows 指向 dynamic 包）。README 快速上手新增方式 D（中英同步）
- **recipes 新增特殊画法「对照式 timeline（事件 vs 对策）」**：每个时期固定两行——第一行"发生的事"、第二行"对应的处置"，适合攻击链 vs 防线、事故 vs 响应这类阶段对照叙事；比 flowchart 平行双链省一半节点预算且无交叉连线。附已验证示例与 `--source "© id"` 署名水印用法（印在 PNG 页脚，mermaid 图型与扩展围栏通用）
- **editorial 新增「简中手绘实践要点（mmdx 语境）」**：mmdx 渲染器只注册 `'Noto Sans SC'`（无衬线），因此简中标题/callout 落 sans 600 而不是照上游用 italic serif（离线赌不到 `Noto Serif SC`）；sublabel 保持 Latin mono；署名水印两种做法（围栏 `--source` / 手绘页脚 `<text>`）；4px 网格纪律照旧。出处：Layer Stack 简中主图实渲 + 视觉模型 QA 通过
- **skill 新增 §1e「回哺：新画法沉淀」**：Agent Loop 在自检后增加回哺步——用 mmdx 渲染出新写法模式（可直接抄的模式，非换皮普通图）时，建议沉淀进 recipes/fences 并**同步维护 SKILL.md「按需加载」索引**；示例须实渲染验证；按需加载清单同步补上 v1.4.1 新增的「对照式 timeline」条目

- 二进制：下载 mmdx-windows-x64.exe 覆盖即可；agent 用户可改用新增的 mmdx-skill-v1.4.1.zip 一步装齐
- 动态运行时：解压 mmdx-dynamic-v1.4.1.zip 覆盖（skill/ 目录含上述两份新增文档）
