import * as Z from "zod";

export const formResponseExistsQuerySchema = Z.object({
  projetoId: Z.coerce.number().int().positive(),
  formVersionId: Z.coerce.number().int().positive().optional(),
  fieldName: Z.string().trim().min(1),
  value: Z.string().trim().min(1),
});

export type FormResponseExistsQueryInput = Z.infer<
  typeof formResponseExistsQuerySchema
>;
