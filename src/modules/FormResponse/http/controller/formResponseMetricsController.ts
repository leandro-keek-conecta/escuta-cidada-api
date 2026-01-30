import { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { FormResponseMetricsService } from "../../services/FormResponseMetricsService";
import {
  metricsDistributionSchema,
  metricsFiltersSchema,
  metricsNumberStatsSchema,
  metricsReportSchema,
  metricsSummarySchema,
  metricsStatusFunnelSchema,
  metricsTimeSeriesSchema,
} from "../validators/metricsValidators";

@injectable()
export class FormResponseMetricsController {
  @inject(Types.FormResponseMetricsService)
  private readonly metricsService!: FormResponseMetricsService;

  async timeSeries(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const params = metricsTimeSeriesSchema.parse(request.query);
      const data = await this.metricsService.timeSeries(params);
      return reply.status(StatusCodes.OK).send({ data });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async distribution(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const params = metricsDistributionSchema.parse(request.query);
      const data = await this.metricsService.distribution(params);
      return reply.status(StatusCodes.OK).send({ data });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async numberStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const params = metricsNumberStatsSchema.parse(request.query);
      const data = await this.metricsService.numberStats(params);
      return reply.status(StatusCodes.OK).send({ data });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async statusFunnel(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const params = metricsStatusFunnelSchema.parse(request.query);
      const data = await this.metricsService.statusFunnel(params);
      return reply.status(StatusCodes.OK).send({ data });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async report(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const params = metricsReportSchema.parse(request.query);
      const data = await this.metricsService.report(params);
      return reply.status(StatusCodes.OK).send({ data });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async summary(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const params = metricsSummarySchema.parse(request.query);
      const data = await this.metricsService.summary(params);
      return reply.status(StatusCodes.OK).send({ data });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async filters(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const params = metricsFiltersSchema.parse(request.query);
      const data = await this.metricsService.filters(params);
      return reply.status(StatusCodes.OK).send({ data });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  private handleError(reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof ZodError) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: error.format() });
    }

    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send({ message: error.message, details: error.details });
    }

    const message = error instanceof Error ? error.message : "Erro interno";
    return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ message });
  }
}
