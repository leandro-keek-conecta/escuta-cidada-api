import * as Z from "zod";

const presignedUploadFileSchema = Z.object({
  projectId: Z.coerce.number().int().positive(),
  fileName: Z.string().trim().min(1).max(255),
  folder: Z.string().trim().min(1).max(120).optional().default("general"),
  expiresIn: Z.coerce.number().int().min(60).max(60 * 60).optional(),
});

export const createPresignedUploadSchema = presignedUploadFileSchema;

export const createPresignedUploadBatchSchema = Z.object({
  files: Z.array(presignedUploadFileSchema).min(1).max(20),
});

export type CreatePresignedUploadInput = Z.infer<
  typeof createPresignedUploadSchema
>;

export type CreatePresignedUploadBatchInput = Z.infer<
  typeof createPresignedUploadBatchSchema
>;
