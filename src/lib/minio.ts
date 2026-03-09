import { Client } from "minio";

function resolveMinioConfig() {
  const rawEndpoint = process.env.MINIO_ENDPOINT ?? "";
  const rawPort = process.env.MINIO_PORT;

  let endPoint = rawEndpoint;
  let port = rawPort ? Number(rawPort) : undefined;
  let useSSL = (process.env.MINIO_USE_SSL ?? "true") === "true";

  if (/^https?:\/\//i.test(rawEndpoint)) {
    const parsedUrl = new URL(rawEndpoint);
    endPoint = parsedUrl.hostname;
    port = parsedUrl.port ? Number(parsedUrl.port) : undefined;
    useSSL = parsedUrl.protocol === "https:";
  }

  if (!port) {
    port = useSSL ? 443 : 80;
  }

  return {
    endPoint,
    port,
    useSSL,
    accessKey:
      process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ACESS_KEY ?? "",
    secretKey: process.env.MINIO_SECRET_KEY ?? "",
  };
}

export const minioClient = new Client(resolveMinioConfig());
