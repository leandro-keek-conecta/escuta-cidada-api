import * as Z from "zod";

export const updateFormResponseSchema = Z.object({
  projetoId: Z.number().int().positive().optional(),
  userId: Z.number().int().positive().nullable().optional(),
  ip: Z.string().optional(),
  userAgent: Z.string().optional(),
  fields: Z.record(Z.any()).optional(),
});

export type UpdateFormResponseInput = Z.infer<typeof updateFormResponseSchema>;
