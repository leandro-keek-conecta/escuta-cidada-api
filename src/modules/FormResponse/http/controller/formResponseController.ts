import { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { CreateFormResponseService } from "../../services/CreateFormResponseService";
import { ListFormResponsesService } from "../../services/ListFormResponsesService";
import { DeleteFormResponseService } from "../../services/DeleteFormResponseService";
import { UpdateFormResponseService } from "../../services/UpdateFormResponseService";
import { ListFormOpinionsService } from "../../services/ListFormOpinionsService";
import { ListFormResponsesRawService } from "../../services/ListFormResponsesRawService";
import { FormResponseDoesNotExist } from "../../errors/FormResponseDoesNotExist";
import { opinionsQuerySchema } from "../validators/opinionsValidator";
import { rawListQuerySchema } from "../validators/rawListValidator";

@injectable()
export class FormResponseController {
    @inject(Types.CreateFormResponseService) private readonly createFormResponseService!: CreateFormResponseService;
    @inject(Types.UpdateFormResponseService) private readonly updateFormResponseService!: UpdateFormResponseService;
    @inject(Types.ListFormResponsesService) private readonly listFormResponsesService!: ListFormResponsesService;
    @inject(Types.DeleteFormResponseService) private readonly deleteFormResponseService!: DeleteFormResponseService;
    @inject(Types.ListFormOpinionsService) private readonly listFormOpinionsService!: ListFormOpinionsService;
    @inject(Types.ListFormResponsesRawService) private readonly listFormResponsesRawService!: ListFormResponsesRawService;


  async create(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const created = await this.createFormResponseService.execute({
        data: request.body as any,
      });
      return reply.status(StatusCodes.CREATED).send({ data: created });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }


  async list(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const { formVersionId } = request.query as { formVersionId?: string };
    const idNum = formVersionId ? Number(formVersionId) : NaN;
    if (Number.isNaN(idNum)) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: "formVersionId é obrigatório e deve ser numérico" });
    }

    try {
      const responses = await this.listFormResponsesService.execute(idNum);
      return reply.status(StatusCodes.OK).send({ data: responses });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async update(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const { id } = request.params as { id?: string };
    const idNum = id ? Number(id) : NaN;

    if (Number.isNaN(idNum)) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: "id ゼ obrigatИrio e deve ser numゼrico" });
    }

    try {
      const updated = await this.updateFormResponseService.execute({
        id: idNum,
        data: request.body as any,
      });

      return reply.status(StatusCodes.OK).send({ data: updated });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async delete(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const { id } = request.params as { id?: string };
    const idNum = id ? Number(id) : NaN;
    if (Number.isNaN(idNum)) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: "id é obrigatório e deve ser numérico" });
    }

    try {
      await this.deleteFormResponseService.execute(idNum);
      return reply
        .status(StatusCodes.OK)
        .send({ message: "Resposta deletada" });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async opinions(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const params = opinionsQuerySchema.parse(request.query);
      const data = await this.listFormOpinionsService.execute(params);
      return reply.status(StatusCodes.OK).send({ data });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async raw(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const params = rawListQuerySchema.parse(request.query);
      const data = await this.listFormResponsesRawService.execute(params);
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

    if (error instanceof FormResponseDoesNotExist) {
      return reply
        .status(StatusCodes.NOT_FOUND)
        .send({ message: error.message });
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
