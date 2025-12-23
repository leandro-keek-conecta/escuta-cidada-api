import { inject, injectable } from "inversify";
import { IAutomationChatRepository } from "../repositories/IAutomationChatRepository";
import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";

@injectable()
export class DeleteAutomationChatService {
  @inject(Types.AutomationChatRepository)
  private automationChatRepository!: IAutomationChatRepository;

  public async execute(id: string): Promise<void> {
    try {
      const automationChat = await this.automationChatRepository.findById(id);
      if (!automationChat) {
        throw new AppError("AutomationChat nao encontrado.", StatusCodes.NOT_FOUND);
      }

      await this.automationChatRepository.delete(id);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Erro ao deletar AutomationChat.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
