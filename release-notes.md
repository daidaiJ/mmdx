首个公开发布。

## mmdx
Mermaid → SVG/PNG 导出 CLI，为 AI agent 设计：从 Markdown 提取 ```mermaid / ```table / ```list 围栏块，批量渲染导出。

## 亮点
- tech 默认主题（大厂技术文档风，形状分色）+ openai / openai-dark / minimal / latte / mocha / sketch 共 7 套；支持 --theme-js / --css / --config 自定义
- 内置 Noto Sans SC 子集中文字体（GB2312 + 拉丁，1.9MB），任意机器渲染一致
- ELK 布局引擎（仅 flowchart 懒加载），连线避让与长文本换行开箱即用
- 像素级均匀留白（二次墨迹裁切）、--title 标题注入（top/bottom）、emoji 与 iconify 图标包
- PNG 无损 2x + SVG（svgo 压缩，二进制版外部化）
- 批量管线：单浏览器页池、并发截图串行化、60s 超时保护、失败自动重试、失败块隔离
- agent 友好：--json 机器输出、--profile 阶段耗时、退出码约定、25 项验收测试矩阵

## 产物
- mmdx-windows-x64.exe — 单文件二进制（免 Node；渲染需系统自带 Edge/Chrome）
- mmdx-dynamic-v1.0.0.zip — 动态运行时（需 bun，解压后 bun install）

## 依赖环境
Windows 10/11 自带 Microsoft Edge 即可运行，无需其他安装。
