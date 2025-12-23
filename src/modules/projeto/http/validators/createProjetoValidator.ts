import * as Z from "zod";

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const projetoSchema = Z.object({
  slug: Z.string()
    .trim()
    .min(1, "O slug do projeto e obrigatorio"),
  name: Z.string()
    .trim()
    .min(1, "O nome do projeto e obrigatorio"),
  cliente: Z.string().trim().optional(),
  descricaoCurta: Z.string().trim().optional(),
  reportId: Z.string().trim().optional(),
  groupId: Z.string().trim().optional(),
  corHex: Z.string()
    .trim()
    .regex(hexColorRegex, "Informe a cor no formato hexadecimal (#RRGGBB)")
    .optional(),
  logoUrl: Z.string().url("logoUrl deve ser uma URL valida").optional(),
  ativo: Z.boolean().default(true),
  themeConfig: Z.record(Z.any()).optional(),
  heroConfig: Z.record(Z.any()).optional(),
  users: Z.array(
    Z.object({
      id: Z.number().int("ID do usuario deve ser um numero inteiro"),
    })
  )
    .nonempty("Informe pelo menos um usuario")
    .optional(),
  forms: Z.array(
    Z.object({
      id: Z.number().int("Id do forms deve ser um numero inteiro"),
    })
  ).optional(),
  hiddenScreens: Z.array(
    Z.object({
      id: Z.number().int("Id da tela deve ser um numero inteiro"),
    })
  ).optional(),
});
