# Formulario (Form)

## Funcionalidade
- Criar e gerenciar formularios de um projeto.

## Relacionamentos
- Form -> Projeto (obrigatorio).
- Form -> FormVersion.

## Quando pode ou nao pode ser criado
- Pode: `projetoId` existente e `name` unico no projeto.
- Nao pode: `projetoId` inexistente; `name` duplicado no mesmo projeto.

## Restricoes
- `name` obrigatorio.
- `description` opcional.
- `create` sempre cria a versao `1`.
- `initialVersion` define `schema`, `isActive` e `fields` da versao 1.
- Em `update`, se `versions` for enviado, substitui todas as versoes.

## Criacao em conjunto
- Pode criar Form com `initialVersion` e `fields`.
- Pode criar Form junto de Projeto (campo `forms`).

## Rotas
### POST /escuta-cidada-api/form/create
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
POST /escuta-cidada-api/form/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Pesquisa de Opiniao",
  "description": "Form principal",
  "projetoId": 10,
  "initialVersion": {
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
}
```

**Exemplo de resposta**
```json
{
  "message": "Successfully created form",
  "data": { "id": 1, "name": "Pesquisa de Opiniao", "projetoId": 10 }
}
```

### GET /escuta-cidada-api/form/list?projetoId=
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
GET /escuta-cidada-api/form/list?projetoId=10
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{
  "message": "Successfully listed forms",
  "data": [
    { "id": 1, "name": "Pesquisa de Opiniao", "projetoId": 10 },
    { "id": 2, "name": "Pesquisa de Satisfacao", "projetoId": 10 }
  ]
}
```

### PATCH /escuta-cidada-api/form/update/:id
- Auth: sim (ADMIN ou SUPERADMIN)
- Regra: se `versions` for enviado, substitui todas as versoes.

**Exemplo de uso**
```
PATCH /escuta-cidada-api/form/update/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Pesquisa de Opiniao 2026",
  "description": "Form atualizado",
  "projetoId": 10,
  "versions": [
    {
      "version": 2,
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
}
```

**Exemplo de resposta**
```json
{
  "message": "Successfully updated form",
  "data": { "id": 1, "name": "Pesquisa de Opiniao 2026", "projetoId": 10 }
}
```

### DELETE /escuta-cidada-api/form/delete/:id
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
DELETE /escuta-cidada-api/form/delete/1
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "message": "Successfully deleted form" }
```
