# Metricas de FormResponse

Base: `/escuta-cidada-api/form-response/metrics`

## 1) Serie temporal
GET `/timeseries`

Query:
- `projetoId` ou `formVersionId` (obrigatorio)
- `start` (opcional, data ISO)
- `end` (opcional, data ISO)
- `status` (opcional: STARTED | COMPLETED | ABANDONED)
- `interval` (opcional: day | week | month, default day)
- `dateField` (opcional: createdAt | startedAt | submittedAt | completedAt, default createdAt)

Resposta:
```json
{ "data": [ { "bucket": "2026-01-01T00:00:00.000Z", "count": 42 } ] }
```

## 2) Distribuicao por valor
GET `/distribution`

Query:
- `fieldId` ou `fieldName` (obrigatorio)
- `formVersionId` ou `projetoId` (obrigatorio quando usar fieldName)
- `valueType` (opcional: string | number | boolean | date, default string)
- `limit` (opcional, default 50, max 200)
- `start`, `end`, `status`, `projetoId`, `formVersionId` (opcionais)

Resposta:
```json
{ "data": [ { "value": "sim", "count": 120 } ] }
```

## 3) Estatisticas numericas
GET `/number-stats`

Query:
- `fieldId` (obrigatorio)
- `projetoId` ou `formVersionId` (obrigatorio)
- `start`, `end`, `status` (opcionais)

Resposta:
```json
{ "data": { "count": 90, "min": 1, "max": 10, "avg": 4.5 } }
```

## 4) Funil por status
GET `/status-funnel`

Query:
- `projetoId` ou `formVersionId` (obrigatorio)
- `start`, `end` (opcionais)

Resposta:
```json
{ "data": [ { "status": "STARTED", "count": 200 }, { "status": "COMPLETED", "count": 150 } ] }
```

## 5) Relatorio geral do projeto
GET `/project-report`

Query:
- `projetoId` ou `formVersionId` (obrigatorio)
- `formId` (opcional)
- `formIds` (opcional, lista separada por virgula ou repetindo query)
- `dateField` (opcional: createdAt | startedAt | submittedAt | completedAt, default createdAt)
- `start`, `end` (opcionais)
- `monthStart`, `monthEnd`, `dayStart`, `dayEnd` (opcionais)
- `status` (opcional: STARTED | COMPLETED | ABANDONED)
- `limitTopForms` (opcional, default 10, max 200)

Resposta:
```json
{
  "data": {
    "cards": {
      "totalOpinions": 60,
      "totalComplaints": 10,
      "totalPraise": 30,
      "totalSuggestions": 20,
      "totalResponses": 120,
      "totalOpinionFormResponses": 60,
      "totalCompleted": 90,
      "totalStarted": 20,
      "totalAbandoned": 10,
      "completionRate": 75
    },
    "lineByMonth": [{ "label": "2026-01", "value": 50 }],
    "lineByDay": [{ "label": "2026-01-15", "value": 5 }],
    "responsesByForm": [{ "formId": 1, "label": "Pesquisa NPS", "value": 42 }],
    "statusFunnel": [{ "status": "COMPLETED", "count": 90 }]
  }
}
```

## 6) Filtros dinamicos por formulario
GET `/form-filters`

Query:
- `projetoId` ou `formVersionId` (obrigatorio)
- `formId` (opcional)
- `formIds` (opcional, lista separada por virgula ou repetindo query)
- `dateField` (opcional: createdAt | startedAt | submittedAt | completedAt, default createdAt)
- `start`, `end`, `status` (opcionais)
- `limitValuesPerField` (opcional, default 30, max 200)

Resposta:
```json
{
  "data": {
    "dateField": "createdAt",
    "dateRange": { "min": "2026-02-01T00:00:00.000Z", "max": "2026-02-26T23:59:59.999Z" },
    "forms": [
      {
        "formId": 3,
        "formName": "Formulario de Opiniao",
        "formVersionId": 7,
        "fields": [
          {
            "fieldId": 13,
            "name": "tipo_opiniao",
            "label": "Tipo de opiniao",
            "suggestedFilter": "multi-select",
            "values": [{ "value": "Reclamacao", "count": 12 }]
          }
        ]
      }
    ]
  }
}
```
