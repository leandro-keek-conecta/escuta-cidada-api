import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";
import { FormResponseController } from "../controller/formResponseController";

export async function routerFormResponse(app: FastifyInstance) {
  const controller = container.get<FormResponseController>(
    Types.FormResponseController
  );

  app.post(
    "/create",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.create.bind(controller)
  );

  app.get(
    "/list",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.list.bind(controller)
  );

  app.delete(
    "/delete/:id",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.delete.bind(controller)
  );
}
