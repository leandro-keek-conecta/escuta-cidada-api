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
    { preHandler: [AuthMiddleware.required] },
    controller.list.bind(controller)
  );

  app.patch(
    "/update/:id",
    { preHandler: [AuthMiddleware.required] },
    controller.update.bind(controller)
  );

  app.delete(
    "/delete/:id",
    { preHandler: [AuthMiddleware.required] },
    controller.delete.bind(controller)
  );

  app.get(
    "/opinions",
    { preHandler: [AuthMiddleware.required] },
    controller.opinions.bind(controller)
  );

  app.get(
    "/raw",
    { preHandler: [AuthMiddleware.required] },
    controller.raw.bind(controller)
  );

  app.get(
    "/exists",
    { preHandler: [AuthMiddleware.required] },
    controller.exists.bind(controller)
  );

  app.get(
    "/metrics/timeseries",
    { preHandler: [AuthMiddleware.required] },
    metricsController.timeSeries.bind(metricsController)
  );

  app.get(
    "/metrics/distribution",
    { preHandler: [AuthMiddleware.required] },
    metricsController.distribution.bind(metricsController)
  );

  app.get(
    "/metrics/number-stats",
    { preHandler: [AuthMiddleware.required] },
    metricsController.numberStats.bind(metricsController)
  );

  app.get(
    "/metrics/status-funnel",
    { preHandler: [AuthMiddleware.required] },
    metricsController.statusFunnel.bind(metricsController)
  );

  app.get(
    "/metrics/summary",
    { preHandler: [AuthMiddleware.required] },
    metricsController.summary.bind(metricsController)
  );

  app.get(
    "/metrics/filters",
    { preHandler: [AuthMiddleware.required] },
    metricsController.filters.bind(metricsController)
  );

  app.get(
    "/metrics/report",
    { preHandler: [AuthMiddleware.required] },
    metricsController.report.bind(metricsController)
  );

  app.get(
    "/metrics/project-report",
    { preHandler: [AuthMiddleware.required] },
    metricsController.projectReport.bind(metricsController)
  );

  app.get(
    "/metrics/form-filters",
    { preHandler: [AuthMiddleware.required] },
    metricsController.formFilters.bind(metricsController)
  );
}
