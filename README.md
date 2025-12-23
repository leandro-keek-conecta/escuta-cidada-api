# Escuta Cidada API

API em Fastify + TypeScript usada pelo Escuta Cidadã para autenticacao, gestao de usuarios/projetos, automacoes de chat e integracao com Power BI. Todas as rotas ficam sob o prefixo `/escuta-cidada-api`.

## Stack

- Node.js + Fastify 5 com TypeScript (tsx para desenvolvimento)
- Prisma + PostgreSQL
- JWT para autenticacao e Inversify para injecao de dependencias
- Integracoes: Power BI (token de embed) e n8n para fluxo de reset de senha

## Requisitos

- Node 18+ e npm
- Banco PostgreSQL acessivel
- Credenciais JWT e Power BI configuradas

## Configuracao (.env)

Crie `.env` na raiz com valores reais:

```env
NODE_ENV=dev
PORT=3333
DATABASE_URL=postgresql://usuario:senha@host:porta/banco
ENDPOINT=https://api.exemplo.com

API_HOST=http://localhost:3333
API_ACCESS_CONTROL=true
AUTH_ADMIN_TOKEN=<token_admin_opcional>
AUTH_JWT_SECRET=<jwt_access_secret>
AUTH_JWT_EXP=2h
AUTH_JWT_SECRET_REFRESH=<jwt_refresh_secret>
AUTH_JWT_REFRESH_EXP=2h

STORAGE_LOCAL_TEMP_FOLDER=temp
STORAGE_LOCAL_UPLOAD_FOLDER=data

API_FRONT=http://localhost:3000
N8N_RESET_PASSWORD_WEBHOOK=<url_webhook_n8n>

POWER_BI_CLIENT_ID=<client_id>
POWER_BI_CLIENT_SECRET=<client_secret>
POWER_BI_USERNAME=<usuario>
POWER_BI_PASSWORD=<senha>
```

## Setup

- Instale dependencias: `npm install`
- Gere o client do Prisma: `npx prisma generate`
- Aplique migracoes: `npx prisma migrate dev --name init` (dev) ou `npx prisma migrate deploy` (producao)
- Desenvolvimento: `npm run dev`
- Producao: `npm run build` e depois `npm run start`

## Rotas principais (prefixo /escuta-cidada-api)

- `GET /ping` healthcheck
- Auth: `POST /auth/login` (email, password) -> access/refresh token e dados do usuario/projetos
- Usuarios (JWT + role admin): `POST /user/create`, `PATCH /user/update/:id`, `GET /user/list`, `DELETE /user/delete/:id`
- Recuperacao de senha: `POST /user/forgot-password`, `POST /user/reset-password`, `GET /user/reset-password/validate`
- Projetos (JWT): `POST /projeto/create`, `GET /projeto/list`, `PATCH /projeto/update/:id`, `DELETE /projeto/delete/:id`
- Automation chat (JWT admin): `POST /automationchat/create`, `PATCH /automationchat/update/:id`, `GET /automationchat/list/:projectId`, `DELETE /automationchat/delete/:id`
- Power BI (JWT): `GET /powerbi/embed-token` gera token de embed usando as variaveis `POWER_BI_*`

## Estrutura

- `src/server.ts`: inicializa a aplicacao, conecta ao banco e sobe o Fastify
- `src/app.ts`: configura CORS, formbody, rotas e tratador de erros
- `src/common`: middlewares, container Inversify e rotas compartilhadas
- `src/modules`: dominios da aplicacao (auth, user, projeto, automationchat, powerBI, passwordResetToken)
- `prisma/`: schema Prisma e migracoes

## Scripts npm

- `npm run dev`: modo watch com tsx
- `npm run build`: transpila para `build/`
- `npm run start`: executa a versao compilada
- `npm test`: placeholder (nao ha testes definidos)
