# Relatorio de funcionalidades atuais - Escuta Cidada API

Este documento descreve o que o sistema faz hoje, com base no codigo-fonte atual. O foco e mapear as funcoes/funcionalidades e as rotas publicas da API.

## Visao geral
- API em Fastify + TypeScript, com Prisma/PostgreSQL.
- Prefixo base de todas as rotas: `/escuta-cidada-api`.
- Autenticacao via JWT (access/refresh) e controle de acesso por role.
- Dominio principal: usuarios, projetos, chats automatizados, formularios e respostas.
- Integracoes: Power BI (token de embed) e n8n (reset de senha).

## Autenticacao e autorizacao
- Login gera `accessToken` e `refreshToken`, com expiracao configurada em `AUTH_JWT_EXP` e `AUTH_JWT_REFRESH_EXP`.
- Middleware `AuthMiddleware.required` exige header `Authorization: Bearer <token>`.
- Existe bypass por `AUTH_ADMIN_TOKEN` (se o token do header for igual, o usuario e tratado como admin).
- Roles suportadas: `USER`, `ADMIN`, `SUPERADMIN`.
- Nivel de acesso a projeto: `FULL_ACCESS`, `AUTOMATIONS_ONLY`, `DASH_ONLY`.
- Funcoes auxiliares para validar role e acesso por projeto existem, mas nao aparecem aplicadas nas rotas atuais.

## Modelos de dados (Prisma)
- User: email, senha (hash), nome, role, projetos vinculados, telas ocultas e tokens de reset.
- Projeto: slug, nome, cliente, descricao, logo, cor, Power BI (reportId/groupId), ativo, configs visuais, chats e formularios.
- ProjetoUser: vinculo User x Projeto com nivel de acesso.
- AutomationChat: slug, titulo, descricao, url, ativo, projeto associado.
- PasswordResetToken: token hasheado, expiracao e flag de uso.
- DashHiddenScreen: tela oculta por usuario/projeto.
- Form: pertence a um projeto, possui versoes.
- FormVersion: schema JSON, status ativo, campos e respostas.
- FormField: definicao do campo (nome, label, tipo, requerido, opcoes, ordem).
- FormResponse: respostas por versao e projeto, metadados (user/ip/userAgent).
- FormResponseField: armazenamento vertical dos campos da resposta.

## Funcionalidades e rotas (mapeamento completo)

### Healthcheck
- `GET /escuta-cidada-api/ping`
  - Retorna `pong`.

### Autenticacao
- `POST /escuta-cidada-api/auth/login`
  - Body: `{ email, password }`.
  - Retorna tokens JWT e dados do usuario com projetos vinculados, incluindo `hiddenTabs` por projeto.

### Usuarios (requer JWT + role admin)
- `POST /escuta-cidada-api/user/create`
  - Body: `{ email, password, name, role, projetos? }`.
  - `projetos`: lista de `{ id, access?, hiddenTabs? }`.
  - Cria usuario e opcionalmente vincula a projetos e telas ocultas.
- `PATCH /escuta-cidada-api/user/update/:id`
  - Body: `{ email?, name?, role?, projetos? }`.
  - Substitui os vinculos de projeto quando `projetos` e informado.
  - Atualiza `hiddenTabs` quando enviados.
- `GET /escuta-cidada-api/user/list`
  - Retorna lista de usuarios (senha removida).
- `DELETE /escuta-cidada-api/user/delete/:id`
  - Remove o usuario.

#### Recuperacao de senha (publico)
- `POST /escuta-cidada-api/user/forgot-password`
  - Body: `{ email }`.
  - Gera token, armazena hash e chama webhook do n8n para enviar email.
- `GET /escuta-cidada-api/user/reset-password/validate`
  - Query: `uid`, `token`.
  - Valida token sem alterar senha.
- `POST /escuta-cidada-api/user/reset-password`
  - Body: `{ uid, token, password }`.
  - Valida token, atualiza senha e marca token como usado.

### Projetos (requer JWT)
- `POST /escuta-cidada-api/projeto/create`
  - Body: `slug`, `name`, `cliente?`, `descricaoCurta?`, `logoUrl?`, `reportId?`, `groupId?`, `corHex?`, `ativo?`,
    `themeConfig?`, `heroConfig?`, `users?`, `chats?`, `forms?`, `hiddenScreens?`.
  - Permite criar projeto com relacionamentos aninhados (usuarios, chats e forms com versoes/campos).
- `GET /escuta-cidada-api/projeto/list`
  - Retorna projetos com relacoes (usuarios, chats, forms, versoes, respostas, telas ocultas).
- `PATCH /escuta-cidada-api/projeto/update/:id`
  - Atualiza dados e substitui relacionamentos enviados (`users`, `chats`, `forms`, `hiddenScreens`).
- `DELETE /escuta-cidada-api/projeto/delete/:id`
  - Remove o projeto.

### Automation Chat (requer JWT + role admin)
- `POST /escuta-cidada-api/automationchat/create`
  - Body: `{ slug, title, description, url, isActive?, projetoId }`.
  - Valida slug unico e projeto existente.
- `GET /escuta-cidada-api/automationchat/list/:projectId`
  - Lista automacoes do projeto.
- `PATCH /escuta-cidada-api/automationchat/update/:id`
  - Body parcial de `slug`, `title`, `description`, `url`, `isActive`, `projetoId`.
  - Mantem slug unico.
- `DELETE /escuta-cidada-api/automationchat/delete/:id`
  - Remove automacao.

### Power BI (requer JWT)
- `GET /escuta-cidada-api/powerbi/embed-token`
  - Gera token de embed via Microsoft (ROPC) usando variaveis `POWER_BI_*`.

### Formularios (requer JWT + role admin)
- `POST /escuta-cidada-api/form/create`
  - Body: `{ name, description?, projetoId, initialVersion? }`.
  - Cria formulario e ja cria a versao 1 com campos opcionais.
- `GET /escuta-cidada-api/form/list?projetoId=`
  - Lista formularios (filtra por projeto se informado).
- `PATCH /escuta-cidada-api/form/update/:id`
  - Atualiza nome/descricao/projeto e substitui versoes quando `versions` e enviado.
- `DELETE /escuta-cidada-api/form/delete/:id`
  - Remove formulario.

### Versoes de formulario (requer JWT + role admin)
- `POST /escuta-cidada-api/form-version/create`
  - Body: `{ formId, version, schema?, isActive?, fields? }`.
- `GET /escuta-cidada-api/form-version/list?formId=`
  - Lista versoes (filtra por form).
- `PATCH /escuta-cidada-api/form-version/update/:id`
  - Atualiza versao/schema/ativo e substitui campos quando enviados.
- `DELETE /escuta-cidada-api/form-version/delete/:id`
  - Remove versao.

### Campos de formulario (requer JWT + role admin)
- `POST /escuta-cidada-api/form-field/create`
  - Body: `{ formVersionId, name, label, type, required?, options?, ordem }`.
- `PATCH /escuta-cidada-api/form-field/update/:id`
  - Atualiza propriedades do campo e permite mover para outra versao.
- `DELETE /escuta-cidada-api/form-field/delete/:id`
  - Remove campo.
- `GET /escuta-cidada-api/form-field/list`
  - Lista todos os campos.

### Respostas de formulario (requer JWT + role admin)
- `POST /escuta-cidada-api/form-response/create`
  - Body: `{ formVersionId, projetoId, userId?, ip?, userAgent?, fields? }`.
  - Valida `fields` dinamicamente usando `formVersion.schema` e salva cada campo em `FormResponseField`.
- `GET /escuta-cidada-api/form-response/list?formVersionId=`
  - Lista respostas da versao informada.
- `PATCH /escuta-cidada-api/form-response/update/:id`
  - Atualiza metadados e/ou `fields` (revalidados pelo schema dinamico).
  - Substitui todos os campos se `fields` for enviado.
- `DELETE /escuta-cidada-api/form-response/delete/:id`
  - Remove a resposta.

### Formularios publicos (sem autenticacao)
- `GET /escuta-cidada-api/public/projetos/:projetoSlug/forms/id/:formId`
  - Retorna dados publicos do projeto, do form e da versao ativa com campos.
  - Bloqueia projeto inativo.

## Funcoes e utilitarios internos
- `createDynamicSchema`: gera validacao Zod baseada em um array de campos com `type`, `required`, `min`, `max`, `regex`.
  - Tipos suportados: `text`, `email`, `number`, `date`, `boolean`.
- `getPowerBIAccessToken`: utilitario para obter access token do Power BI (nao usado diretamente nas rotas).
- `PasswordResetTokenRepository`: controla tokens de reset (criar, invalidar, validar e marcar usado).
- `UserRepository.replaceHiddenScreens`: grava telas ocultas por usuario/projeto.

## Observacoes importantes
- A validacao dinamica de respostas usa `formVersion.schema`, nao a tabela `FormField`.
- Existe schema `submitFormResponseSchema` para submissao publica, mas nao ha rota conectada a ele.
- `AuthMiddleware.requireProjectAccess` existe, mas nao esta aplicado nas rotas atuais.
