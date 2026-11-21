mmdx 2.3.0：PNG 调色板量化、三档质量、图片元信息，以及编辑器质量下拉。

## 亮点

- **PNG 调色板量化**：新增 `--png-colors <auto|off|2..256>`。截图后按颜色频次加权 k-means 生成调色板，高频色固定、加权最远点播种、Lloyd 迭代；索引 PNG 写 1 / 2 / 4 / 8 位深、`PLTE`、透明底 `tRNS`，filter 0 + zlib level 9
- **按主题的实测门槛**：用 8 套主题 × 9 种图型共 72 张 2× 图标定，标准为 p99 边缘 OKLab ΔE ≤0.035、全局 PSNR 53 dB；自动从 128 / 160 / 192 / 224 / 256 色中挑最小可行档，没有候选过门槛或索引文件不更小时保留 RGBA。`bun scripts/calibrate-png.ts` 可复跑
- **`--png-quality fast|balanced|best`**：三档调整采样、迭代、稀有颜色反馈、候选色数与门槛。72 图语料总输出 40.9% / 41.2% / 41.8%，最差 p99 边缘 ΔE 0.040 / 0.035 / 0.033，中位耗时 49 / 69 / 81 ms；22 张抽样实测缩到原始体积的 32–50%，典型流程图 55KB → 17–19KB
- **编辑器质量下拉**：`mmdx edit` 的 PNG 按钮旁新增「自动均衡 / 质量 / 快速」，默认跟随启动时的 `--png-quality`，每次导出单独传入；`/api/export/png` 通过 `X-Mmdx-Png-Quality` 回显实际档位
- **图片元信息**：PNG / SVG 默认写入标题、创建时间（UTC）、`mmdx <version>`、主题 / tone、来源与项目版权；作者只在传入时写入。PNG 用标准 `tEXt`（Latin-1）/ `iTXt`（UTF-8），SVG 用 RDF/Dublin Core `<metadata>`。新增 `--author`、`--copyright`、可重复的 `--meta key=value` 与 `--no-meta`；`mmdx card` 与 `mmdx edit` 的导出共用同一套逻辑
- **编辑器 SVG 元信息**：新增 `/api/export/svg`，SVG 下载由服务端补元信息；切换主题后导出的 `Theme` 随当前模板更新

## 修复

- `best` 档在信息卡等文本密集页面的 256 色边界回退 RGBA：`best` 只抬高边缘门槛（+0.5 dB），全局 PSNR 保持 53 dB
- Chromium 返回 `Uint8Array` 时元信息写入失败（影响 `--png-colors off` 与量化回退路径）：PNG 元信息入口先 `Buffer.from()`
- 元信息写入放在调色板量化与 svgo 之后，压缩步骤不会再丢掉文本块或 `<metadata>`

## 验证

- `bun run test` **225/225**，`bun run typecheck` 通过
- 新增 8 项元信息测试：参数解析 / 字段构建 / PNG `tEXt` + `iTXt` / SVG RDF / HTML 标题 / CLI PNG+SVG / 非法参数 / card 元信息
- headless Edge 验证编辑器：PNG / SVG 均带作者、版权、自定义字段与固定时间；`tech → openai` 后两边 `Theme` 都变为 `openai`
- 质量档位在源码与编译二进制上都验证：初始 `balanced`，`fast` 18,206B、`best` 18,767B，均为 8 位索引 PNG

## 已知边界

- 元信息在出图 / 导出时写入；还没有独立命令修改已有 PNG / SVG 的元信息
- PNG 关键字限 Latin-1，值支持中文等 UTF-8；未写 XMP 二进制包
- 未引入 oxipng / zopfli 二次无损压缩：评估过，原生 oxipng 再省约 6%，WASM zopfli 再省 7–12%，但单图需要 5–8 秒，暂不采用
- 极长图（数万像素高）的量化耗时未单独基准

## 产物

- `mmdx-windows-x64.exe` — 单文件二进制（免 Node；需系统 Edge/Chrome）
- `mmdx-dynamic-v2.3.0.zip` — 动态运行时（需 bun）
- `mmdx-skill-v2.3.0.zip` — skill 目录 + 内嵌 CLI（`bin/mmdx.exe`）

三个包都随附 `THIRD_PARTY_NOTICES.md` 与 `licenses/`。

## 依赖环境

Windows 10/11 自带 Microsoft Edge 即可运行。完整变更见 [CHANGELOG.md](https://github.com/daidaiJ/mmdx/blob/main/CHANGELOG.md)。
