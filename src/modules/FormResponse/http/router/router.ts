import { FastifyInstance } from "fastify";
import container from "@/common/container";
import Types from "@/common/container/types";
import AuthMiddleware from "@/common/infra/http/middlewares/AuthenticationHandler";
import { FormResponseController } from "../controller/formResponseController";
import { FormResponseMetricsController } from "../controller/formResponseMetricsController";

export async function routerFormResponse(app: FastifyInstance) {
  const controller = container.get<FormResponseController>(
    Types.FormResponseController
  );
  const metricsController = container.get<FormResponseMetricsController>(
    Types.FormResponseMetricsController
  );

  app.post(
    "/create",
    controller.create.bind(controller)
  );

  app.get(
    "/list",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.list.bind(controller)
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
    "/opinions",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.opinions.bind(controller)
  );

  app.get(
    "/raw",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.raw.bind(controller)
  );

  app.get(
    "/exists",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    controller.exists.bind(controller)
  );

  app.get(
    "/metrics/timeseries",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    metricsController.timeSeries.bind(metricsController)
  );

  app.get(
    "/metrics/distribution",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    metricsController.distribution.bind(metricsController)
  );

  app.get(
    "/metrics/number-stats",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    metricsController.numberStats.bind(metricsController)
  );

  app.get(
    "/metrics/status-funnel",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    metricsController.statusFunnel.bind(metricsController)
  );

  app.get(
    "/metrics/summary",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    metricsController.summary.bind(metricsController)
  );

  app.get(
    "/metrics/filters",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    metricsController.filters.bind(metricsController)
  );

  app.get(
    "/metrics/report",
    { preHandler: [AuthMiddleware.required, AuthMiddleware.isAdmin] },
    metricsController.report.bind(metricsController)
  );
}
