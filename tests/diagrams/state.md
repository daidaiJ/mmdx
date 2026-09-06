```mermaid
stateDiagram-v2
    [*] --> 待支付
    待支付 --> 已支付: pay()
    已支付 --> 已发货: ship()
    已发货 --> [*]
    已支付 --> 退款中: refund()
    state 退款中 {
        [*] --> 审核
        审核 --> 已退款
    }
```
