import { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import {
  publicGetFormByIdParamsSchema,
  publicGetFormsBySlugParamsSchema,
  publicGetFormBySlugParamsSchema,
} from "../validators/publicGetFormValidator";
import { PublicFormReadService } from "../../services/PublicFormReadService";
import { SubmitPublicFormResponseService } from "../../services/SubmitPublicFormResponseService";
import { submitFormResponseSchema } from "@/modules/FormResponse/http/validators/submitFormResponseValidator";

@injectable()
export class PublicFormController {
  constructor(
    @inject(Types.PublicFormReadService)
    private readonly publicFormReadService: PublicFormReadService,
    @inject(Types.SubmitPublicFormResponseService)
    private readonly submitPublicFormResponseService: SubmitPublicFormResponseService
  ) {}

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const { projetoSlug, formId } = publicGetFormByIdParamsSchema.parse(
        request.params
      );

      const result = await this.publicFormReadService.getPublicFormById({
        projetoSlug,
        formId,
      });

      return reply.status(StatusCodes.OK).send({
        message: "Formulário público retornado com sucesso",
        data: result,
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  async listBySlug(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const { projetoSlug } = publicGetFormsBySlugParamsSchema.parse(
        request.params
      );

      const result = await this.publicFormReadService.listPublicFormsBySlug({
        projetoSlug,
      });

      return reply.status(StatusCodes.OK).send({
        message: "Formulários públicos retornados com sucesso",
        data: result,
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  async getByFormSlug(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const { projetoSlug, formSlug } = publicGetFormBySlugParamsSchema.parse(
        request.params
      );

      const result = await this.publicFormReadService.getPublicFormBySlug({
        projetoSlug,
        formSlug,
      });

      return reply.status(StatusCodes.OK).send({
        message: "Formulário público retornado com sucesso",
        data: result,
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  async submitByFormSlug(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const { projetoSlug, formSlug } = publicGetFormBySlugParamsSchema.parse(
        request.params
      );
      const data = submitFormResponseSchema.parse(request.body);

      const result = await this.submitPublicFormResponseService.executeBySlug({
        projetoSlug,
        formSlug,
        data,
        requestIp: request.ip,
        requestUserAgent:
          typeof request.headers["user-agent"] === "string"
            ? request.headers["user-agent"]
            : undefined,
      });

      return reply.status(StatusCodes.CREATED).send({
        message: "Resposta publica criada com sucesso",
        data: result,
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  private handleError(reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send({ message: error.message, details: error.details });
    }

    const message =
      error instanceof Error ? error.message : "Erro interno ao buscar formulário público";
    return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      message,
    });
  }
}
