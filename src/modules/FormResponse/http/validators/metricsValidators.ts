import { FormResponseStatus } from "@prisma/client";
import * as Z from "zod";

const baseFiltersSchema = Z.object({
  projetoId: Z.coerce.number().int().positive().optional(),
  formVersionId: Z.coerce.number().int().positive().optional(),
  status: Z.nativeEnum(FormResponseStatus).optional(),
  start: Z.coerce.date().optional(),
  end: Z.coerce.date().optional(),
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
    monthStart: Z.coerce.date().optional(),
    monthEnd: Z.coerce.date().optional(),
    dayStart: Z.coerce.date().optional(),
    dayEnd: Z.coerce.date().optional(),
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
export type MetricsDistributionInput = Z.infer<typeof metricsDistributionSchema>;
export type MetricsNumberStatsInput = Z.infer<typeof metricsNumberStatsSchema>;
export type MetricsStatusFunnelInput = Z.infer<typeof metricsStatusFunnelSchema>;
