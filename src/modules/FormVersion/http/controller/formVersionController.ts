import { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { FormVersionDoesNotExist } from "../../errors/FormVersionDoesNotExist";
import { DeleteFormVersionService } from "../../services/DeleteFormVersionService";
import { ListFormVersionsService } from "../../services/ListFormVersionsService";
import { UpdateFormVersionService } from "../../services/UpdateFormVersionService";
import { CreateFormVersionService } from "../../services/CreateFormVersionService copy";

@injectable()
export class FormVersionController {
  constructor(
    @inject(Types.CreateFormVersionService)
    private readonly createFormVersionService: CreateFormVersionService,
    @inject(Types.ListFormVersionsService)
    private readonly listFormVersionsService: ListFormVersionsService,
    @inject(Types.UpdateFormVersionService)
    private readonly updateFormVersionService: UpdateFormVersionService,
    @inject(Types.DeleteFormVersionService)
    private readonly deleteFormVersionService: DeleteFormVersionService
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const created = await this.createFormVersionService.execute({
        data: request.body as any,
      });

      return reply.status(StatusCodes.CREATED).send({
        message: "Successfully created form version",
        data: created,
      });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { formId } = (request.query ?? {}) as { formId?: string | number };
    const parsedFormId =
      typeof formId === "number"
        ? formId
        : formId !== undefined
        ? Number(formId)
        : undefined;

    if (formId !== undefined && Number.isNaN(parsedFormId)) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: "formId deve ser um numero" });
    }

    try {
      const versions = await this.listFormVersionsService.execute(parsedFormId);
      return reply.status(StatusCodes.OK).send({
        message: "Successfully listed form versions",
        data: versions,
      });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = request.params as { id?: string };

    if (!id || Number.isNaN(Number(id))) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: "Id da versao invalido" });
    }

    try {
      const updated = await this.updateFormVersionService.execute({
        id: Number(id),
        data: request.body as any,
      });

      return reply.status(StatusCodes.OK).send({
        message: "Successfully updated form version",
        data: updated,
      });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { id } = request.params as { id?: string };

    if (!id || Number.isNaN(Number(id))) {
      return reply
        .status(StatusCodes.BAD_REQUEST)
        .send({ message: "Id da versao invalido" });
    }

    try {
      await this.deleteFormVersionService.execute({ id: Number(id) });
      return reply.status(StatusCodes.OK).send({
        message: "Successfully deleted form version",
      });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  private handleError(reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof FormVersionDoesNotExist) {
      return reply.status(StatusCodes.NOT_FOUND).send({ message: error.message });
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
