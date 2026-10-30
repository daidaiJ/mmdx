mmdx 2.0.0：引擎收敛为 Pele 一套，主题扩到七套（新增 iOS 平面、动森、Fluent 玻璃、电子纸），并把「信息不只靠颜色承载」做成测试守住的无障碍门槛。

## 亮点

- **引擎只剩 Pele**（`pele@1.9.0`）：Mermaid 语法直出 SVG，单图 1–50ms；移除 `--engine` / `--layout` 与 `--json.fallbacks`，同时移除 mermaid（3.5MB）与 ELK（5.0MB）依赖及随包资源。输入语法不变（围栏 / `.mmd` / stdin），`--json.engine` 固定 `pele`
- **七套主题**：`tech`（默认）/ `openai` / `excalidraw` / `ios` / `acnh` / `glass` / `epaper`。新增四套：
  - `ios`：**纯平面** iOS 系统界面——分组浅灰底 `#F2F2F7` + 白卡片 + 发丝分隔线 + Apple 深色变体系统色；块页按 HIG 分组列表做法，不给卡片加强调色边条
  - `acnh`：奶油纸 `#FFF8E7` + 点阵网格 + 粗棕描边 + 硬偏移贴纸阴影 + 圆体字 + 胶囊标签
  - `glass`：Fluent 亚克力——淡蓝灰画布 + 28px 网格 + 白色半透膜（0.30）与 4% 颗粒，面板 8px 圆角带白描边；块页的 `backdrop-filter` 真实生效
  - `epaper`：电子纸 / 墨水屏——`#F5F1EB` 纸底 + 纸纹颗粒 + 发丝黑描边 + 直角 + 无强调色，形状族靠灰阶与形状区分
- **`ThemeSpec.backdrop`**：自带底的风格往 SVG 插一层 `mmdx-backdrop`（色块 + 高斯模糊 / 点阵 / 网格 `<pattern>` / 半透膜 + 噪点），PNG 整幅截取不按墨迹裁边；`--background transparent` 时不画底
- **`--tone paper|neutral|product`**：`paper` 把图与块页一起换成编辑风网格纸（`#FAFAF8` + 24px 细格 / 96px 粗格、焦橙强调色 `#BF4520`）
- **无障碍门槛**（[参考 WCAG 与无障碍风格实践](https://jacky0328.github.io/ui-ux-pro-max-web/styles/08-accessible.html)）：正文色 ≥7:1（AAA）、次要文字 ≥4.5:1、形状描边对底与对自己的填充各 ≥3:1、红绿色盲模拟下形状族仍两两可区分（OKLab ΔE ≥0.02）、四个形状族必须是四种形态（矩形 / 菱形 / 胶囊 / 圆柱）——信息不靠颜色单独承载，黑白打印与色盲读者都能读。新增 `src/color.ts`（WCAG 对比 + Machado 2009 色觉模拟 + OKLab 距离）与 `scripts/lint-a11y.ts`
- **`mmdx card`**：Markdown 或 URL → 信息卡 PNG，默认 `openai`，配合 `--tone`、480/600/900+ 宽度与按像素高度自动拆页；附独立 skill `skill/info-card-designer/`
- **画廊扩为 7 套主题 × 4 场景**，并新增[场景引导（状态图）](https://github.com/daidaiJ/mmdx/blob/main/docs/gallery/scenario.md)、[两个 HTML 场景模板](https://github.com/daidaiJ/mmdx/blob/main/docs/gallery/html-skills.md)、[信息卡 tone 对照](https://github.com/daidaiJ/mmdx/blob/main/docs/gallery/card-tones.md)与 v1.4.2 手绘 HTML 原始样张；skill 增加「场景 → 主题 / tone / preset」推荐表
- **测试矩阵 189 项**：七套主题 × 4 类图 + 3 类块页审计、双跑确定性、无障碍门槛、CLI 契约；`scripts/lint-visuals.ts` 与 `scripts/lint-a11y.ts` 输出可读报告

## Breaking

- `--engine pele|mermaid|auto`、`--layout elk|dagre`、`--json.fallbacks` 移除；Pele 解不了的图型不再有回退引擎
- `--theme-js` 为 v2 签名 `(theme) => theme`，接收 `ThemeSpec`；1.x 的 `config.themeVariables` 脚本报迁移错误
- `--config` 改为 Pele 白名单，其他 key 给 `config-ignored` 警告
- 移除 11 套旧主题（`openai-dark` / `openai-editorial` / `vercel` / `linear` / `stripe` / `notion` / `ibm` / `minimal` / `latte` / `mocha` / `sketch`），旧主题名报 `unknown theme`

## 产物

- mmdx-windows-x64.exe — 单文件二进制（免 Node；需系统 Edge/Chrome）
- mmdx-dynamic-v2.0.0.zip — 动态运行时（需 bun）
- mmdx-skill-v2.0.0.zip — skill 目录 + 内嵌 CLI（`bin/mmdx.exe`）

## 依赖环境

Windows 10/11 自带 Microsoft Edge 即可运行。完整变更见 [CHANGELOG.md](https://github.com/daidaiJ/mmdx/blob/main/CHANGELOG.md)。
