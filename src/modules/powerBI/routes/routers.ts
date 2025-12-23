import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import { PowerBIController } from "../controllers/powerbiController";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";

export async function routerPowerBI(app: FastifyInstance) {
  const powerBIController = container.get<PowerBIController>(Types.PowerBIController);

  app.get("/embed-token", {preHandler: AuthMiddleware.required, handler: powerBIController.embedReport.bind(powerBIController)});
}
