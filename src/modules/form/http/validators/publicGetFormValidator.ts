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
  projetoSlug: Z.string().trim().min(2, "projetoSlug é obrigatório"),
});

export type PublicGetFormsBySlugParams = Z.infer<
  typeof publicGetFormsBySlugParamsSchema
>;

export const publicGetFormBySlugParamsSchema = Z.object({
  projetoSlug: Z.string().trim().min(2, "projetoSlug é obrigatório"),
  formSlug: Z.string().trim().min(1, "formSlug é obrigatório"),
});

export type PublicGetFormBySlugParams = Z.infer<
  typeof publicGetFormBySlugParamsSchema
>;
