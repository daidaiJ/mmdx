mmdx 2.4.0：PNG 无损重压缩、`near` 低损档，以及 K8s / ChatGPT 风技术解释图模板。

## 亮点

- **PNG 无损重压缩**：新增 `src/png-opt.ts`。截图在调色板量化前先按行选 PNG 滤波器（None / Sub / Up / Average / Paeth），比较 zlib default / filtered / RLE / Huffman 策略，并在全不透明时去掉 alpha 通道；像素逐字节不变。照片页实测省 9.7%，渐变 + 文字页省 21.2%
- **`--png-colors near`**：任意 HTML 截图的低损档，256 色、全局 PSNR 约 35.3 dB；渐变 / 照片边缘低于 27.5 dB 时回退无损。1.81 MB 照片页输出 226 KB（约 1/8），文字与边界更清楚的纯色页仍走严格 `auto`
- **无损档也覆盖 `off`**：`--png-colors off` 跳过量化，但保留无损重压缩；`--png-quality fast|balanced|best` 同时控制重压缩与量化的 effort
- **K8s 标准模板**：新增控制平面 + 工作节点集群架构（`flowchart BT`、官方英文组件名、四层 `classDef`）与 Ingress → Service → Pod 服务访问路径（配置 / 存储旁路）；示例图 `docs/gallery/kubernetes-architecture.png` / `kubernetes-service-path.png`
- **ChatGPT / OpenAI 风技术解释图**：`-t openai` + 客户端 / 网关 / 服务 / 数据四组层色 + 编号请求流 + 图题 / 来源；示例图 `docs/gallery/tech-architecture.png`
- **文档与 skill 同步**：新增 `docs/ARCHITECTURE.md` / `.en.md`（完整模板源码、色板、版式规则）与 `docs/research-domain-diagrams.md`（D2 ELK/TALA/Dagre、PathVis、K8s、ChatGPT 风格与同类项目取舍）；`skill/references/architecture.md`、`skill/SKILL.md`、`AGENT_GUIDE`、`README` 均加入选型入口
- **README 首页拼图**：重出为 21 张图型，加入 `architecture-beta` 示例；拼图脚本会把 `docs/gallery/architecture-beta.png` 一并纳入

## 修复

- **`Uint8Array` 截图跳过无损重压缩**：Chromium 返回 `Uint8Array` 时 `optimizePngLossless` 内部的 `readUInt32BE` 抛错并静默回退，CLI 的 `.html` 导出实际没有压缩。现在先统一转成 `Buffer`，并新增 `unit/png-opt-uint8` 回归测试
- **`cli/png-colors` 体积断言**：`best` 档经无损重压缩后比 `fast` 更小，测试从 `best >= fast` 改为 `best <= fast`，与压缩目标一致

## 验证

- `bun run test` **227/227**，`bun run typecheck` 通过
- 真实 HTML 照片页 CLI 实测：原始 1,808,607 B → 无损 1,634,091 B（省 9.7%）→ `near` 226,395 B（256 色，35.3 dB）
- K8s 集群 / 服务路径 / 技术解释图的文档源码均用 CLI 重新渲染通过；`flowchart-nodes` 9 节点概览提示只进 `--json.warnings`
- PNG 优化器覆盖 36 张图书馆图，合计约 6.7 秒（中位约 0.19 秒/张，最大 0.76 秒）

## 已知边界

- `architecture-beta` 在 Pele 下仍不绘制箭头；K8s 模板使用 flowchart，需要箭头时继续用 flowchart
- 全量 K8s 集群图超过 9 节点概览阈值，会收到 `flowchart-nodes` 警告；不影响出图
- `near` 只对 `.html` 文档生效；渐变页可能回退无损
- 元信息仍只在出图 / 导出时写入，没有独立修改已有图片元信息的命令

## 产物

- `mmdx-windows-x64.exe` — 单文件二进制（免 Node；需系统 Edge/Chrome）
- `mmdx-dynamic-v2.4.0.zip` — 动态运行时（需 bun）
- `mmdx-skill-v2.4.0.zip` — skill 目录 + 内嵌 CLI（`bin/mmdx.exe`）

三个包都随附 `THIRD_PARTY_NOTICES.md` 与 `licenses/`。

## 依赖环境

Windows 10/11 自带 Microsoft Edge 即可运行。完整变更见 [CHANGELOG.md](https://github.com/daidaiJ/mmdx/blob/main/CHANGELOG.md)。
