import * as Z from "zod";

export const publicGetFormByIdParamsSchema = Z.object({
  projetoSlug: Z.string().trim().min(2, "projetoSlug é obrigatório"),
  formId: Z.coerce
    .number()
    .int("formId deve ser um número inteiro")
    .positive("formId deve ser positivo"),
});

export type PublicGetFormByIdParams = Z.infer<typeof publicGetFormByIdParamsSchema>;
