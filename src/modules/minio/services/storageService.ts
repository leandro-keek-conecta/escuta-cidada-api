import { minioClient } from "@/lib/minio";
import { injectable } from "inversify";

const BUCKET = process.env.MINIO_BUCKET || "uploads";

@injectable()
export class StorageService {

  public async generatePresignedUploadUrl(fileName: string,folder: string, expires = 60 * 5) {

    const fileKey = `${folder}/${Date.now()}-${fileName}`;
    const uploadUrl = await minioClient.presignedPutObject(
      BUCKET,
      fileKey,
      expires,
    );

    return {
      uploadUrl,
      fileKey,
      fileUrl: `${process.env.MINIO_PUBLIC_URL}/${BUCKET}/${fileKey}`,
    };
  }
}
