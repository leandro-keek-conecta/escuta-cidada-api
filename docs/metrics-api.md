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
