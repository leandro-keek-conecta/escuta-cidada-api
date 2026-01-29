# Metricas de FormResponse

## Funcionalidade
- Consultas agregadas e analiticas de respostas de formulario.

## Relacionamentos
- Baseado em FormResponse e FormResponseField.

## Quando pode ou nao pode ser criado
- Nao se aplica (nao cria entidade).

## Restricoes
- Necessario `projetoId` ou `formVersionId` em quase todas as rotas.
- `distribution` exige `fieldId` ou `fieldName`.
- `fieldName` exige `projetoId` ou `formVersionId`.
- `limit` max 200.

## Criacao em conjunto
- Nenhuma.

## Base
- `/escuta-cidada-api/form-response/metrics`

## Rotas
### GET /timeseries
- Auth: sim (ADMIN ou SUPERADMIN)
- Query:
  - `projetoId` ou `formVersionId` (obrigatorio)
  - `start`, `end` (opcionais)
  - `status` (STARTED | COMPLETED | ABANDONED)
  - `interval` (day | week | month, default day)
  - `dateField` (createdAt | submittedAt | completedAt | startedAt, default createdAt)

**Exemplo de uso**
```
GET /escuta-cidada-api/form-response/metrics/timeseries?projetoId=10&interval=day&dateField=createdAt
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "data": [ { "bucket": "2026-01-01T00:00:00.000Z", "count": 42 } ] }
```

### GET /distribution
- Auth: sim (ADMIN ou SUPERADMIN)
- Query:
  - `fieldId` ou `fieldName` (obrigatorio)
  - `formVersionId` ou `projetoId` (obrigatorio quando usar fieldName)
  - `valueType` (string | number | boolean | date, default string)
  - `limit` (default 50, max 200)
  - `start`, `end`, `status` (opcionais)

**Exemplo de uso**
```
GET /escuta-cidada-api/form-response/metrics/distribution?fieldName=bairro&projetoId=10&valueType=string&limit=50
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "data": [ { "value": "Centro", "count": 120 } ] }
```

### GET /number-stats
- Auth: sim (ADMIN ou SUPERADMIN)
- Query:
  - `fieldId` (obrigatorio)
  - `projetoId` ou `formVersionId` (obrigatorio)
  - `start`, `end`, `status` (opcionais)

**Exemplo de uso**
```
GET /escuta-cidada-api/form-response/metrics/number-stats?fieldId=20&projetoId=10
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "data": { "count": 90, "min": 1, "max": 10, "avg": 4.5 } }
```

### GET /status-funnel
- Auth: sim (ADMIN ou SUPERADMIN)
- Query:
  - `projetoId` ou `formVersionId` (obrigatorio)
  - `start`, `end` (opcionais)

**Exemplo de uso**
```
GET /escuta-cidada-api/form-response/metrics/status-funnel?formVersionId=3
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "data": [ { "status": "STARTED", "count": 200 }, { "status": "COMPLETED", "count": 150 } ] }
```

### GET /report
- Auth: sim (ADMIN ou SUPERADMIN)
- Query:
  - `projetoId` ou `formVersionId` (obrigatorio)
  - `dateField` (createdAt | submittedAt | completedAt | startedAt)
  - `start`, `end` (opcionais)
  - `monthStart`, `monthEnd` (opcionais)
  - `dayStart`, `dayEnd` (opcionais)
  - `limitTopThemes`, `limitTopNeighborhoods`, `limitDistribution` (opcionais)

**Campos usados no report**
- `opiniao`, `bairro`, `genero`, `campanha`, `tipo_opiniao`, `ano_nascimento`.

**Exemplo de uso**
```
GET /escuta-cidada-api/form-response/metrics/report?projetoId=10&dateField=createdAt&limitTopThemes=10
Authorization: Bearer <token>
```

**Exemplo de resposta (resumo)**
```json
{
  "data": {
    "cards": {
      "totalOpinions": 120,
      "totalComplaints": 10,
      "totalPraise": 80,
      "totalSuggestions": 30
    },
    "lineByMonth": [{ "label": "2026-01", "value": 50 }],
    "lineByDay": [{ "label": "2026-01-15", "value": 5 }],
    "topBairros": [{ "label": "Centro", "value": 12 }],
    "opinionsByGender": [{ "label": "Feminino", "value": 40 }],
    "opinionsByAge": [{ "label": "26-35", "value": 22 }],
    "campaignAcceptance": [{ "label": "Campanha A", "value": 12 }],
    "tipoOpiniao": [{ "label": "Elogio", "value": 80 }],
    "topTemas": [{ "id": 1, "tema": "Atendimento", "total": 20 }],
    "statusFunnel": [{ "status": "COMPLETED", "count": 100 }]
  }
}
```
