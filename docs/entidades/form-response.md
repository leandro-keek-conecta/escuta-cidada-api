# Resposta de Formulario (FormResponse)

## Funcionalidade
- Registrar respostas de formularios e seus campos.

## Relacionamentos
- FormResponse -> FormVersion (obrigatorio).
- FormResponse -> Projeto (obrigatorio).
- FormResponse -> User (opcional).
- FormResponse -> FormResponseField (campos verticais).

## Quando pode ou nao pode ser criado
- Pode: `formVersionId` e `projetoId` existentes.
- Nao pode: `formVersionId` inexistente; `projetoId` inexistente; `fields` invalidos pelo `schema` da versao.

## Restricoes
- `fields` e validado pelo `formVersion.schema` (nao pela tabela `FormField`).
- Tipos suportados no schema: `text`, `email`, `number`, `date`, `boolean`.
- Regras suportadas no schema: `min`, `max`, `regex`.
- Se `fields` for enviado, os campos da resposta sao recriados.
- Status inferido:
  - Se `status` nao for enviado e houver `fields` ou `submittedAt/completedAt`, o status vira `COMPLETED`.
  - Caso contrario, `STARTED`.

## Criacao em conjunto
- Pode criar junto `fields` (gera `FormResponseField`).

## Rotas
### POST /escuta-cidada-api/form-response/create
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
POST /escuta-cidada-api/form-response/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "formVersionId": 3,
  "projetoId": 10,
  "userId": 1,
  "ip": "192.168.1.10",
  "userAgent": "Mozilla/5.0",
  "status": "COMPLETED",
  "startedAt": "2026-01-29T12:00:00.000Z",
  "completedAt": "2026-01-29T12:10:00.000Z",
  "submittedAt": "2026-01-29T12:10:00.000Z",
  "source": "web",
  "channel": "site",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "campanha-2026",
  "deviceType": "desktop",
  "os": "Windows",
  "browser": "Chrome",
  "locale": "pt-BR",
  "timezone": "America/Sao_Paulo",
  "metadata": { "sessionId": "abc123", "extra": true },
  "fields": {
    "opiniao": "Gostei do atendimento",
    "email": "user@exemplo.com",
    "idade": 32,
    "bairro": "Centro",
    "deseja_contato": true,
    "data_visita": "2026-01-20"
  }
}
```

**Exemplo de resposta**
```json
{ "data": { "id": 100, "formVersionId": 3, "projetoId": 10, "status": "COMPLETED" } }
```

### GET /escuta-cidada-api/form-response/list?formVersionId=
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
GET /escuta-cidada-api/form-response/list?formVersionId=3
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{
  "data": [
    { "id": 100, "formVersionId": 3, "projetoId": 10, "status": "COMPLETED" },
    { "id": 101, "formVersionId": 3, "projetoId": 10, "status": "STARTED" }
  ]
}
```

### PATCH /escuta-cidada-api/form-response/update/:id
- Auth: sim (ADMIN ou SUPERADMIN)
- Regra: se `fields` for enviado, substitui todos os campos da resposta.

**Exemplo de uso**
```
PATCH /escuta-cidada-api/form-response/update/100
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "COMPLETED",
  "completedAt": "2026-01-29T12:10:00.000Z",
  "submittedAt": "2026-01-29T12:10:00.000Z",
  "fields": {
    "opiniao": "Atendimento excelente",
    "email": "user@exemplo.com",
    "idade": 33,
    "bairro": "Zona Sul",
    "deseja_contato": false,
    "data_visita": "2026-01-22"
  }
}
```

**Exemplo de resposta**
```json
{ "data": { "id": 100, "formVersionId": 3, "projetoId": 10, "status": "COMPLETED" } }
```

### DELETE /escuta-cidada-api/form-response/delete/:id
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
DELETE /escuta-cidada-api/form-response/delete/100
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "message": "Resposta deletada" }
```

### GET /escuta-cidada-api/form-response/opinions
- Auth: sim (ADMIN ou SUPERADMIN)
- Query:
  - `projetoId` (obrigatorio)
  - `start`, `end` (opcionais, data ISO)
  - `limit` (opcional, default 200, max 500)
  - `offset` (opcional, default 0)
  - `fieldName` (opcional, default "opiniao")

**Exemplo de uso**
```
GET /escuta-cidada-api/form-response/opinions?projetoId=5&start=2025-01-29&end=2026-01-29&limit=200
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{
  "data": {
    "total": 120,
    "limit": 200,
    "offset": 0,
    "items": [
      { "responseId": 100, "value": "Gostei do atendimento", "createdAt": "2026-01-29T12:10:00.000Z" }
    ]
  }
}
```

### GET /escuta-cidada-api/form-response/raw
- Auth: sim (ADMIN ou SUPERADMIN)
- Query:
  - `projetoId` (obrigatorio)
  - `formVersionId` (opcional)
  - `start`, `end` (opcionais, data ISO)
  - `limit` (opcional, default 200, max 500)
  - `offset` (opcional, default 0)
  - `select` (opcional, lista separada por virgula com nomes de campos do formulario)

**Exemplo de uso**
```
GET /escuta-cidada-api/form-response/raw?projetoId=5&start=2025-01-29&end=2026-01-29&limit=50
Authorization: Bearer <token>
```

**Exemplo de resposta (resumo)**
```json
{
  "data": {
    "total": 120,
    "limit": 50,
    "offset": 0,
    "items": [
      {
        "id": 100,
        "projetoId": 5,
        "formVersionId": 3,
        "status": "COMPLETED",
        "userId": 1,
        "createdAt": "2026-01-29T12:00:00.000Z",
        "fields": [ { "fieldName": "opiniao", "value": "Texto..." } ],
        "user": { "id": 1, "email": "user@exemplo.com" },
        "projeto": { "id": 5, "name": "Projeto X" }
      }
    ]
  }
}
```

**Exemplo de uso com select**
```
GET /escuta-cidada-api/form-response/raw?projetoId=5&select=nome,telefone,opiniao,texto_opiniao
Authorization: Bearer <token>
```

**Exemplo de resposta (select)**
```json
{
  "data": {
    "total": 120,
    "limit": 200,
    "offset": 0,
    "items": [
      {
        "nome": "Maria Silva",
        "telefone": "99999-9999",
        "opiniao": "Saude",
        "texto_opiniao": "Gostei do atendimento"
      }
    ]
  }
}
```
