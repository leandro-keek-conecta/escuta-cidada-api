# 📦 Detalhamento da execução da issue #1 — Keek Conecta API

A primeira demanda foi criar o backend, fazer a arquitetura do projeto e estruturar duas entidades "User" e "Projeto". Além disso, foi criado e rodado a primeira migration do projeto.

---

## ❗ Problemas encontrados

| Problema                                        | Solução                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| Porta inválida (ex: "RangeError: options.port") | Verifique se a variável `PORT` no `.env` está com valor válido (0–65535) |
| `prisma` não encontra o banco                   | Confirme se o `DATABASE_URL` está correto e o banco foi criado           |

---

## 📌 Status atual

- [x] Entidade `User` criada
- [x] Entidade `Projeto` criada
- [ ] Autenticação JWT
- [ ] Validações de entrada
