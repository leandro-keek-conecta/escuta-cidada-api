import { FastifyInstance } from "fastify";

import container from "@/common/container";
import Types from "@/common/container/types";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";
import { FormVersionController } from "../controller/formVersionController";

export async function routerFormVersion(app: FastifyInstance) {
  const formVersionController = container.get<FormVersionController>(
    Types.FormVersionController
  );

  app.post(
    "/create",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    formVersionController.create.bind(formVersionController)
  );

  app.get(
    "/list",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    formVersionController.list.bind(formVersionController)
  );

  app.patch(
    "/update/:id",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    formVersionController.update.bind(formVersionController)
  );

  app.delete(
    "/delete/:id",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    formVersionController.delete.bind(formVersionController)
  );
}
