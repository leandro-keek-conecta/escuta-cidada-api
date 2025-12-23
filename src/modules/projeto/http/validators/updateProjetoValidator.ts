import * as Z from "zod";

export const UpdateProjetoUpdateSchema = Z.object({
  name: Z.string().min(1, "O nome do projeto e obrigatorio").optional(),
  reportId: Z.string().optional(),
  groupId: Z.string().optional(),
  corHex: Z.string().optional(),
  logoUrl: Z.string().optional(),
  users: Z.array(
    Z.object({
      id: Z.number().int("ID do usuario deve ser um numero inteiro")
    })
  ).optional(),
});
