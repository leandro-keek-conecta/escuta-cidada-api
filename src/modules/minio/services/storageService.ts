import { minioClient } from "@/lib/minio";
import AppError from "@/common/errors/AppError";
import { injectable } from "inversify";
import { CreatePresignedUploadInput } from "../http/validators/createPresignedUploadValidator";

const BUCKET = process.env.MINIO_BUCKET || "uploads";

@injectable()
export class StorageService {
  private sanitizePathSegment(value: string, field: string): string {
    const segments = value
      .trim()
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean);

    if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
      throw AppError.badRequest(`${field} invalido.`);
    }

    const normalized = segments
      .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "-"))
      .filter(Boolean)
      .join("/");

    if (!normalized) {
      throw AppError.badRequest(`${field} invalido.`);
    }

    return normalized;
  }

  private resolvePublicBaseUrl(): string {
    const publicBaseUrl =
      process.env.MINIO_PUBLIC_URL?.trim() || process.env.MINIO_ENDPOINT?.trim();

    if (!publicBaseUrl) {
      throw AppError.badRequest(
        "MINIO_PUBLIC_URL ou MINIO_ENDPOINT nao configurado."
      );
    }

    return publicBaseUrl.replace(/\/+$/, "");
  }

  public async generatePresignedUploadUrl({
    fileName,
    folder,
    projectId,
    expiresIn = 60 * 5,
  }: CreatePresignedUploadInput) {
    const safeFolder = this.sanitizePathSegment(folder, "folder");
    const safeFileName = this.sanitizePathSegment(fileName, "fileName");
    const fileKey = `projects/${projectId}/${safeFolder}/${Date.now()}-${safeFileName}`;

    const uploadUrl = await minioClient.presignedPutObject(
      BUCKET,
      fileKey,
      expiresIn,
    );

    return {
      uploadUrl,
      fileKey,
      fileUrl: `${this.resolvePublicBaseUrl()}/${BUCKET}/${fileKey}`,
      bucket: BUCKET,
      expiresIn,
    };
  }

  public async generatePresignedUploadUrls(
    files: CreatePresignedUploadInput[]
  ) {
    return Promise.all(
      files.map((file) => this.generatePresignedUploadUrl(file))
    );
  }
}
