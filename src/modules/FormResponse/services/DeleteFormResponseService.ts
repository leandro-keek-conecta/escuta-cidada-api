import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { realtimeGateway } from "@/common/realtime/realtimeGateway";
import { IFormVersionRepository } from "@/modules/FormVersion/repositories/IFormVersionRepository";
import { FormResponseDoesNotExist } from "../errors/FormResponseDoesNotExist";
import { IFormResponseRepository } from "../repositories/IFormResponseRepository";

@injectable()
export class DeleteFormResponseService {
  @inject(Types.FormResponseRepository)
  private formResponseRepository!: IFormResponseRepository;
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;

  public async execute(id: number): Promise<void> {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id de resposta invalido", StatusCodes.BAD_REQUEST);
      }

      const existingResponse = await this.formResponseRepository.findById(id);

      if (!existingResponse) {
        throw new FormResponseDoesNotExist();
      }

      const formVersion = await this.formVersionRepository.findByIdWithForm(
        existingResponse.formVersionId
      );

      await this.formResponseRepository.delete(id);

      realtimeGateway.emitChange({
        action: "deleted",
        entity: "formResponse",
        entityId: existingResponse.id,
        projetoId: existingResponse.projetoId,
        formId: formVersion?.form.id,
        formVersionId: existingResponse.formVersionId,
        occurredAt: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error instanceof AppError || error instanceof FormResponseDoesNotExist) {
        throw error;
      }

      throw new AppError(
        "Erro ao deletar resposta de formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
