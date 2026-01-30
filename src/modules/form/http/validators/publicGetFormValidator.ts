import * as Z from "zod";

export const publicGetFormByIdParamsSchema = Z.object({
  projetoSlug: Z.string().trim().min(2, "projetoSlug é obrigatório"),
  formId: Z.coerce
    .number()
    .int("formId deve ser um número inteiro")
    .positive("formId deve ser positivo"),
});

export type PublicGetFormByIdParams = Z.infer<typeof publicGetFormByIdParamsSchema>;

export const publicGetFormsBySlugParamsSchema = Z.object({
  projetoSlug: Z.string().trim().min(2, "projetoSlug Ã© obrigatÃ³rio"),
});

export type PublicGetFormsBySlugParams = Z.infer<
  typeof publicGetFormsBySlugParamsSchema
>;

export const publicGetFormBySlugParamsSchema = Z.object({
  projetoSlug: Z.string().trim().min(2, "projetoSlug Ã© obrigatÃ³rio"),
  formSlug: Z.string().trim().min(1, "formSlug Ã© obrigatÃ³rio"),
});

export type PublicGetFormBySlugParams = Z.infer<
  typeof publicGetFormBySlugParamsSchema
>;
