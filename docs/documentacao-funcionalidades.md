# Documentacao de funcionalidades - Indice

Este indice organiza a documentacao por entidade. Cada arquivo descreve:
- Funcionalidade
- Relacionamentos
- Quando pode ou nao ser criada
- Restricoes
- O que pode ser criado junto
- Rotas com exemplos de uso

## Convencoes gerais
- Prefixo base das rotas: `/escuta-cidada-api`.
- Auth: `Authorization: Bearer <token>`.
- Roles: `USER`, `ADMIN`, `SUPERADMIN`.
- Nivel de acesso por projeto: `FULL_ACCESS`, `AUTOMATIONS_ONLY`, `DASH_ONLY`.
- Datas em ISO 8601 (`2026-01-29T12:00:00.000Z`).
- IDs numericos para User/Projeto/Form/FormVersion/FormField/FormResponse.
- `AutomationChat.id` e string (cuid).
- Updates com listas (users, chats, forms, versions, fields, hiddenScreens) substituem tudo (deleteMany + create).
- Erros: parte das rotas retorna `{ error: { code, message, details? } }` e outras `{ message, details? }`.

## Entidades e funcionalidades
- `docs/entidades/healthcheck.md`
- `docs/entidades/auth.md`
- `docs/entidades/user.md`
- `docs/entidades/projeto.md`
- `docs/entidades/automation-chat.md`
- `docs/entidades/form.md`
- `docs/entidades/form-version.md`
- `docs/entidades/form-field.md`
- `docs/entidades/form-response.md`
- `docs/entidades/form-response-metrics.md`
- `docs/entidades/powerbi.md`
- `docs/entidades/public-form.md`
