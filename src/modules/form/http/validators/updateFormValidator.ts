import * as Z from "zod";
import { formVersionSchema } from "./createFormValidator";

export const updateFormSchema = Z.object({
  name: Z.string().trim().min(1, "O nome do form e obrigatorio").optional(),
  description: Z.string().trim().optional(),
  projetoId: Z.number()
    .int("O projeto deve ser um numero inteiro")
    .positive("O projeto deve ser valido")
    .optional(),
  versions: Z.array(formVersionSchema).optional(),
});

export type UpdateFormInput = Z.infer<typeof updateFormSchema>;
