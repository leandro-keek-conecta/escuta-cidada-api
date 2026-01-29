# Autenticacao

## Funcionalidade
- Autenticar usuario e retornar tokens JWT (access e refresh) e dados do usuario.

## Relacionamentos
- Usuario (User) e seus projetos vinculados.

## Quando pode ou nao pode ser criado
- Pode: usuario existente com senha valida.
- Nao pode: usuario nao encontrado ou senha invalida.

## Restricoes
- `email`: obrigatorio, max 64 caracteres.
- `password`: obrigatorio, max 1024 caracteres.

## Criacao em conjunto
- Nenhuma (nao cria entidades, apenas autentica).

## Rotas
### POST /escuta-cidada-api/auth/login
- Auth: nao
- Body:
  - `email` (string)
  - `password` (string)

**Exemplo de uso**
```
POST /escuta-cidada-api/auth/login
Content-Type: application/json

{
  "email": "admin@exemplo.com",
  "password": "senha-segura"
}
```

**Exemplo de resposta**
```json
{
  "accessToken": "<jwt>",
  "accessTokenExpireIn": "2h",
  "refreshToken": "<jwt>",
  "refreshTokenExpireIn": "2h",
  "user": {
    "id": 1,
    "name": "Admin",
    "email": "admin@exemplo.com",
    "role": "ADMIN",
    "createdAt": "2026-01-10T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:00:00.000Z",
    "projetos": [
      {
        "id": 10,
        "nome": "Projeto A",
        "url": "https://cdn.exemplo.com/logo.png",
        "corHex": "#FFAA00",
        "reportId": "rpt-123",
        "groupId": "grp-456",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-05T00:00:00.000Z",
        "assignedAt": "2026-01-10T10:00:00.000Z",
        "access": "FULL_ACCESS",
        "hiddenTabs": ["dashboard", "relatorios"]
      }
    ]
  }
}
```
