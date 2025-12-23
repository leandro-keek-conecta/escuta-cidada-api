import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import { AutomationChat, Prisma } from "@prisma/client";
import { IAutomationChatRepository } from "../repositories/IAutomationChatRepository";
import { AutomationChatSchema } from "../http/validators/CreateAutomationChatValidators";

const AutomationChatUpdateSchema = AutomationChatSchema.partial();

interface IRequest {
  id: string;
  data: unknown;
}

@injectable()
export class UpdateAutomationChatService {
  @inject(Types.AutomationChatRepository) private automationChatRepository!: IAutomationChatRepository;

  public async execute({ id, data }: IRequest): Promise<AutomationChat> {
    try {
      const parsed = AutomationChatUpdateSchema.safeParse(data);

      if (!parsed.success) {
        throw new AppError("Dados invalidos para atualizacao do chat.", {
          status: StatusCodes.BAD_REQUEST,
          details: parsed.error.format(),
        });
      }

      const payload = parsed.data;

      if (Object.keys(payload).length === 0) {
        throw new AppError("Nenhum dado fornecido para atualizacao.", {
          status: StatusCodes.BAD_REQUEST,
        });
      }

      const existingAutomation =
        await this.automationChatRepository.findById(id);

      if (!existingAutomation) {
        throw new AppError("AutomationChat nao encontrado.", {
          status: StatusCodes.NOT_FOUND,
        });
      }

      const updateData: Prisma.AutomationChatUpdateInput = {};

      if (payload.slug) {
        const normalizedSlug = payload.slug.toLowerCase();

        if (normalizedSlug !== existingAutomation.slug) {
          const slugInUse = await this.automationChatRepository.findBySlug(
            normalizedSlug
          );

          if (slugInUse && slugInUse.id !== existingAutomation.id) {
            throw new AppError("Slug ja cadastrado para outra automacao.", {
              status: StatusCodes.CONFLICT,
            });
          }
        }

        updateData.slug = normalizedSlug;
      }

      if (payload.title !== undefined) {
        updateData.title = payload.title;
      }

      if (payload.description !== undefined) {
        updateData.description = payload.description;
      }

      if (payload.url !== undefined) {
        updateData.url = payload.url;
      }

      if (payload.isActive !== undefined) {
        updateData.isActive = payload.isActive;
      }

      if (payload.projetoId !== undefined) {
        updateData.projeto = {
          connect: { id: payload.projetoId },
        };
      }

      const updatedAutomation =
        await this.automationChatRepository.update(id, updateData);

      if (!updatedAutomation) {
        throw new AppError("AutomationChat nao encontrado.", {
          status: StatusCodes.NOT_FOUND,
        });
      }

      return updatedAutomation;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Erro ao atualizar AutomationChat.", {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }
}
