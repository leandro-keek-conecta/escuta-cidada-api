import { FastifyInstance } from "fastify";

import container from "@/common/container";
import Types from "@/common/container/types";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";
import { MinioController } from "../controller/minioController";

export async function routerStorage(app: FastifyInstance) {
  const controller = container.get<MinioController>(Types.MinioController);

  app.post(
    "/presigned-upload",
    {
      preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin],
    },
    controller.createPresignedUploadUrl.bind(controller)
  );

  app.post(
    "/presigned-upload/batch",
    {
      preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin],
    },
    controller.createPresignedUploadUrls.bind(controller)
  );
}
