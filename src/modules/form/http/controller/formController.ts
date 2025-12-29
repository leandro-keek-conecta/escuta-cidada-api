import { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { CreateFormService } from "../../services/CreateFormService";
import { UpdateFormService } from "../../services/UpdateFormService";
import { ListFormsService } from "../../services/ListFormsService";
import { DeleteFormService } from "../../services/DeleteFormService";
import { FormDoesNotExist } from "../../errors/FormDoesNotExist";

@injectable()
export class FormController {
  constructor(
    @inject(Types.CreateFormService)
    private readonly createFormService: CreateFormService,
    @inject(Types.UpdateFormService)
    private readonly updateFormService: UpdateFormService,
    @inject(Types.ListFormsService)
    private readonly listFormsService: ListFormsService,
    @inject(Types.DeleteFormService)
    private readonly deleteFormService: DeleteFormService
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const created = await this.createFormService.execute({ data: request.body as any });
      return reply.status(StatusCodes.CREATED).send({
        message: "Successfully created form",
        data: created,
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { projetoId } = (request.query ?? {}) as { projetoId?: string | number };
    const parsedProjetoId =
      typeof projetoId === "number"
        ? projetoId
        : projetoId !== undefined
        ? Number(projetoId)
        : undefined;

    if (projetoId !== undefined && Number.isNaN(parsedProjetoId)) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: "projetoId deve ser um numero" });
    }

    try {
      const forms = await this.listFormsService.execute(parsedProjetoId);
      return reply.status(StatusCodes.OK).send({
        message: "Successfully listed forms",
        data: forms,
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = request.params as { id?: string };

    if (!id || Number.isNaN(Number(id))) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: "Id do form invalido" });
    }

    try {
      const updated = await this.updateFormService.execute({
        id: Number(id),
        data: request.body as any,
      });

      return reply.status(StatusCodes.OK).send({
        message: "Successfully updated form",
        data: updated,
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = request.params as { id?: string };

    if (!id || Number.isNaN(Number(id))) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: "Id do form invalido" });
    }

    try {
      await this.deleteFormService.execute(Number(id));
      return reply.status(StatusCodes.OK).send({
        message: "Successfully deleted form",
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  private handleError(reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof FormDoesNotExist) {
      return reply
        .status(StatusCodes.NOT_FOUND)
        .send({ message: error.message });
    }

    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send({ message: error.message, details: error.details });
    }

    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      message: "Erro interno no servidor",
      details: message,
    });
  }
}
