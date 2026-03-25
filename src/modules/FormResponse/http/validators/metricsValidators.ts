import { FormResponseStatus } from "@prisma/client";
import * as Z from "zod";
import { dateInputSchema } from "@/common/http/validators/dateInputSchema";

const formIdsQuerySchema = Z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parts = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      return parts.length ? parts : undefined;
    }

    return [value];
  },
  Z.array(Z.coerce.number().int().positive()).min(1).max(200).optional()
);

const stringArrayQuerySchema = Z.preprocess(
  (value) => {
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
  },
  Z.array(Z.string().trim().min(1)).min(1).max(200).optional()
);

const baseFiltersSchema = Z.object({
  projetoId: Z.coerce.number().int().positive().optional(),
  formVersionId: Z.coerce.number().int().positive().optional(),
  temas: stringArrayQuerySchema,
  tema: stringArrayQuerySchema,
  tipoOpiniao: stringArrayQuerySchema,
  tipos: stringArrayQuerySchema,
  tipo: stringArrayQuerySchema,
  genero: stringArrayQuerySchema,
  generos: stringArrayQuerySchema,
  bairro: stringArrayQuerySchema,
  bairros: stringArrayQuerySchema,
  faixaEtaria: stringArrayQuerySchema,
  faixasEtarias: stringArrayQuerySchema,
  textoOpiniao: stringArrayQuerySchema,
  texto: stringArrayQuerySchema,
  busca: stringArrayQuerySchema,
  search: stringArrayQuerySchema,
  keyword: stringArrayQuerySchema,
  campanhas: stringArrayQuerySchema,
  campanha: stringArrayQuerySchema,
  status: Z.nativeEnum(FormResponseStatus).optional(),
  start: dateInputSchema.optional(),
  end: dateInputSchema.optional(),
});

export const metricsTimeSeriesSchema = baseFiltersSchema
  .extend({
    interval: Z.enum(["day", "week", "month"]).default("day"),
    dateField: Z
      .enum(["createdAt", "submittedAt", "completedAt", "startedAt"])
      .default("createdAt"),
  })
  .refine((data) => data.projetoId || data.formVersionId, {
    message: "projetoId ou formVersionId obrigatorio",
  });

export const metricsReportSchema = baseFiltersSchema
  .extend({
    dateField: Z
      .enum(["createdAt", "submittedAt", "completedAt", "startedAt"])
      .default("createdAt"),
    monthStart: dateInputSchema.optional(),
    monthEnd: dateInputSchema.optional(),
    dayStart: dateInputSchema.optional(),
    dayEnd: dateInputSchema.optional(),
    limitTopThemes: Z.coerce.number().int().positive().max(200).default(10),
    limitTopNeighborhoods: Z.coerce
      .number()
      .int()
      .positive()
      .max(200)
      .default(10),
    limitDistribution: Z.coerce.number().int().positive().max(200).default(50),
  })
  .refine((data) => data.projetoId || data.formVersionId, {
    message: "projetoId ou formVersionId obrigatorio",
  });

export const metricsProjectReportSchema = baseFiltersSchema
  .extend({
    formId: Z.coerce.number().int().positive().optional(),
    formIds: formIdsQuerySchema,
    dateField: Z
      .enum(["createdAt", "submittedAt", "completedAt", "startedAt"])
      .default("createdAt"),
    monthStart: dateInputSchema.optional(),
    monthEnd: dateInputSchema.optional(),
    dayStart: dateInputSchema.optional(),
    dayEnd: dateInputSchema.optional(),
    limitTopForms: Z.coerce.number().int().positive().max(200).default(10),
  })
  .refine((data) => data.projetoId || data.formVersionId, {
    message: "projetoId ou formVersionId obrigatorio",
  });

export const metricsFormFiltersSchema = baseFiltersSchema
  .extend({
    formId: Z.coerce.number().int().positive().optional(),
    formIds: formIdsQuerySchema,
    dateField: Z
      .enum(["createdAt", "submittedAt", "completedAt", "startedAt"])
      .default("createdAt"),
    limitValuesPerField: Z.coerce
      .number()
      .int()
      .positive()
      .max(200)
      .default(30),
  })
  .refine((data) => data.projetoId || data.formVersionId, {
    message: "projetoId ou formVersionId obrigatorio",
  });

export const metricsSummarySchema = baseFiltersSchema
  .extend({
    day: dateInputSchema.optional(),
    rangeStart: dateInputSchema.optional(),
    rangeEnd: dateInputSchema.optional(),
    limitTopThemes: Z.coerce.number().int().positive().max(200).default(5),
    limitTopNeighborhoods: Z.coerce
      .number()
      .int()
      .positive()
      .max(200)
      .default(5),
  })
  .refine((data) => data.projetoId || data.formVersionId, {
    message: "projetoId ou formVersionId obrigatorio",
  });

export const metricsFiltersSchema = baseFiltersSchema
  .extend({
    limit: Z.coerce.number().int().positive().max(200).default(200),
  })
  .refine((data) => data.projetoId || data.formVersionId, {
    message: "projetoId ou formVersionId obrigatorio",
  });

export const metricsDistributionSchema = baseFiltersSchema
  .extend({
    fieldId: Z.coerce.number().int().positive().optional(),
    fieldName: Z.string().trim().optional(),
    valueType: Z.enum(["string", "number", "boolean", "date"]).default("string"),
    limit: Z.coerce.number().int().positive().max(200).default(50),
  })
  .refine((data) => data.fieldId || data.fieldName, {
    message: "fieldId ou fieldName obrigatorio",
  })
  .refine(
    (data) => !data.fieldName || data.formVersionId || data.projetoId,
    {
      message: "formVersionId ou projetoId obrigatorio quando usar fieldName",
    }
  );

export const metricsNumberStatsSchema = baseFiltersSchema
  .extend({
    fieldId: Z.coerce.number().int().positive(),
  })
  .refine((data) => data.projetoId || data.formVersionId, {
    message: "projetoId ou formVersionId obrigatorio",
  });

export const metricsStatusFunnelSchema = baseFiltersSchema.refine(
  (data) => data.projetoId || data.formVersionId,
  {
    message: "projetoId ou formVersionId obrigatorio",
  }
);

export type MetricsTimeSeriesInput = Z.infer<typeof metricsTimeSeriesSchema>;
export type MetricsReportInput = Z.infer<typeof metricsReportSchema>;
export type MetricsProjectReportInput = Z.infer<
  typeof metricsProjectReportSchema
>;
export type MetricsFormFiltersInput = Z.infer<typeof metricsFormFiltersSchema>;
export type MetricsSummaryInput = Z.infer<typeof metricsSummarySchema>;
export type MetricsFiltersInput = Z.infer<typeof metricsFiltersSchema>;
export type MetricsDistributionInput = Z.infer<typeof metricsDistributionSchema>;
export type MetricsNumberStatsInput = Z.infer<typeof metricsNumberStatsSchema>;
export type MetricsStatusFunnelInput = Z.infer<typeof metricsStatusFunnelSchema>;
