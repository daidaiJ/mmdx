```mermaid
gantt
    title 项目排期
    dateFormat YYYY-MM-DD
    section 开发
    设计评审      :done, a1, 2026-09-01, 3d
    核心编码      :active, a2, after a1, 5d
    联调          :a3, after a2, 3d
    section 测试
    回归测试      :a4, after a3, 4d
```
