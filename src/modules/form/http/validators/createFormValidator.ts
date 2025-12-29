import * as Z from "zod";

export const createFormValidator = {

}

export const formFieldSchema = Z.object({
  name: Z.string().trim().min(1, "O nome do campo e obrigatorio"),
  label: Z.string().trim().min(1, "O label do campo e obrigatorio"),
  type: Z.string().trim().min(1, "O tipo do campo e obrigatorio"),
  required: Z.boolean().default(false),
  options: Z.record(Z.any()).optional(),
  ordem: Z.number()
    .int("ordem deve ser um numero inteiro")
    .nonnegative("ordem deve ser positiva"),
});

export const formVersionSchema = Z.object({
  version: Z.number()
    .int("A versao deve ser um numero inteiro")
    .nonnegative("A versao deve ser positiva"),
  schema: Z.record(Z.any()).default({}),
  isActive: Z.boolean().default(true),
  fields: Z.array(formFieldSchema).optional(),
});

export const createFormSchema = Z.object({
  name: Z.string().trim().min(1, "O nome do form e obrigatorio"),
  description: Z.string().trim().optional(),
  projetoId: Z.number()
    .int("O projeto deve ser um numero inteiro")
    .positive("O projeto deve ser valido"),
  versions: Z.array(formVersionSchema).optional(),
});

export type FormFieldInput = Z.infer<typeof formFieldSchema>;
export type FormVersionInput = Z.infer<typeof formVersionSchema>;
export type CreateFormInput = Z.infer<typeof createFormSchema>;
