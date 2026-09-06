```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    USER {
        string name
        string email
    }
    ORDER {
        int total
        datetime created_at
    }
```
