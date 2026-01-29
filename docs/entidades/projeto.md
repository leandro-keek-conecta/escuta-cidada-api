# Projeto (Projeto)

## Funcionalidade
- Gerenciar projetos do sistema e seus recursos associados (usuarios, chats, formularios, telas ocultas, configuracoes visuais).

## Relacionamentos
- Projeto <-> User via `ProjetoUser` (nivel de acesso).
- Projeto -> AutomationChat.
- Projeto -> Form -> FormVersion -> FormField.
- Projeto -> FormResponse.
- Projeto -> DashHiddenScreen.

## Quando pode ou nao pode ser criado
- Pode: `slug` unico, `name` valido.
- Nao pode: `slug` duplicado; IDs de usuarios inexistentes (falha de FK); violacao de constraints (ex: form name duplicado no mesmo projeto).

## Restricoes
- `slug`: obrigatorio, salvo em lowercase.
- `corHex`: formato `#RRGGBB`.
- `users`: lista de usuarios a vincular.
- `chats.slug`: unico global.
- `forms.name`: unico por projeto.
- `form.versions.version`: unico por form.
- `form.fields.name`: unico por versao.

## Criacao em conjunto
- No `create` e `update`, e possivel criar junto:
  - `users` (vinculos ProjetoUser)
  - `chats` (AutomationChat)
  - `forms` (Form + FormVersion + FormField)
  - `hiddenScreens` (DashHiddenScreen)
- Em `update`, quando `users/chats/forms/hiddenScreens` sao enviados, substituem tudo.

## Rotas
### POST /escuta-cidada-api/projeto/create
- Auth: sim

**Exemplo de uso**
```
POST /escuta-cidada-api/projeto/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "slug": "projeto-a",
  "name": "Projeto A",
  "cliente": "Cliente X",
  "descricaoCurta": "Projeto principal",
  "logoUrl": "https://cdn.exemplo.com/logo.png",
  "reportId": "rpt-123",
  "groupId": "grp-456",
  "corHex": "#FFAA00",
  "ativo": true,
  "themeConfig": { "primary": "#FFAA00", "secondary": "#111111" },
  "heroConfig": { "title": "Bem-vindo", "subtitle": "Projeto A" },
  "users": [{ "id": 1 }, { "id": 2 }],
  "hiddenScreens": [
    { "userId": 1, "screenName": "configuracoes" },
    { "userId": 2, "screenName": "relatorios" }
  ],
  "chats": [
    {
      "slug": "chat-principal",
      "title": "Chat Principal",
      "description": "Fluxo principal",
      "url": "https://chat.exemplo.com/1",
      "isActive": true
    },
    {
      "slug": "chat-secundario",
      "title": "Chat Secundario",
      "description": "Fluxo alternativo",
      "url": "https://chat.exemplo.com/2",
      "isActive": false
    }
  ],
  "forms": [
    {
      "name": "Pesquisa de Opiniao",
      "description": "Form principal",
      "versions": [
        {
          "version": 1,
          "schema": [
            { "name": "opiniao", "type": "text", "required": true, "min": 3, "max": 200 },
            { "name": "email", "type": "email", "required": false },
            { "name": "idade", "type": "number", "required": false, "min": 0, "max": 120 },
            { "name": "bairro", "type": "text", "required": false, "max": 120 },
            { "name": "deseja_contato", "type": "boolean", "required": false },
            { "name": "data_visita", "type": "date", "required": false }
          ],
          "isActive": true,
          "fields": [
            { "name": "opiniao", "label": "Opiniao", "type": "text", "required": true, "options": { "maxChars": 200 }, "ordem": 1 },
            { "name": "email", "label": "Email", "type": "email", "required": false, "options": {}, "ordem": 2 },
            { "name": "idade", "label": "Idade", "type": "number", "required": false, "options": { "min": 0, "max": 120 }, "ordem": 3 },
            { "name": "bairro", "label": "Bairro", "type": "text", "required": false, "options": { "items": ["Centro", "Zona Sul"] }, "ordem": 4 },
            { "name": "deseja_contato", "label": "Deseja contato", "type": "boolean", "required": false, "options": {}, "ordem": 5 },
            { "name": "data_visita", "label": "Data da visita", "type": "date", "required": false, "options": {}, "ordem": 6 }
          ]
        }
      ]
    },
    {
      "name": "Pesquisa de Satisfacao",
      "description": "Form secundario",
      "versions": [
        {
          "version": 1,
          "schema": [
            { "name": "satisfacao", "type": "number", "required": true, "min": 1, "max": 5 },
            { "name": "motivo", "type": "text", "required": false, "max": 200 },
            { "name": "telefone", "type": "text", "required": false, "regex": "^\\\\+?[0-9]{10,15}$" },
            { "name": "idade", "type": "number", "required": false, "min": 0, "max": 120 },
            { "name": "bairro", "type": "text", "required": false, "max": 120 },
            { "name": "data_visita", "type": "date", "required": false }
          ],
          "isActive": true,
          "fields": [
            { "name": "satisfacao", "label": "Satisfacao", "type": "number", "required": true, "options": { "min": 1, "max": 5 }, "ordem": 1 },
            { "name": "motivo", "label": "Motivo", "type": "text", "required": false, "options": {}, "ordem": 2 },
            { "name": "telefone", "label": "Telefone", "type": "text", "required": false, "options": { "mask": "+55" }, "ordem": 3 },
            { "name": "idade", "label": "Idade", "type": "number", "required": false, "options": {}, "ordem": 4 },
            { "name": "bairro", "label": "Bairro", "type": "text", "required": false, "options": { "items": ["Centro", "Zona Norte"] }, "ordem": 5 },
            { "name": "data_visita", "label": "Data da visita", "type": "date", "required": false, "options": {}, "ordem": 6 }
          ]
        }
      ]
    }
  ]
}
```

**Exemplo de resposta**
```json
{
  "message": "Successfully created Projeto",
  "data": { "id": 10, "slug": "projeto-a", "name": "Projeto A", "ativo": true }
}
```

### GET /escuta-cidada-api/projeto/list
- Auth: sim

**Exemplo de uso**
```
GET /escuta-cidada-api/projeto/list
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{
  "message": "Successfully listed projetos",
  "data": [
    { "id": 10, "slug": "projeto-a", "name": "Projeto A", "ativo": true },
    { "id": 20, "slug": "projeto-b", "name": "Projeto B", "ativo": false }
  ]
}
```

### PATCH /escuta-cidada-api/projeto/update/:id
- Auth: sim
- Regra: `users/chats/forms/hiddenScreens` substituem tudo quando enviados.

**Exemplo de uso**
```
PATCH /escuta-cidada-api/projeto/update/10
Authorization: Bearer <token>
Content-Type: application/json

{
  "slug": "projeto-a",
  "name": "Projeto A+",
  "cliente": "Cliente X",
  "descricaoCurta": "Projeto atualizado",
  "reportId": "rpt-789",
  "groupId": "grp-999",
  "corHex": "#00AAFF",
  "logoUrl": "https://cdn.exemplo.com/logo-novo.png",
  "ativo": false,
  "themeConfig": { "primary": "#00AAFF" },
  "heroConfig": { "title": "Novo titulo" },
  "users": [{ "id": 3 }],
  "chats": [
    {
      "slug": "chat-novo",
      "title": "Chat Novo",
      "description": "Novo fluxo",
      "url": "https://chat.exemplo.com/3",
      "isActive": true
    }
  ],
  "forms": [
    {
      "name": "Form A",
      "description": "Form A desc",
      "versions": [
        {
          "version": 2,
          "schema": [
            { "name": "campo1", "type": "text", "required": true, "min": 1, "max": 50 },
            { "name": "campo2", "type": "text", "required": false, "max": 50 },
            { "name": "campo3", "type": "number", "required": false, "min": 0, "max": 10 },
            { "name": "campo4", "type": "date", "required": false },
            { "name": "campo5", "type": "boolean", "required": false },
            { "name": "campo6", "type": "email", "required": false }
          ],
          "isActive": true,
          "fields": [
            { "name": "campo1", "label": "Campo 1", "type": "text", "required": true, "options": {}, "ordem": 1 },
            { "name": "campo2", "label": "Campo 2", "type": "text", "required": false, "options": {}, "ordem": 2 },
            { "name": "campo3", "label": "Campo 3", "type": "number", "required": false, "options": {}, "ordem": 3 },
            { "name": "campo4", "label": "Campo 4", "type": "date", "required": false, "options": {}, "ordem": 4 },
            { "name": "campo5", "label": "Campo 5", "type": "boolean", "required": false, "options": {}, "ordem": 5 },
            { "name": "campo6", "label": "Campo 6", "type": "email", "required": false, "options": {}, "ordem": 6 }
          ]
        }
      ]
    },
    {
      "name": "Form B",
      "description": "Form B desc",
      "versions": [
        {
          "version": 1,
          "schema": [
            { "name": "pergunta1", "type": "text", "required": true, "min": 1, "max": 100 },
            { "name": "pergunta2", "type": "text", "required": false, "max": 100 },
            { "name": "pergunta3", "type": "number", "required": false, "min": 0, "max": 100 },
            { "name": "pergunta4", "type": "date", "required": false },
            { "name": "pergunta5", "type": "boolean", "required": false },
            { "name": "pergunta6", "type": "email", "required": false }
          ],
          "isActive": true,
          "fields": [
            { "name": "pergunta1", "label": "Pergunta 1", "type": "text", "required": true, "options": {}, "ordem": 1 },
            { "name": "pergunta2", "label": "Pergunta 2", "type": "text", "required": false, "options": {}, "ordem": 2 },
            { "name": "pergunta3", "label": "Pergunta 3", "type": "number", "required": false, "options": {}, "ordem": 3 },
            { "name": "pergunta4", "label": "Pergunta 4", "type": "date", "required": false, "options": {}, "ordem": 4 },
            { "name": "pergunta5", "label": "Pergunta 5", "type": "boolean", "required": false, "options": {}, "ordem": 5 },
            { "name": "pergunta6", "label": "Pergunta 6", "type": "email", "required": false, "options": {}, "ordem": 6 }
          ]
        }
      ]
    }
  ],
  "hiddenScreens": [
    { "userId": 3, "screenName": "dash" }
  ]
}
```

**Exemplo de resposta**
```json
{ "message": "Successfully Updated Projeto" }
```

### DELETE /escuta-cidada-api/projeto/delete/:id
- Auth: sim

**Exemplo de uso**
```
DELETE /escuta-cidada-api/projeto/delete/10
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "message": "Successfully deleted User" }
```
