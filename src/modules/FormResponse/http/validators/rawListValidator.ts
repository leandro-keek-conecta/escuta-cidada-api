import * as Z from "zod";

const parseSelect = (value: unknown) => {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => String(item).trim())
      .filter(Boolean);
    return items.length ? Array.from(new Set(items)) : undefined;
  }
  if (typeof value !== "string") return value;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!items.length) return undefined;
  return Array.from(new Set(items));
};

export const rawListQuerySchema = Z.object({
  projetoId: Z.coerce.number().int().positive(),
  formVersionId: Z.coerce.number().int().positive().optional(),
  start: Z.coerce.date().optional(),
  end: Z.coerce.date().optional(),
  limit: Z.coerce.number().int().positive().max(500).default(200),
  offset: Z.coerce.number().int().nonnegative().default(0),
  select: Z.preprocess(parseSelect, Z.array(Z.string().trim().min(1)).optional()),
  includeDates: Z.coerce.boolean().optional().default(true),
});

export type RawListQueryInput = Z.infer<typeof rawListQuerySchema>;
