import * as Z from "zod";

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const automationChatSchema = Z.object({
  slug: Z.string().trim().min(1, "O slug do chat e obrigatorio"),
  title: Z.string().trim().min(1, "O titulo do chat e obrigatorio"),
  description: Z.string().trim().optional(),
  url: Z.string().trim().url("URL invalida"),
  isActive: Z.boolean().optional(),
});

export const formFieldSchema = Z.object({
  name: Z.string().trim().min(1, "O nome do campo e obrigatorio"),
  label: Z.string().trim().min(1, "O label do campo e obrigatorio"),
  type: Z.string().trim().min(1, "O tipo do campo e obrigatorio"),
  required: Z.boolean().optional(),
  options: Z.record(Z.any()).optional(),
  ordem: Z.number()
    .int("ordem deve ser um numero inteiro")
    .nonnegative("ordem deve ser positiva"),
});

export const formVersionSchema = Z.object({
  version: Z.number()
    .int("Versao do form deve ser um numero inteiro")
    .nonnegative("Versao do form deve ser positiva"),
  schema: Z.record(Z.any()).optional(),
  isActive: Z.boolean().optional(),
  fields: Z.array(formFieldSchema).optional(),
});

export const formSchema = Z.object({
  name: Z.string().trim().min(1, "O nome do form e obrigatorio"),
  description: Z.string().trim().optional(),
  versions: Z.array(formVersionSchema).optional(),
});

export const hiddenScreenSchema = Z.object({
  userId: Z.number().int("ID do usuario deve ser um numero inteiro"),
  screenName: Z.string().trim().min(1, "O nome da tela e obrigatorio"),
});

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
  chats: Z.array(automationChatSchema).optional(),
  forms: Z.array(formSchema).optional(),
  hiddenScreens: Z.array(hiddenScreenSchema).optional(),
});

export type ProjetoFormInput = Z.infer<typeof formSchema>;
export type ProjetoFormVersionInput = Z.infer<typeof formVersionSchema>;
export type ProjetoFormFieldInput = Z.infer<typeof formFieldSchema>;
export type ProjetoAutomationChatInput = Z.infer<typeof automationChatSchema>;
export type ProjetoHiddenScreenInput = Z.infer<typeof hiddenScreenSchema>;
