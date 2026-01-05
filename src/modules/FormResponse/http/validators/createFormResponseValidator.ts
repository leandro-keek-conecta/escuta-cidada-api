import * as Z from "zod";

export const createFormResponseSchema = Z.object({
  formVersionId: Z.number().int().positive(),
  projetoId: Z.number().int().positive(),
  userId: Z.number().int().positive().optional(),
  ip: Z.string().optional(),
  userAgent: Z.string().optional(),
  fields: Z.record(Z.any()).optional(),
});

export type CreateFormResponseInput = Z.infer<typeof createFormResponseSchema>;
