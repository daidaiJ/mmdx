# 专业场景生图调研：D2 / PathVis / Kubernetes / ChatGPT 风格

> 状态：调研 + 已落地的两套视觉规范（2026-11-27）
> 目标：为 mmdx 的架构图、网络拓扑和技术解释图提供可复用的设计与实现参考，保持 Pele 单引擎、Mermaid 单语法。

## 结论先行

1. **D2 的 ELK / TALA / Dagre 示例**证明“同一份语义图换布局与边路由”能显著提升基础架构图的可读性；mmdx 吸收的是布局与容器表达方式，不引入第二套语法或引擎。
2. **PathVis** 最值得借鉴的是“起点 / 中间跳 / 终点”的语义色、hop 元数据和变化高亮，而不是它的实时 traceroute 栈。
3. **Kubernetes 官方示意图**的规范最完整：固定组件命名、控制平面 / 工作节点分区、每个组件一个盒子、连线只表达通信。它适合直接落成模板。
4. **ChatGPT / OpenAI 技术解释图**的稳定特征是浅底、圆角卡片、细边框、按层着色、编号请求流和少量强调色；它适合落成 `openai` 主题上的一套 `classDef` 版式。
5. 已落地：两份 K8s 模板、一份技术解释图模板、对应示例图、`docs/ARCHITECTURE*.md` 说明与 `skill/references/architecture.md` 速查；没有改渲染引擎，也没有新增主题。

## 1. D2 的 ELK / TALA / Dagre 示例

D2 文档把一组基础架构图分别用 Dagre、ELK 和 TALA 渲染：

- <https://d2lang.com/examples/dagre/>
- <https://d2lang.com/examples/elk/>
- <https://d2lang.com/examples/tala/>

示例覆盖银行证券、UDP 隧道、LLM 框架、Terraform、游戏状态时序、Go 队列、Lambda 基础设施、Stripe 等场景。它们的共同点是：语义不变，布局层可换；容器、图标、连线标签和外部系统边界由同一份源码表达。

### 值得吸收

| 做法 | 在 mmdx 里的对应 |
| --- | --- |
| 同一图切换布局引擎 | 不暴露引擎；在文档层给 `flowchart BT/LR`、子图 `direction` 的选择建议 |
| 容器级方向 | `subgraph` 内写 `direction LR/TB`，Pele 会按组内方向排布 |
| 正交边路由 | Pele 的折线/正交走线；需要手工微调时用 `mmdx edit` 拖锚点与改走线 |
| 固定坐标 / `near` | `mmdx edit` 的节点拖动与工程保存；源码层用子图约束成员 |
| 图标 + 标签 | `@{ icon: "logos:..." }` + `--icon logos`；图标只在能增加识别度时使用 |
| 稳定的确定性 | mmdx 的像素 lint 与固定字体栈；主题、字体、栅格都随包 |

### 不吸收

- **第二套语法**：D2 的容器、导入、layers/scenarios/steps 很完整，但会让 Agent 和用户多一套 parser 与写法。mmdx 的入口仍是 Mermaid 围栏。
- **第二套布局引擎**：TALA 的正交路由与非层级布局值得参考，但引擎接入会改变现有主题、lint、编辑器和确定性基线。TALA 仓库许可证在 GitHub API 曾显示未断言，代码按“只读参考”处理。
- **D2 的交付形态**：D2 的原生 Go 渲染器与 CLI 很成熟；mmdx 的差异点是“同一份 Markdown 围栏 → PNG/SVG + 主题 + 中文字体 + 办公画幅”，不需要复制它的运行时。

参考：既有布局/配色调研见 [research-layout-color.md](research-layout-color.md)；D2 布局引擎说明见 <https://d2lang.com/tour/layouts/>。

## 2. PathVis

PathVis 是 SIDN Labs 的 traceroute 可视化原型（MIT）：

- <https://github.com/SIDN/pathvis>
- <https://www.sidnlabs.nl/en/news-and-blogs/pathvis-visualising-traceroute-for-non-technical-users>

它的视觉语义非常清楚：

- 起点主机 “You” 在顶部，黄色；
- 中间跳（路由器）在中部，蓝色；
- 目标端点在底部，橙色；
- 每个 hop 显示 ASN、IP 和 ROA 有效性标记；
- 路径变化以事件形式高亮，并支持历史对比。

### 值得吸收

| 做法 | 在 mmdx 里的对应 |
| --- | --- |
| 起点 / 中间跳 / 终点三角色 | flowchart 的 `client` / `hop` / `target` 三个 `classDef`；颜色与形状同时区分 |
| hop 元数据 | 节点第二行写 ASN / IP / 区域；边标签写 RTT 或协议 |
| 变化高亮 | 同一张图用 `critical` 色标出新增/异常跳；历史对比拆成两张图 |
| 拓扑层次 | `subgraph` 表达 AS / 机房 / 区域边界，保持从左到右或从下到上的单向阅读 |

### 边界

PathVis 的实时采集、WebSocket 推送、WHOIS/DNS 富化和交互式历史回放属于运行时能力；mmdx 的定位是静态交付图。mmdx 可以用 flowchart + 子图画出同一套语义，采集与实时更新交给上游工具。需要精确认知位置时，用 `mmdx edit` 手工微调节点、锚点和走线。

## 3. Kubernetes 官方示意图

上游资料：

- Cluster Architecture: <https://kubernetes.io/docs/concepts/architecture/>
- Kubernetes Components: <https://kubernetes.io/docs/concepts/overview/components/>
- 官方架构图: <https://kubernetes.io/images/docs/kubernetes-cluster-architecture.svg>

### 固定组件

| 区域 | 组件 |
| --- | --- |
| Control plane | `kube-apiserver`、`etcd`、`kube-scheduler`、`kube-controller-manager`；`cloud-controller-manager` 可选 |
| Worker node | `kubelet`、`kube-proxy`、容器运行时（`containerd` / CRI-O）、Pods |
| 服务访问 | `Ingress`、`Service`（ClusterIP / NodePort / LoadBalancer）、`EndpointSlice`、Pod |
| 配置与存储 | `ConfigMap`、`Secret`、`PersistentVolume` / `PersistentVolumeClaim` |
| 附加组件 | CoreDNS、Ingress Controller、metrics-server、CNI 插件 |

### 视觉规范

1. **分区**：控制平面一个面板，每个工作节点一个面板；面板标题用 `Control Plane` / `Worker Node`。
2. **命名**：组件用官方英文名，标题、副标题和说明用中文；不要在图上自造缩写。
3. **盒子**：每个组件一个圆角盒子，盒子内只放名称；职责说明放图题或文档。
4. **连线**：只画通信关系；API server 是控制面的枢纽，kubelet / kube-proxy 的连线指向它。
5. **颜色**：颜色只承担层级（控制面蓝、工作节点绿、运行时紫、配置/存储橙），同一层同色。
6. **数量**：单图 ≤12 个组件；更多组件拆成“集群架构”和“服务访问路径”。

### mmdx 模板

| 模板 | 布局 | 用途 |
| --- | --- | --- |
| 集群架构 | `flowchart BT` + 组内 `direction LR` | 控制平面、工作节点、kubelet/kube-proxy、Pods |
| 服务访问路径 | `flowchart LR` | Ingress → Service → Pod，配置/存储旁路 |

`flowchart BT` 让 API server 作为边的目标位于上方，kubelet / kube-proxy 作为来源位于下方，箭头自然指向 API server；组内 `direction LR` 保持横向排布。`architecture-beta` 的组容器也很适合 K8s，但 Pele 当前不绘制它的箭头，因此模板选择 flowchart。

示例图与完整源码见 [ARCHITECTURE.md](ARCHITECTURE.md#kubernetes-常见示意图)；速查见 [skill/references/architecture.md](../skill/references/architecture.md)。

## 4. ChatGPT / OpenAI 技术解释图风格

这不是 OpenAI 的官方规范，而是对 ChatGPT 常见技术架构解释图的归纳。稳定的视觉特征：

- 近白底、墨色文字、薄荷绿强调；
- 圆角卡片、细边框、统一内边距；
- 3–4 个低饱和层色，颜色只区分层级；
- 节点标签是“名称 + 一行职责”，多数不超过两行；
- 请求链用编号边标签（1、2、3…），异步/观测用虚线；
- 图题、副标题、来源/图例放在图的边缘，图内保持组件与连线；
- 平面矢量，避免阴影、渐变、伪 3D 和照片。

### 参考样张

- 本地 `openai` 主题基线：[`docs/gallery/openai-flow.png`](gallery/openai-flow.png)、[`docs/gallery/html-report-openai.png`](gallery/html-report-openai.png)、[`docs/gallery/info-card-openai.png`](gallery/info-card-openai.png)。
- OpenAI 品牌色与字标：<https://openai.com/brand/>。
- ChatGPT 生成的技术解释图没有公开的规范画廊；本页归纳的是常见输出的共同点，落地时用 `openai` 主题与固定 `classDef` 色板保证一致性。

### 映射到 mmdx

| 规范 | mmdx 实现 |
| --- | --- |
| 近白底 + 墨色 + 薄荷绿 | `-t openai`（`#FFFFFF` / `#0D0D0D` / `#10A37F`） |
| 圆角卡片 + 细边框 | `classDef` 的 `rx:10px` / `stroke-width:1.5px` |
| 层色 | `client` 蓝、`edge` 绿、`service` 紫、`data` 橙四组固定 class |
| 编号请求链 | `-->|1 request|`、`-->|2 route|` … |
| 异步 / 观测 | `-.->|trace|` |
| 图题 / 来源 | `--title` / `--subtitle` / `--source` |
| 图例 | 写在文档或图题里；图内只保留必要标注，避免布局漂移 |

### 为什么不加阴影和渐变

mmdx 的 SVG 会经过 flatten 与 Office/PPT 兼容路径；阴影、渐变和 CSS filter 会增加渲染差异，也会让像素 lint 与跨机器确定性变差。平面卡片已足够表达 ChatGPT 风格的层级，且更接近技术文档的交付要求。

示例图与完整源码见 [ARCHITECTURE.md](ARCHITECTURE.md#技术解释图风格openai--chatgpt-系)。

## 5. 同类项目快扫

| 项目 | 可借鉴 | mmdx 的取舍 |
| --- | --- | --- |
| mingrammer/diagrams | 云厂商图标 + 标签的组合方式 | 图标授权因厂商而异；mmdx 用 Iconify 按需引入 |
| awslabs/diagram-as-code | 声明式资源图 | 只吸收“资源 → 盒子 + 图标”的表达 |
| KubeDiagrams | K8s YAML → 架构图 | 只吸收分组与命名；不接集群采集 |
| Terravision | Terraform → 架构图 | AGPL，按参考处理；不复制代码 |
| Inframap | Terraform state → 图 | 参考资源依赖表达 |
| shumoku | 网络拓扑与链路标签 | AGPL，按参考处理 |
| nwdiag | 网络分段 DSL | 语法不引入；分段用 `subgraph` 表达 |
| drawthe.net | 网络拓扑 JSON | 参考其设备/链路字段 |
| containerlab graph | 实验拓扑 | 参考机房/设备分组 |
| NetBox topology | DCIM/IPAM 数据源 | 参考资产与连接模型 |
| Structurizr C4 / LikeC4 | C4 语义角色 | mmdx 已支持 `C4Context`；颜色走主题 token |
| Ilograph | 交互式架构叙事 | 商业产品；只参考分层叙事 |
| Penrose | 约束式布局 | 不引入第二套布局引擎 |
| Isoflow / FossFLOW | 等距网络图 | 等距风格暂不吸收；办公 PNG 以平面为主 |
| Kroki | 多 DSL 渲染服务 | 不引入远程渲染依赖 |

许可证提示：D2 为 MPL-2.0；PathVis 为 MIT；TALA 的 GitHub 许可证字段曾显示未断言；Terravision / shumoku 为 AGPL。复制代码前逐项核对上游 LICENSE，本页只记录设计参考。

## 6. 本轮落地

- `docs/ARCHITECTURE.md` / `.en.md` 新增 Kubernetes 与技术解释图两节，含完整模板源码、色板、版式规则和命令。
- 新增示例图：
  - `docs/gallery/kubernetes-architecture.png` / `.svg`
  - `docs/gallery/kubernetes-service-path.png` / `.svg`
  - `docs/gallery/tech-architecture.png` / `.svg`
- `skill/references/architecture.md` 增加 K8s 两套模板与技术解释图色板；`skill/SKILL.md` 增加选型入口。
- 没有新增图型、主题或引擎；`classDef` 是 Mermaid 已有语法，Pele 已支持。

## 7. 后续可选

1. **architecture-beta 箭头**：等 Pele 上游支持后在专业场景里启用；当前 flowchart 已覆盖箭头需求。
2. **K8s 图标别名**：为 `logos:kubernetes` 等常用图标做缓存预热或别名表，减少首次联网。
3. **网络路径模板**：把 PathVis 的起点/跳/终点三角色固化成 `network-path` 文档模板；仍用 flowchart，不新增图型。
4. **模板命令**：如果模板数量继续增长，再评估 `mmdx template <name>`；当前用文档源码复制即可。
5. **图例生成**：从 `classDef` 自动生成图例需要布局层支持，暂不优先。
