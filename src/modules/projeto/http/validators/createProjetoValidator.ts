import * as Z from "zod";

export const projetoSchema = Z.object({
  slug: Z.string().min(1, "O slug do projeto e obrigatorio"),
  name: Z.string().min(1, "O nome do projeto e obrigatorio"),
  reportId: Z.string().optional(),
  groupId: Z.string().optional(),
  corHex: Z.string().optional(),
  logoUrl: Z.string().optional(),
  users: Z.array(
    Z.object({
      id: Z.number().int("ID do usuario deve ser um numero inteiro")
    })
  )
    .nonempty("Informe pelo menos um usuario")
    .optional(),
});
