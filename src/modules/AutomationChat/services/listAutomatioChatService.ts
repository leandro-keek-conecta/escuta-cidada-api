import Types from "@/common/container/types";
import { IAutomationChatRepository } from "../repositories/IAutomationChatRepository";
import { inject, injectable } from "inversify";
import { AutomationChat } from "@prisma/client";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";

@injectable()
export class ListAutomatioChatService {
  @inject(Types.AutomationChatRepository)
  private automationChatRepository!: IAutomationChatRepository;

  public async execute(projectId: number): Promise<AutomationChat[]> {
    try {
      const chats = await this.automationChatRepository.getAll(projectId);
      if (!chats || chats.length === 0) {
        throw new AppError("Nenhum AutomationChat encontrado.", StatusCodes.NOT_FOUND);
      }


      return chats;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Erro ao listar AutomationChats.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
