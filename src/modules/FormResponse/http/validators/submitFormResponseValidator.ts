import * as Z from "zod";

export const submitFormResponseSchema = Z.object({
  projetoSlug: Z.string().trim().min(1),
  formId: Z.number().int().positive().optional(),
  formSlug: Z.string().trim().min(1).optional(),
  payload: Z.record(Z.any()),
  ip: Z.string().optional(),
  userAgent: Z.string().optional(),
});

export type SubmitFormResponseInput = Z.infer<typeof submitFormResponseSchema>;
