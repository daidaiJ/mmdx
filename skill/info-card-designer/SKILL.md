---
name: info-card-designer
description: Turn a URL, pasted text, or a topic into a magazine-style HTML info card PNG — 480/600/900 widths, hook summaries, automatic splitting above 1200px. Use when the user says 生成信息卡 / 做张信息卡 / 把这段内容做成卡片 / 信息卡片 / make info card / generate card. NOT for flowcharts, KPI tables, or data charts; use the mermaid/mmdx skill for those.
---

# info-card-designer — URL / 文本 → 杂志感信息卡 PNG

把一条链接、一段文字或一个主题，整理成一张可发 X / 小红书 / 微信的杂志感信息卡。设计语言参考 `joeseesun/qiaomu-info-card-designer`（瑞士国际主义 + 编辑杂志），渲染由 mmdx 的系统 Edge/Chrome 完成，不需要 Playwright Python、Pillow 或 NumPy。

## 触发词

- 中文：`生成信息卡`、`做张信息卡`、`信息卡片`、`把这段内容做成卡片`、`把链接做成卡片`
- English：`make info card`、`generate card`、`turn this into a card`

## 工作流

### 1. 取素材

| 输入 | 命令 |
| --- | --- |
| 链接 | `--url <url>` |
| 粘贴的文字 / Markdown | `--in note.md`（或 `--in -` 从 stdin） |
| 只有主题 | 先写一份 300–800 字的 Markdown 草稿，再 `--in` |

只用素材里存在的事实。来源没有的数字、结论、引语不要补；需要补背景时明确标注“补充”。

### 2. 整理成卡片结构

```markdown
---
title: 一句话标题（≤ 20 字）
kicker: 栏目 / 分类
deck: 一两句导语
source: 来源
---

## 发生了什么

一段 2–4 行的摘要。

- 要点一
- 要点二
- 要点三

> 一句可截图的判断或引语。

## 下一步

1. 行动一
2. 行动二
```

规则：

- 标题短、有信息量；不要用“关于……的思考”这类空标题。
- `deck` 只承担导语，不重复标题。
- 小节 2–5 个；每节一个核心意思。
- Hook 模式（用户说“钩子/更抓人”时）：每条描述压到 10–20 字，保留事实。
- 代码块、表格、列表都可以出现；表格过宽时改写成列表。

### 3. 选风格

信息卡默认是杂志感，所以默认 `openai` + `paper`。需要更产品或更工程时再换：

| 场景 | 主题 | tone | 说明 |
| --- | --- | --- | --- |
| 杂志感 / 对外分享 / 打印（默认） | `openai` | `paper` | 衬线标题、16px 圆角；对外报告与长文摘要也用它 |
| 工程文档 / 内部说明 | `tech` | `neutral` | 无阴影、10px 圆角、信息密度高 |
| 产品发布 / 侧栏 | `openai` | `product` | 6px 圆角、细阴影、紧凑 |

`--tone` 只改变结构（圆角、阴影、标题字体、表格头）；配色由 `--theme` 决定。

### 4. 选宽度

| 宽度 | 适合 | 2x 输出 |
| --- | --- | --- |
| `480` | 手机首屏、紧凑 | 960px |
| `600`（默认） | 通用分享 | 1200px |
| `900` | 桌面 / 大屏 | 1800px |

### 5. 渲染

```bash
# 链接
mmdx card --url https://example.com/post \
  -t openai --tone paper --width 600 \
  -o card.png --json

# Markdown
mmdx card --in note.md \
  -t openai --tone paper --width 480 \
  -o card.png --json
```

`--json` 返回：

```json
{
  "command": "card",
  "cards": 2,
  "files": ["card-1.png", "card-2.png"],
  "pages": [{ "file": "card-1.png", "width": 1200, "height": 1586 }]
}
```

超过 `--max-height`（默认 1200 CSS px）会自动拆成多张，文件名追加 `-1`、`-2`。需要更长的单张时调大 `--max-height`；不要为了塞内容把字号压到 12px 以下。

### 6. 自检

1. `--json` 的 `failed` 不存在、`cards === files.length`。
2. 每张高度不超过 `max-height × scale`；超了说明有不可拆块（例如超长表格），改写成列表或拆成两张。
3. 打开 PNG 看：标题在、文字不截断、底栏有来源、四边留白。
4. 对照素材：没有编造数字/结论；引语和专有名词保持原样。
5. 分享前确认宽度符合平台：手机 480/600，桌面 900。

## 与上游的关系

- 设计参考：`joeseesun/qiaomu-info-card-designer`（Swiss/editorial、480/600/900、>1200px 自动分割、hook 摘要）。
- 渲染替换：上游用 Playwright Python + Pillow/NumPy；本 skill 用 mmdx 的系统 Edge/Chrome + 内嵌中文字体，免 Python 运行时。
- 字体：上游用仓耳今楷；本 skill 使用系统/主题字体栈，跨机器一致性由 mmdx 的 Noto Sans SC 兜底。需要特定字体时用 `--css` 或主题字体栈。
- 本 skill 只做信息卡；流程图、KPI、表格截图用 `skill/SKILL.md`（mermaid/mmdx）。

## 故障速诊

| 现象 | 处理 |
| --- | --- |
| `no Chrome/Edge found` | 安装 Edge/Chrome，或 `--browser <path>`；不自动下载 |
| `fetch ... HTTP 403` | 页面有反爬/登录；保存为 Markdown 后 `--in` |
| 网页正文提取不完整 | `--url` 只做轻量提取；改用浏览器另存正文或手动粘贴 |
| 卡片被拆得太碎 | 调大 `--max-height`，或减少小节/合并短段 |
| 单张仍然过高 | 拆成“总览 + 细节”两张，或把表格改成列表 |
| 文字被裁切 | 缩短标题/列表项；`--width` 加大到 600/900 |
| 字体不对 | 主题字体栈 + `--css` 指定；确认目标机器有对应字体 |

## 示例

输入：

```markdown
---
title: 灰度发布复盘
kicker: 工程周报 · 2026-10
deck: 一次 5% 灰度暴露了监控盲区，也验证了自动回滚链路。
source: 平台工程组
---

## 发生了什么

周三晚间的 5% 灰度在 12 分钟内触发错误率阈值。自动回滚完成，但定位下游超时多花了 8 分钟。

- 灰度窗口 30 分钟 → 15 分钟
- 错误率阈值 1%，采样粒度 10 秒
- 复盘模板加入“下游依赖”

> 监控要覆盖调用链第一跳，而不是只看入口 QPS。
```

命令：

```bash
mmdx card --in note.md -t openai --tone paper --width 600 -o out/card.png --json
```

输出：`cards: 1`，`1200×1586`（2x），标题、导语、两条小节和底栏来源都在。
