import { FormResponseStatus } from "@prisma/client";
import * as Z from "zod";

export const createFormResponseSchema = Z.object({
  formVersionId: Z.number().int().positive(),
  projetoId: Z.number().int().positive(),
  userId: Z.number().int().positive().optional(),
  ip: Z.string().optional(),
  userAgent: Z.string().optional(),
  status: Z.nativeEnum(FormResponseStatus).optional(),
  startedAt: Z.coerce.date().optional(),
  completedAt: Z.coerce.date().optional(),
  submittedAt: Z.coerce.date().optional(),
  source: Z.string().optional(),
  channel: Z.string().optional(),
  utmSource: Z.string().optional(),
  utmMedium: Z.string().optional(),
  utmCampaign: Z.string().optional(),
  deviceType: Z.string().optional(),
  os: Z.string().optional(),
  browser: Z.string().optional(),
  locale: Z.string().optional(),
  timezone: Z.string().optional(),
  metadata: Z.any().optional(),
  fields: Z.record(Z.any()).optional(),
});

export type CreateFormResponseInput = Z.infer<typeof createFormResponseSchema>;
