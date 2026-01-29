# Automation Chat

## Funcionalidade
- Gerenciar chats automatizados vinculados a um projeto.

## Relacionamentos
- AutomationChat -> Projeto (obrigatorio).

## Quando pode ou nao pode ser criado
- Pode: `slug` unico e `projetoId` existente.
- Nao pode: `slug` duplicado; `projetoId` inexistente.

## Restricoes
- `slug` salvo em lowercase.
- `url` deve ser URL valida.

## Criacao em conjunto
- Pode ser criado junto em `Projeto.create` ou `Projeto.update` (campo `chats`).

## Rotas
### POST /escuta-cidada-api/automationchat/create
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
POST /escuta-cidada-api/automationchat/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "slug": "agendamento",
  "title": "Agendamento",
  "description": "Fluxo de agendamento",
  "url": "https://chat.exemplo.com/agendamento",
  "isActive": true,
  "projetoId": 10
}
```

**Exemplo de resposta**
```json
{
  "message": "Successfully created Automation Chat",
  "data": {
    "id": "ckx123",
    "slug": "agendamento",
    "title": "Agendamento",
    "description": "Fluxo de agendamento",
    "url": "https://chat.exemplo.com/agendamento",
    "isActive": true,
    "projetoId": 10
  }
}
```

### GET /escuta-cidada-api/automationchat/list/:projectId
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
GET /escuta-cidada-api/automationchat/list/10
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{
  "message": "Successfully retrieved Automation Chats",
  "data": [
    { "id": "ckx123", "slug": "agendamento", "title": "Agendamento", "isActive": true },
    { "id": "ckx456", "slug": "triagem", "title": "Triagem", "isActive": false }
  ]
}
```

### PATCH /escuta-cidada-api/automationchat/update/:id
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
PATCH /escuta-cidada-api/automationchat/update/ckx123
Authorization: Bearer <token>
Content-Type: application/json

{
  "slug": "agendamento",
  "title": "Agendamento Atualizado",
  "description": "Fluxo atualizado",
  "url": "https://chat.exemplo.com/agendamento-v2",
  "isActive": true,
  "projetoId": 10
}
```

**Exemplo de resposta**
```json
{
  "message": "Successfully updated Automation Chat",
  "data": {
    "id": "ckx123",
    "slug": "agendamento",
    "title": "Agendamento Atualizado",
    "description": "Fluxo atualizado",
    "url": "https://chat.exemplo.com/agendamento-v2",
    "isActive": true,
    "projetoId": 10
  }
}
```

### DELETE /escuta-cidada-api/automationchat/delete/:id
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
DELETE /escuta-cidada-api/automationchat/delete/ckx123
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "message": "Successfully deleted Automation Chat" }
```
