# Formulario Publico

## Funcionalidade
- Consultar dados publicos de um formulario (projeto + form + versao ativa).

## Relacionamentos
- Projeto -> Form -> FormVersion (ativa) -> FormField.

## Quando pode ou nao pode ser criado
- Pode: projeto ativo e form existente com versao ativa.
- Nao pode: projeto inativo; projeto inexistente; form inexistente; form sem versao ativa.

## Restricoes
- Sem autenticacao.

## Criacao em conjunto
- Nenhuma.

## Rotas
### GET /escuta-cidada-api/public/projetos/:projetoSlug/forms/id/:formId
- Auth: nao

**Exemplo de uso**
```
GET /escuta-cidada-api/public/projetos/projeto-a/forms/id/1
```

**Exemplo de resposta**
```json
{
  "message": "Formulario publico retornado com sucesso",
  "data": {
    "projeto": { "slug": "projeto-a", "name": "Projeto A", "corHex": "#FFAA00" },
    "form": { "id": 1, "name": "Pesquisa", "description": "Form principal" },
    "activeVersion": {
      "id": 3,
      "version": 1,
      "schema": [],
      "fields": [
        { "id": 10, "name": "opiniao", "label": "Opiniao", "type": "text", "required": true, "options": null, "ordem": 1 }
      ]
    }
  }
}
```

### GET /escuta-cidada-api/public/projetos/:projetoSlug/forms
- Auth: nao
- Retorna todos os forms do projeto, cada um com a versao ativa (se existir).

**Exemplo de uso**
```
GET /escuta-cidada-api/public/projetos/projeto-a/forms
```

**Exemplo de resposta (resumo)**
```json
{
  "message": "Formularios publicos retornados com sucesso",
  "data": {
    "projeto": { "slug": "projeto-a", "name": "Projeto A", "corHex": "#FFAA00" },
    "forms": [
      {
        "id": 1,
        "name": "Formulario de Opiniao",
        "description": "Coleta de opinioes",
        "activeVersion": { "id": 3, "version": 1, "schema": [], "fields": [] }
      }
    ]
  }
}
```

### GET /escuta-cidada-api/public/projetos/:projetoSlug/forms/slug/:formSlug
- Auth: nao
- Busca um form especifico usando o slug do nome do form (slugificado).
- Regra de slugificacao: minusculas, sem acentos, espacos viram `-`.

**Exemplo de uso**
```
GET /escuta-cidada-api/public/projetos/projeto-a/forms/slug/formulario-de-opiniao
```

**Exemplo de resposta**
```json
{
  "message": "Formulario publico retornado com sucesso",
  "data": {
    "projeto": { "slug": "projeto-a", "name": "Projeto A", "corHex": "#FFAA00" },
    "form": { "id": 1, "name": "Formulario de Opiniao", "description": "Coleta de opinioes" },
    "activeVersion": {
      "id": 3,
      "version": 1,
      "schema": [],
      "fields": [
        { "id": 10, "name": "opiniao", "label": "Opiniao", "type": "text", "required": true, "options": null, "ordem": 1 }
      ]
    }
  }
}
```
