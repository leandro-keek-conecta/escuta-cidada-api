import { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import AppError from "@/common/errors/AppError";
import Types from "@/common/container/types";
import { CreateAutomationChatService } from "../../services/createAutomatioChatService";
import { ListAutomatioChatService } from "../../services/listAutomatioChatService";
import { UpdateAutomationChatService } from "../../services/updateAutomatioChatService";
import { DeleteAutomationChatService } from "../../services/deleteAutomatioChatService";

@injectable()
export class AutomationChatController {
  constructor(
    @inject(Types.CreateAutomationChatService)
    private readonly createAutomationChatService: CreateAutomationChatService,
    @inject(Types.ListAutomatioChatService)
    private readonly listAutomationChatService: ListAutomatioChatService,
    @inject(Types.UpdateAutomationChatService)
    private readonly updateAutomationChatService: UpdateAutomationChatService,
    @inject(Types.DeleteAutomationChatService)
    private readonly deleteAutomationChatService: DeleteAutomationChatService
  ) {}

  async create(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const response = await this.createAutomationChatService.execute({
        data: request.body,
      });

      return reply.status(201).send({
        message: "Successfully created Automation Chat",
        data: response,
      });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async list( request: FastifyRequest, reply: FastifyReply ): Promise<FastifyReply> {
    const { projectId } = request.params as { projectId: number };

    const parsedProjectId =
      typeof projectId === "number"
        ? projectId
        : projectId !== undefined
        ? Number(projectId)
        : NaN;

    if (Number.isNaN(parsedProjectId)) {
      return reply.status(400).send({
        message: "projectId query param is required and must be a number",
      });
    }

    try {
      const chats = await this.listAutomationChatService.execute(
        parsedProjectId
      );

      return reply.status(200).send({
        message: "Successfully retrieved Automation Chats",
        data: chats,
      });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async update(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const { id } = request.params as { id?: string };

    if (!id) {
      return reply
        .status(400)
        .send({ message: "AutomationChat id is required" });
    }

    try {
      const updated = await this.updateAutomationChatService.execute({
        id,
        data: request.body ?? {},
      });

      return reply.status(200).send({
        message: "Successfully updated Automation Chat",
        data: updated,
      });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  async delete(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const { id } = request.params as { id?: string };

    if (!id) {
      return reply
        .status(400)
        .send({ message: "AutomationChat id is required" });
    }

    try {
      await this.deleteAutomationChatService.execute(id);

      return reply.status(200).send({
        message: "Successfully deleted Automation Chat",
      });
    } catch (error) {
      return this.handleError(reply, error);
    }
  }

  private handleError(reply: FastifyReply, error: unknown): FastifyReply {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        message: error.message,
        details: error.details,
      });
    }

    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return reply.status(500).send({
      message: "Erro interno no servidor",
      details: message,
    });
  }
}
