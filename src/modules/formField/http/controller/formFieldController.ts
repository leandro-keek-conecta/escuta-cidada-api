import { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { CreateFormFieldService } from "../../services/CreateFormFieldService";
import { UpdateFormFieldService } from "../../services/UpdateFormFieldService";
import { DeleteFormFieldService } from "../../services/DeleteFormFieldService";
import { ListFormFieldsService } from "../../services/ListFormFieldsService";
import { FormFieldDoesNotExist } from "../../errors/FormFieldDoesNotExist";

@injectable()
export class FormFieldController {
  constructor(
    @inject(Types.CreateFormFieldService)
    private readonly createFormFieldService: CreateFormFieldService,
    @inject(Types.UpdateFormFieldService)
    private readonly updateFormFieldService: UpdateFormFieldService,
    @inject(Types.DeleteFormFieldService)
    private readonly deleteFormFieldService: DeleteFormFieldService,
    @inject(Types.ListFormFieldsService)
    private readonly listFormFieldsService: ListFormFieldsService
  ) {}

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const created = await this.createFormFieldService.execute({
        data: request.body as any,
      });

      return reply.status(StatusCodes.CREATED).send({
        message: "Campo do formulário criado com sucesso",
        data: created,
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
        .send({ message: "Id do campo invalido" });
    }

    try {
      const updated = await this.updateFormFieldService.execute({
        id: Number(id),
        data: request.body as any,
      });

      return reply.status(StatusCodes.OK).send({
        message: "Campo do formulario atualizado com sucesso",
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
        .send({ message: "Id do campo invalido" });
    }

    try {
      await this.deleteFormFieldService.execute(Number(id));
      return reply.status(StatusCodes.OK).send({
        message: "Campo do formulario deletado com sucesso",
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const fields = await this.listFormFieldsService.execute();
      return reply.status(StatusCodes.OK).send({
        message: "Campos listados com sucesso",
        data: fields,
      });
    } catch (error: any) {
      return this.handleError(reply, error);
    }
  }

  private handleError(reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof FormFieldDoesNotExist) {
      return reply
        .status(StatusCodes.NOT_FOUND)
        .send({ message: error.message });
    }

    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send({ message: error.message, details: error.details });
    }

    const message = error instanceof Error ? error.message : "Erro interno ao criar campo";
    return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      message,
    });
  }
}
