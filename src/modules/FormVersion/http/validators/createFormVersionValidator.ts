import * as Z from "zod";
import { formFieldSchema } from "@/modules/form/http/validators/createFormValidator";

export const createFormVersionSchema = Z.object({
  formId: Z.number()
    .int("formId deve ser um numero inteiro")
    .positive("formId deve ser valido"),
  version: Z.number()
    .int("A versao deve ser um numero inteiro")
    .positive("A versao deve ser positiva"),
  schema: Z.record(Z.any()).default({}),
  isActive: Z.boolean().default(true),
  fields: Z.array(formFieldSchema).optional(),
});

export type CreateFormVersionInput = Z.infer<typeof createFormVersionSchema>;
