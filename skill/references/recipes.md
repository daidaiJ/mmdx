# mermaid 图型示例与特殊画法（按需读取）

> 写 mermaid 图型抄最小语法、或要组合版式（并列/嵌套/分层）时读本文。示例全部来自本仓库 `tests/diagrams/` 已验证 fixture 与专项验证，抄了就能渲染。扩展围栏（table/chart/kpi…）语法见 [fences.md](fences.md)。

## 一、图型最小示例（16 种常用）

````markdown
```mermaid
flowchart LR
    A["客户端"] --> B{网关校验}
    B -- 通过 --> C["核心服务"]
    B -- 拒绝 --> D["403"]
    C --> E[("PostgreSQL")]
```

```mermaid
sequenceDiagram
    autonumber
    actor u as 用户
    participant a as API 网关
    u->>a: 提交订单
    alt 库存充足
        a-->>u: 201 Created
    else 库存不足
        a-->>u: 409 Conflict
    end
    note over a: 幂等键缓存 24h
```

```mermaid
stateDiagram-v2
    [*] --> 待支付
    待支付 --> 已支付: pay()
    已支付 --> 已发货: ship()
    已支付 --> 退款中: refund()
    state 退款中 {
        [*] --> 审核
        审核 --> 已退款
    }
    已发货 --> [*]
```

```mermaid
classDiagram
    class Order {
        +String id
        +pay() Result
    }
    class OrderService {
        +create(cmd) Order
    }
    OrderService --> Order : creates
```

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    USER {
        string name
    }
```

```mermaid
gitGraph
    commit id: "init"
    branch dev
    commit id: "feat A"
    checkout main
    merge dev tag: "v1.0.0"
```

```mermaid
pie showData
    title 流量来源
    "搜索" : 42
    "直接访问" : 30
    "社交媒体" : 18
```

```mermaid
quadrantChart
    title 技术选型评估
    x-axis 低成本 --> 高成本
    y-axis 低收益 --> 高收益
    quadrant-1 优先投入
    quadrant-2 谨慎评估
    quadrant-3 暂缓
    quadrant-4 快速尝鲜
    ELK布局: [0.3, 0.8]
    draw.io: [0.7, 0.4]
```

```mermaid
gantt
    title 项目排期
    dateFormat YYYY-MM-DD
    section 开发
    设计评审      :done, a1, 2026-09-01, 3d
    核心编码      :active, a2, after a1, 5d
    section 测试
    回归测试      :a4, after a2, 4d
```

```mermaid
journey
    title 用户下单旅程
    section 浏览
      打开首页: 5: 用户
    section 下单
      支付: 2: 用户, 系统, 银行
```

```mermaid
timeline
    title 版本历史
    2026-08 : 立项
    2026-09 : 内置主题
            : ELK 布局
    未来    : 二进制分发
```

```mermaid
mindmap
  root((mmdx))
    渲染
      SVG
      PNG
    主题
      tech
      sketch
```

```mermaid
radar-beta
  graticule polygon
  axis m["解析"], s["布局"], e["截图"]
  axis h["压缩"], g["字体"], a["导出"]
  curve a["v1.0.0"]{85, 90, 80, 70, 75, 90}
  curve b["当前"]{70, 75, 85, 80, 90, 85}
  max 100
  min 0
```

```mermaid
sankey-beta
API Gateway,Order Service,45
API Gateway,Payment Service,30
Order Service,Database,40
```

```mermaid
treemap-beta
"二进制产物"
    "mermaid 运行时": 55
    "bun 运行时": 30
    "字体子集": 10
"动态运行时"
    "源码与资源": 15
```

```mermaid
kanban
  todo[待办]
    docs[补全 README]
  doing[进行中]
    svg[SVG 压缩]
  done[已完成]
    v100[v1.0.0]
```
````

C4：`C4Context` / `C4Container`（深色块 + 小人需 `--engine mermaid`，默认 Pele 画成浅色办公卡）。`xychart` **不要手写**——趋势/柱状走 ` ```chart ` 围栏（有预算检查和图题层）。

## 二、特殊画法（组合版式，已验证）

### 1. 一图两个并列流程，方向各异（LR + TB 混排）

subgraph 内 `direction` 各自生效——**仅默认 Pele 引擎支持**；`--engine mermaid`（ELK）会忽略 `direction`，两块都变纵向。

````markdown
```mermaid
flowchart TB
  subgraph 主流程["交付流水线（横向）"]
    direction LR
    A[需求] --> B[开发] --> C[发布]
  end
  subgraph 审批线["审批链（纵向）"]
    direction TB
    D[提交] --> E[评审] --> F[批准]
  end
  C --> F
```
````

要点：subgraph 必须命名（`subgraph id["显示名"]`）；跨组连线（`C --> F`）放在两组之外声明。

### 2. 嵌套包含（部署 / 包含关系）

subgraph 套 subgraph，外层画容器、内层画成员；Pele 下成员位置更贴源码。

````markdown
```mermaid
flowchart TB
  subgraph DC["机房 A"]
    subgraph K8s["K8s 集群"]
      A[api] --> B[(db)]
    end
    C[网关] --> A
  end
  U[用户] --> C
```
````

### 3. 组织架构树

`flowchart TD` 天然自顶向下树，不需要别的语法；**不要**用 `LR` 画组织架构。汇报关系就是边，虚线管理线用 `-.->`。

### 4. 分层横切（层叠 / 泳道式 lanes）

并列命名 subgraph 当层，层内正常连线，层间只留少量关键边；配色交给主题。真正跨部门 handoff 场景改用 ` ```swimlane ` 围栏（见 [fences.md](fences.md)）。

### 5. 对照式 timeline（事件 vs 对策）

每个时期固定两行：第一行写"发生的事"，第二行写"对应的处置"，读者竖着扫任何一列都是完整叙事。适合攻击链 vs 防线、事故 vs 响应、变更 vs 回滚这类**阶段对阶段**的对照——比 flowchart 两条平行链省一半节点数预算，且没有交叉连线。两行的语义要在 `--title` 里点明（如"攻击链 vs 防线"），否则读者不知道第二行是对策。

```mermaid
timeline
    扫描端口 : 全端口扫描 : 仅 22 / 8338 可达
    撞库爆破 : 密码字典与脚本 : 公钥 only 加双轨惩罚
    初次落地 : 低权限 shell : 无 sudo 可用 无编译器
    尝试提权 : 内核漏洞利用 : 新内核每日补丁
    试图常驻 : 后门与定时任务 : journald 审计可回放
```

出图要作者署名 / 水印，用图题层 `--source` 印在 PNG 页脚（mermaid 图型与扩展围栏通用）：

```bash
mmdx attack-chain.mmd --preset column --title "自动化攻击链 vs 每层防线" --source "© daidaiJ" -o attack-chain.png
```

