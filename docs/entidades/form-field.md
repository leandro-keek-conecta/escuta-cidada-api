# Campo de Formulario (FormField)

## Funcionalidade
- Definir campos de uma versao de formulario.

## Relacionamentos
- FormField -> FormVersion (obrigatorio).
- FormField -> FormResponseField (quando ha respostas).

## Quando pode ou nao pode ser criado
- Pode: `formVersionId` existente e `name` unico na versao.
- Nao pode: `formVersionId` inexistente; `name` duplicado na mesma versao.

## Restricoes
- `name`, `label`, `type` obrigatorios.
- `ordem` inteiro >= 0.

## Criacao em conjunto
- Pode ser criado junto em `FormVersion.create` ou `Form.create`.

## Rotas
### POST /escuta-cidada-api/form-field/create
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
POST /escuta-cidada-api/form-field/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "formVersionId": 3,
  "name": "email",
  "label": "Email",
  "type": "email",
  "required": false,
  "options": { "placeholder": "voce@exemplo.com" },
  "ordem": 2
}
```

**Exemplo de resposta**
```json
{
  "message": "Campo do formulario criado com sucesso",
  "data": { "id": 20, "formVersionId": 3, "name": "email", "type": "email" }
}
```

### PATCH /escuta-cidada-api/form-field/update/:id
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
PATCH /escuta-cidada-api/form-field/update/20
Authorization: Bearer <token>
Content-Type: application/json

{
  "formVersionId": 3,
  "name": "email",
  "label": "Email (opcional)",
  "type": "email",
  "required": false,
  "options": { "placeholder": "voce@exemplo.com" },
  "ordem": 3
}
```

**Exemplo de resposta**
```json
{
  "message": "Campo do formulario atualizado com sucesso",
  "data": { "id": 20, "formVersionId": 3, "name": "email", "type": "email" }
}
```

### DELETE /escuta-cidada-api/form-field/delete/:id
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
DELETE /escuta-cidada-api/form-field/delete/20
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{ "message": "Campo do formulario deletado com sucesso" }
```

### GET /escuta-cidada-api/form-field/list
- Auth: sim (ADMIN ou SUPERADMIN)

**Exemplo de uso**
```
GET /escuta-cidada-api/form-field/list
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{
  "message": "Campos listados com sucesso",
  "data": [
    { "id": 10, "formVersionId": 3, "name": "opiniao", "type": "text" },
    { "id": 20, "formVersionId": 3, "name": "email", "type": "email" }
  ]
}
```
