import * as Z from "zod";

export const updateFormFieldSchema = Z.object({
  formVersionId: Z.number()
    .int("formVersionId deve ser um número inteiro")
    .positive("formVersionId deve ser positivo")
    .optional(),
  name: Z.string().trim().min(1, "O nome do campo é obrigatório").optional(),
  label: Z.string().trim().min(1, "O label do campo é obrigatório").optional(),
  type: Z.string().trim().min(1, "O tipo do campo é obrigatório").optional(),
  required: Z.boolean().optional(),
  options: Z.record(Z.any()).optional(),
  ordem: Z.number()
    .int("ordem deve ser um número inteiro")
    .nonnegative("ordem deve ser positiva ou zero")
    .optional(),
});

export type UpdateFormFieldInput = Z.infer<typeof updateFormFieldSchema>;
