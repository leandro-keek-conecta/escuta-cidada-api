# Healthcheck

## Funcionalidade
- Verificar disponibilidade da API.

## Relacionamentos
- Nenhum.

## Quando pode ou nao pode ser criado
- Nao se aplica (nao cria entidade).

## Restricoes
- Nenhuma.

## Criacao em conjunto
- Nenhuma.

## Rotas
### GET /escuta-cidada-api/ping
- Auth: nao
- Uso: retorna `pong`.

**Exemplo de uso**
```
GET /escuta-cidada-api/ping
```

**Exemplo de resposta**
```json
"pong"
```
