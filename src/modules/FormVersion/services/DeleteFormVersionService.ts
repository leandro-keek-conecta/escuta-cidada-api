import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import { realtimeGateway } from "@/common/realtime/realtimeGateway";

import { FormVersionDoesNotExist } from "../errors/FormVersionDoesNotExist";
import { IFormVersionRepository } from "../repositories/IFormVersionRepository";

interface IRequest {
  id: number;
}

@injectable()
export class DeleteFormVersionService {
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;

  public async execute({ id }: IRequest) {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id da versao invalido", StatusCodes.BAD_REQUEST);
      }
      const existFormVersion = await this.formVersionRepository.findById(id);
      if (!existFormVersion) {
        throw new FormVersionDoesNotExist();
      }
      const existingWithForm = await this.formVersionRepository.findByIdWithForm(id);
      await this.formVersionRepository.delete(id);
      realtimeGateway.emitChange({
        action: "deleted",
        entity: "formVersion",
        entityId: existFormVersion.id,
        projetoId: existingWithForm?.form.projetoId,
        formId: existFormVersion.formId,
        formVersionId: existFormVersion.id,
        occurredAt: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error instanceof AppError || error instanceof FormVersionDoesNotExist) {
        throw error;
      }
      throw new AppError(
        "Erro ao deletar versao de formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
