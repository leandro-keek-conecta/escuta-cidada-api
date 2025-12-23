import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import { AutomationChat } from "@prisma/client";
import { IAutomationChatRepository } from "../repositories/IAutomationChatRepository";
import { AutomationChatSchema } from "../http/validators/CreateAutomationChatValidators";
import { IProjetoRepository } from "@/modules/projeto/repositories/IProjetoRepository";

interface IRequest {
  data: unknown;
}

@injectable()
export class CreateAutomationChatService {
  @inject(Types.AutomationChatRepository) private automationChatRepository!: IAutomationChatRepository;
  @inject(Types.ProjetoRepository) private projetoRepository!: IProjetoRepository;

  public async execute({ data }: IRequest): Promise<AutomationChat> {
    try {
      const parsed = AutomationChatSchema.safeParse(data);
      if (!parsed.success) {
        throw new AppError("Dados invalidos para criar AutomationChat.", {
          status: StatusCodes.BAD_REQUEST,
          details: parsed.error.format(),
        });
      }

      const payload = parsed.data;
      const normalizedSlug = payload.slug.toLowerCase();

      const existingSlug = await this.automationChatRepository.findBySlug(
        normalizedSlug
      );

      const existProject = await this.projetoRepository.findById(parsed.data.projetoId);

      if (existingSlug) {
        throw new AppError(
          "Slug ja cadastrado para outra automacao.",
          StatusCodes.CONFLICT
        );
      }

      if (!existProject) {
        throw new AppError(
          "Projeto não encontrado.",
          StatusCodes.CONFLICT
        );
      }

      const automationChatData = {
        slug: normalizedSlug,
        title: payload.title,
        description: payload.description,
        url: payload.url,
        isActive: payload.isActive ?? true,
        projeto: {
          connect: { id: payload.projetoId },
        },
      };

      return await this.automationChatRepository.create(automationChatData);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Erro ao criar AutomationChat.",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
