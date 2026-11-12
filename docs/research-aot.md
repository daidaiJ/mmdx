# AOT 字节码对 release 体积与性能的影响

> 状态：调研结论 · 2026-11-12（Bun 1.4.4，Windows 10 19044 x64，热缓存）
> 对象：`bun build --compile` 的 `--bytecode`（Bun 的 AOT 预编译），对照 `scripts/build.ts` 产出的 `dist/mmdx-windows-x64.exe`
> 结论：**AOT 不能减小 release 体积**——完整二进制 128.43MB → 147.05MB（+18.62MB，+14.5%）；换来 `--version` 启动中位 402ms → 260ms（-35%），出图速度与渲染期资源占用无实质变化。

## 结论先行

- **体积九成是运行时。** 空 `hello world` 编译产物 115,271,680 B，Bun 自身的 `bun.exe` 115,281,496 B；完整 CLI 只比运行时多 13.16MB。AOT 不裁剪运行时，因此没有减体积空间。
- **AOT 反而增重。** 代码与依赖部分的字节码增量 7.45MB；完整版增量 18.62MB——内联的 10.48MB 字体/引擎字符串被字节码缓存又存了一份。`--bytecode-depth` 越浅增量越小（1 层 +4.44MB，2 层 +6.08MB，全量 +7.45MB），仍为净增。
- **收益只在启动。** `--version` 中位 402ms → 260ms，峰值内存 164.5MB → 150.4MB，启动 CPU 375ms → 234ms。
- **出图无感。** SVG / PNG / 多图页只快 1.4% / 1.9% / 4.6%，落在 Chromium 启动的波动区间；渲染期进程树峰值内存与 CPU 基本持平。
- **默认格式编译不过。** `--bytecode` 默认转 cjs，在 `src/cli.ts:32` 的 `(await import('svgo/browser')).optimize as unknown as Optimize` 处报 `Unexpected .`；必须加 `--format=esm`。
- **决策：不以减体积为目的启用 AOT。** 若以后启动延迟成为瓶颈（例如单会话上百次短命令），再按「+18.62MB 换 -142ms/次」评估，且必须走 ESM 格式。

## 1. 产物体积构成

当前 release（`bun run build`，`--compile` 已隐含 production + 压缩）：

| 组成 | 字节 | 占比 | 说明 |
| --- | ---: | ---: | --- |
| Bun 运行时 | 115,271,680 | 89.7% | 与 `bun.exe` 只差约 10KB，空程序编译产物即此值 |
| 应用代码与依赖 | 2,693,120 | 2.1% | 空资源 stub 编译产物 117,964,800 B 减去运行时 |
| 内联资源 | 10,466,304 | 8.2% | `src/embed.generated.ts` 10,479,118 B：字体 base64 9.72MB（woff2 源 7.29MB）、Pele 706KB、rough.js 28KB |
| 合计 | 128,431,104 | 100% | `dist/mmdx-windows-x64.exe` |

体积上限由运行时决定：任何不替换 Bun/JSC 的方案，最多只能动剩下的 8.2% 资源与 2.1% 代码。

## 2. AOT 构建的体积

同一份 `src/embed.generated.ts` 下，两条编译命令的产物：

| 构建 | 字节 | 相对普通版 |
| --- | ---: | ---: |
| `--compile`（普通） | 128,431,104 | 基准 |
| `--compile --bytecode --format=esm` | 147,053,568 | +18,622,464（+14.5%） |
| 仅代码（stub 资源）普通 | 117,964,800 | — |
| 仅代码 + bytecode（全量深度） | 125,411,840 | +7,447,040 |
| 仅代码 + `--bytecode-depth=1` | 122,408,960 | +4,444,160 |
| 仅代码 + `--bytecode-depth=2` | 124,041,728 | +6,076,928 |

普通版并非未优化：`--compile` 隐含 `--production`，已启用压缩；增重来自字节码缓存本身。完整版比代码版多出的约 11.2MB 增量与内联资源同量级，说明字节码把字符串常量也另存了一份，而不是替换源文本。

## 3. 启动性能与资源

`--version`，热缓存，各预热一次后连续跑 20 次（先普通后 AOT，未交替采样）：

| 版本 | min | p50 | p90 | max |
| --- | ---: | ---: | ---: | ---: |
| 普通 | 384ms | 402ms | 432ms | 460ms |
| AOT | 227ms | 260ms | 295ms | 416ms |

Windows Job Object 统计（含子进程，各 5 次，取中位；探针只做启动/等待，不轮询，墙钟与干净计时一致）：

| 指标 | 普通 | AOT | 变化 |
| --- | ---: | ---: | ---: |
| 峰值 job 内存 | 164.5MB | 150.4MB | -14.1MB（-8.6%） |
| CPU（user+kernel） | 375ms | 234ms | -141ms（-37.6%） |
| 进程数 | 1 | 1 | — |

启动收益来自省掉 10.48MB 内联 JS 的解析与编译；进程数不变，内存下降与之一致。

## 4. 出图性能与资源

同一张流程图、独立进程、热缓存：

| 场景 | 普通 p50 | AOT p50 | 变化 | 样本 |
| --- | ---: | ---: | ---: | ---: |
| SVG | 3260ms | 3214ms | -1.4% | 6 |
| PNG | 3146ms | 3086ms | -1.9% | 5 |
| 多图 SVG（3 张） | 3621ms | 3453ms | -4.6% | 4 |

渲染期进程树（mmdx + Chromium，共 10 个进程，Job Object 峰值）：

| 场景 | 峰值 job 内存 | CPU |
| --- | ---: | ---: |
| SVG 普通 | 444.3MB | 5156ms |
| SVG AOT | 450.3MB | 4953ms |
| PNG 普通 | 424.5MB | 4805ms |
| PNG AOT | 405.8MB | 4804ms |

出图被浏览器启动与截图主导（约 3s），省下的启动开销只在多图场景多摊回一点；内存与 CPU 差异在 Chromium 波动范围内，不能据此判定 AOT 更省资源。

## 5. 功能一致性

两个二进制各跑一遍同一组输入，产物逐字节比较（`cmp`），18 个文件全部相同：

- 图型：flowchart、state、class、ER、sequence，SVG 与 PNG 双格式。
- 主题：`tech`（默认）、`excalidraw`（rough.js 后处理）、`ios`。
- 多图页：含 flowchart / pie / gantt 三块的 Markdown，6 个产物。
- 退出码均为 0。

流程图的 `tech` 主题产物在主题轮换时被同名文件覆盖，未进入最终比对集；其余覆盖已包含默认主题的 state/class/ER/sequence 与多图页。

## 6. 测量方法

- 体积：编译后读文件字节数；运行时下限用 `console.log("hi")` 同参数编译取得。
- 启动计时：每轮独立进程，`date +%s%N` 包围进程生命周期，交替预热各一次后连续采样，取 min/p50/p90/max。
- 资源：`CreateJobObject` + `AssignProcessToJobObject`，进程退出后读 `JOBOBJECT_EXTENDED_LIMIT_INFORMATION.PeakJobMemoryUsed` 与 `JOBOBJECT_BASIC_ACCOUNTING_INFORMATION` 的 user+kernel 时间；墙钟用 `Stopwatch`，不做轮询，避免采样开销。
- 编译命令：

```bash
# 资源需先内联进 src/embed.generated.ts（同 scripts/build.ts 第 3–5 步；探针把 BUILD_VERSION 设为 bench，不影响体积与渲染）
bun build src/cli.ts --compile --target=bun-windows-x64 --outfile /tmp/plain.exe
bun build src/cli.ts --compile --bytecode --format=esm --target=bun-windows-x64 --outfile /tmp/bc.exe
```

## 7. 边界与未验证

- 只测 Windows x64；macOS / Linux 的运行时体积与 AOT 增量未测。
- 只测热缓存；清空文件缓存后的冷启动可能放大或缩小启动差距。
- Chromium 启动波动较大，出图数据看区间更可靠；样本量 4–6 次。
- `--bytecode-depth` 只测到 2 层，未评估更细的深度与启动收益的对应关系。
- 若体积是硬目标，可替代的实测方向：字体外置可省约 9.6MB base64（woff2 源 7.29MB，压缩包 7.30MB）；动态运行时 zip 约 10MB（字体 7.3MB + `src` 0.3MB + `skill` 2.4MB），代价是依赖本机 bun。两者都不如 AOT 那样牵连启动路径。
