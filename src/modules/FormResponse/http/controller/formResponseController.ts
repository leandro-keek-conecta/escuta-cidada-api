import { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { CreateFormResponseService } from "../../services/CreateFormResponseService";
import { ListFormResponsesService } from "../../services/ListFormResponsesService";
import { DeleteFormResponseService } from "../../services/DeleteFormResponseService";

@injectable()
export class FormResponseController {
    @inject(Types.CreateFormResponseService) private readonly createFormResponseService!: CreateFormResponseService;
    @inject(Types.ListFormResponsesService) private readonly listFormResponsesService!: ListFormResponsesService;
    @inject(Types.DeleteFormResponseService) private readonly deleteFormResponseService!: DeleteFormResponseService;


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

  private handleError(reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send({ message: error.message, details: error.details });
    }

    const message = error instanceof Error ? error.message : "Erro interno";
    return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ message });
  }
}
