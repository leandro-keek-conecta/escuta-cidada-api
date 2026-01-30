import * as Z from "zod";

export const opinionsQuerySchema = Z.object({
  projetoId: Z.coerce.number().int().positive(),
  start: Z.coerce.date().optional(),
  end: Z.coerce.date().optional(),
  limit: Z.coerce.number().int().positive().max(500).default(200),
  offset: Z.coerce.number().int().nonnegative().default(0),
  fieldName: Z.string().trim().min(1).default("opiniao"),
});

export type OpinionsQueryInput = Z.infer<typeof opinionsQuerySchema>;
