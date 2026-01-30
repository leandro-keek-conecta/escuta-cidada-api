import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import { PublicFormController } from "../controller/publicFormController";

export async function routerPublicForm(app: FastifyInstance) {
  const controller = container.get<PublicFormController>(
    Types.PublicFormController
  );

  app.get(
    "/public/projetos/:projetoSlug/forms/id/:formId",
    controller.getById.bind(controller)
  );

  app.get(
    "/public/projetos/:projetoSlug/forms",
    controller.listBySlug.bind(controller)
  );

  app.get(
    "/public/projetos/:projetoSlug/forms/slug/:formSlug",
    controller.getByFormSlug.bind(controller)
  );
}
