import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";
import { FormController } from "../controller/formController";

export async function routerForm(app: FastifyInstance) {
  const formController = container.get<FormController>(Types.FormController);

  app.post(
    "/create",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    formController.create.bind(formController)
  );
  app.get(
    "/list",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    formController.list.bind(formController)
  );
  app.patch(
    "/update/:id",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    formController.update.bind(formController)
  );
  app.delete(
    "/delete/:id",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    formController.delete.bind(formController)
  );
}
