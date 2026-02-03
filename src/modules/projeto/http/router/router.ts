import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import { ProjetoController } from "../controller/ProjetoController";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";

export async function routerProjeto(app: FastifyInstance) {
  const ProjetoController = container.get<ProjetoController>(Types.ProjetoController);

  app.post("/create", {preHandler: AuthMiddleware.required,handler: ProjetoController.create.bind(ProjetoController)});
  app.get("/list", {preHandler: AuthMiddleware.required,handler: ProjetoController.list.bind(ProjetoController)});
  app.patch("/update/:id", {preHandler: AuthMiddleware.required,handler: ProjetoController.update.bind(ProjetoController)});
  app.delete("/delete/:id", {preHandler: AuthMiddleware.required,handler: ProjetoController.delete.bind(ProjetoController)});
}
