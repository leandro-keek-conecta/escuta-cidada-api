import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";
import { FormFieldController } from "../controller/formFieldController";

export async function routerFormField(app: FastifyInstance) {
  const controller = container.get<FormFieldController>(
    Types.FormFieldController
  );

  app.post(
    "/create",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.create.bind(controller)
  );
  app.patch(
    "/update/:id",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.update.bind(controller)
  );
  app.delete(
    "/delete/:id",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.delete.bind(controller)
  );
  app.get(
    "/list",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.list.bind(controller)
  );
}
