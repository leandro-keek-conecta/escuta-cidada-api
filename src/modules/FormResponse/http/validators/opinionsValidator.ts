import { FormResponseStatus } from "@prisma/client";
import * as Z from "zod";
import { dateInputSchema } from "@/common/http/validators/dateInputSchema";

const parseStringArray = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  }

  if (typeof value === "string") {
    const items = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  }

  const item = String(value).trim();
  return item ? [item] : undefined;
};

const stringArrayQuerySchema = Z.preprocess(
  parseStringArray,
  Z.array(Z.string().trim().min(1)).min(1).max(200).optional()
);

export const opinionsQuerySchema = Z.object({
  projetoId: Z.coerce.number().int().positive(),
  start: dateInputSchema.optional(),
  end: dateInputSchema.optional(),
  status: Z.nativeEnum(FormResponseStatus).optional(),
  limit: Z.coerce.number().int().positive().max(500).default(200),
  offset: Z.coerce.number().int().nonnegative().default(0),
  tema: stringArrayQuerySchema,
  temas: stringArrayQuerySchema,
  tipo: stringArrayQuerySchema,
  tipos: stringArrayQuerySchema,
  tipoOpiniao: stringArrayQuerySchema,
  genero: stringArrayQuerySchema,
  generos: stringArrayQuerySchema,
  bairro: stringArrayQuerySchema,
  bairros: stringArrayQuerySchema,
  faixaEtaria: stringArrayQuerySchema,
  faixasEtarias: stringArrayQuerySchema,
  texto: stringArrayQuerySchema,
  textoOpiniao: stringArrayQuerySchema,
  busca: stringArrayQuerySchema,
  search: stringArrayQuerySchema,
  keyword: stringArrayQuerySchema,
});

export type OpinionsQueryInput = Z.infer<typeof opinionsQuerySchema>;
