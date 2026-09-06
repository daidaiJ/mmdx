```mermaid
gitGraph
    commit id: "init"
    branch dev
    commit id: "feat A"
    commit id: "feat B"
    checkout main
    merge dev tag: "v1.0.0"
    commit id: "hotfix"
```
