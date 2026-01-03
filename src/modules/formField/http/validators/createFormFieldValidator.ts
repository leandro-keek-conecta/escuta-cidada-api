import * as Z from "zod";

export const createFormFieldSchema = Z.object({
  formVersionId: Z.number()
    .int("formVersionId deve ser um número inteiro")
    .positive("formVersionId deve ser positivo"),
  name: Z.string().trim().min(1, "O nome do campo é obrigatório"),
  label: Z.string().trim().min(1, "O label do campo é obrigatório"),
  type: Z.string().trim().min(1, "O tipo do campo é obrigatório"),
  required: Z.boolean().default(false),
  options: Z.record(Z.any()).optional(),
  ordem: Z.number()
    .int("ordem deve ser um número inteiro")
    .nonnegative("ordem deve ser positiva ou zero"),
});

export type CreateFormFieldInput = Z.infer<typeof createFormFieldSchema>;
