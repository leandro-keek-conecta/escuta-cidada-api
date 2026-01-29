# Usuario (User)

## Funcionalidade
- Cadastro, atualizacao, listagem e remocao de usuarios.
- Fluxo de recuperacao e redefinicao de senha.

## Relacionamentos
- User <-> Projeto via `ProjetoUser` (nivel de acesso por projeto).
- User -> DashHiddenScreen (telas ocultas por projeto).
- User -> FormResponse (respostas submetidas por usuario).
- User -> PasswordResetToken (tokens de reset de senha).

## Quando pode ou nao pode ser criado
- Pode: email unico e senha valida (min 6).
- Nao pode: email ja cadastrado; projetos com IDs inexistentes; violacao de constraints no banco.

## Restricoes
- `role`: `USER | ADMIN | SUPERADMIN`.
- `projetos[].access`: `FULL_ACCESS | AUTOMATIONS_ONLY | DASH_ONLY`.
- `password`: minimo 6 caracteres.

## Criacao em conjunto
- Pode criar User com vinculos a projetos (`projetos`) e telas ocultas (`hiddenTabs`).
- `hiddenTabs` cria/atualiza registros de `DashHiddenScreen`.

## Rotas
### POST /escuta-cidada-api/user/create
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
POST /escuta-cidada-api/user/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@exemplo.com",
  "password": "minha-senha-segura",
  "name": "Usuario",
  "role": "USER",
  "projetos": [
    {
      "id": 10,
      "access": "FULL_ACCESS",
      "hiddenTabs": ["dash", "relatorios"]
    },
    {
      "id": 20,
      "access": "DASH_ONLY",
      "hiddenTabs": ["configuracoes"]
    }
  ]
}
```

**Exemplo de resposta**
```json
{
  "message": "Successfully created User",
  "data": {
    "id": 1,
    "email": "user@exemplo.com",
    "name": "Usuario",
    "role": "USER",
    "projetos": [
      {
        "projeto": { "id": 10, "name": "Projeto A" },
        "access": "FULL_ACCESS",
        "assignedAt": "2026-01-10T10:00:00.000Z"
      }
    ],
    "hiddenScreens": [
      { "projetoId": 10, "screenName": "dash" },
      { "projetoId": 10, "screenName": "relatorios" }
    ],
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-01-10T10:00:00.000Z"
  }
}
```

### PATCH /escuta-cidada-api/user/update/:id
- Auth: sim (ADMIN ou SUPERADMIN)
- Regra: se `projetos` for enviado, substitui todos os vinculos do usuario.

**Exemplo de uso**
```
PATCH /escuta-cidada-api/user/update/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user.novo@exemplo.com",
  "name": "Usuario Atualizado",
  "role": "ADMIN",
  "projetos": [
    { "id": 10, "access": "DASH_ONLY", "hiddenTabs": ["dash"] },
    { "id": 30, "access": "FULL_ACCESS", "hiddenTabs": [] }
  ]
}
```

**Exemplo de resposta**
```json
{ "message": "Successfully Updated User" }
```

### GET /escuta-cidada-api/user/list
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
GET /escuta-cidada-api/user/list
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{
  "message": "Successfully retrieved Users",
  "data": [
    {
      "id": 1,
      "email": "user@exemplo.com",
      "name": "Usuario",
      "role": "USER",
      "projetos": [{ "projeto": { "id": 10, "name": "Projeto A" }, "access": "FULL_ACCESS" }],
      "hiddenScreens": [],
      "createdAt": "2026-01-10T10:00:00.000Z",
      "updatedAt": "2026-01-10T10:00:00.000Z"
    },
    {
      "id": 2,
      "email": "admin@exemplo.com",
      "name": "Admin",
      "role": "ADMIN",
      "projetos": [],
      "hiddenScreens": [],
      "createdAt": "2026-01-05T10:00:00.000Z",
      "updatedAt": "2026-01-05T10:00:00.000Z"
    }
  ]
}
```

### DELETE /escuta-cidada-api/user/delete/:id
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
DELETE /escuta-cidada-api/user/delete/1
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "message": "Successfully deleted User", "data": null }
```

### POST /escuta-cidada-api/user/forgot-password
- Auth: nao

**Exemplo de uso**
```
POST /escuta-cidada-api/user/forgot-password
Content-Type: application/json

{ "email": "user@exemplo.com" }
```

**Exemplo de resposta**
```json
{ "message": "E-mail de atualizacao enviado com sucesso." }
```

### GET /escuta-cidada-api/user/reset-password/validate
- Auth: nao
- Query: `uid`, `token`

**Exemplo de uso**
```
GET /escuta-cidada-api/user/reset-password/validate?uid=1&token=token-recebido
```

**Exemplo de resposta**
```json
{ "valid": true }
```

### POST /escuta-cidada-api/user/reset-password
- Auth: nao

**Exemplo de uso**
```
POST /escuta-cidada-api/user/reset-password
Content-Type: application/json

{
  "uid": 1,
  "token": "token-recebido",
  "password": "nova-senha"
}
```

**Exemplo de resposta**
```json
{ "message": "Senha redefinida com sucesso" }
```
