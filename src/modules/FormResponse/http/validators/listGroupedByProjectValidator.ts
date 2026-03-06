import * as Z from "zod";

export const listGroupedByProjectParamsSchema = Z.object({
  projectId: Z.coerce.number().int().positive(),
});

export const listGroupedByProjectQuerySchema = Z.object({
  formId: Z.coerce.number().int().positive().optional(),
});

export type ListGroupedByProjectParamsInput = Z.infer<
  typeof listGroupedByProjectParamsSchema
>;
export type ListGroupedByProjectQueryInput = Z.infer<
  typeof listGroupedByProjectQuerySchema
>;
