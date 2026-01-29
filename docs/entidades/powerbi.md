# Power BI

## Funcionalidade
- Gerar token de embed para Power BI via ROPC.

## Relacionamentos
- Usa apenas configuracao (variaveis de ambiente).

## Quando pode ou nao pode ser criado
- Pode: credenciais `POWER_BI_*` validas.
- Nao pode: credenciais invalidas ou ambiente nao configurado.

## Restricoes
- Requer JWT valido.

## Criacao em conjunto
- Nenhuma.

## Rotas
### GET /escuta-cidada-api/powerbi/embed-token
- Auth: sim

**Exemplo de uso**
```
GET /escuta-cidada-api/powerbi/embed-token
Authorization: Bearer <token>
```

**Exemplo de resposta**
```json
{
  "message": "Embed token generated successfully",
  "data": {
    "access_token": "<token>",
    "token_type": "Bearer",
    "expires_in": 3599
  }
}
```
