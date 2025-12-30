import * as Z from "zod";
import { formFieldSchema } from "@/modules/form/http/validators/createFormValidator";

export const updateFormVersionSchema = Z.object({
  version: Z.number()
    .int("A versao deve ser um numero inteiro")
    .positive("A versao deve ser positiva")
    .optional(),
  schema: Z.record(Z.any()).optional(),
  isActive: Z.boolean().optional(),
  fields: Z.array(formFieldSchema).optional(),
});

export type UpdateFormVersionInput = Z.infer<typeof updateFormVersionSchema>;
