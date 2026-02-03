# Versao de Formulario (FormVersion)

## Funcionalidade
- Criar e gerenciar versoes de formularios.

## Relacionamentos
- FormVersion -> Form (obrigatorio).
- FormVersion -> FormField.
- FormVersion -> FormResponse.

## Quando pode ou nao pode ser criado
- Pode: `formId` existente e `version` unico para o form.
- Nao pode: `formId` inexistente; `version` duplicada para o mesmo form.

## Restricoes
- `version` inteiro positivo.
- `schema` deve ser um array de definicoes de campos para validacao dinamica.
- `fields` opcional, mas quando enviado substitui todos os campos da versao.

## Criacao em conjunto
- Pode criar junto os `fields` da versao.

## Rotas
### POST /escuta-cidada-api/form-version/create
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
POST /escuta-cidada-api/form-version/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "formId": 1,
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
```

**Exemplo de resposta**
```json
{
  "message": "Successfully created form version",
  "data": { "id": 3, "formId": 1, "version": 2, "isActive": true }
}
```

### GET /escuta-cidada-api/form-version/list?formId=
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
GET /escuta-cidada-api/form-version/list?formId=1
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{
  "message": "Successfully listed form versions",
  "data": [
    { "id": 1, "formId": 1, "version": 1, "isActive": true },
    { "id": 3, "formId": 1, "version": 2, "isActive": true }
  ]
}
```

### PATCH /escuta-cidada-api/form-version/update/:id
- Auth: sim (ADMIN ou SUPERADMIN)
- Regra: se `fields` for enviado, substitui todos os campos.

**Exemplo de uso**
```
PATCH /escuta-cidada-api/form-version/update/3
Authorization: Bearer <token>
Content-Type: application/json

{
  "version": 3,
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
```

**Exemplo de resposta**
```json
{
  "message": "Successfully updated form version",
  "data": { "id": 3, "formId": 1, "version": 3, "isActive": true }
}
```

### DELETE /escuta-cidada-api/form-version/delete/:id
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
DELETE /escuta-cidada-api/form-version/delete/3
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "message": "Successfully deleted form version" }
```
