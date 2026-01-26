import { FormResponseStatus } from "@prisma/client";
import * as Z from "zod";

export const updateFormResponseSchema = Z.object({
  projetoId: Z.number().int().positive().optional(),
  userId: Z.number().int().positive().nullable().optional(),
  ip: Z.string().optional(),
  userAgent: Z.string().optional(),
  status: Z.nativeEnum(FormResponseStatus).optional(),
  startedAt: Z.coerce.date().optional(),
  completedAt: Z.coerce.date().optional(),
  submittedAt: Z.coerce.date().optional(),
  source: Z.string().nullable().optional(),
  channel: Z.string().nullable().optional(),
  utmSource: Z.string().nullable().optional(),
  utmMedium: Z.string().nullable().optional(),
  utmCampaign: Z.string().nullable().optional(),
  deviceType: Z.string().nullable().optional(),
  os: Z.string().nullable().optional(),
  browser: Z.string().nullable().optional(),
  locale: Z.string().nullable().optional(),
  timezone: Z.string().nullable().optional(),
  metadata: Z.any().nullable().optional(),
  fields: Z.record(Z.any()).optional(),
});

export type UpdateFormResponseInput = Z.infer<typeof updateFormResponseSchema>;
