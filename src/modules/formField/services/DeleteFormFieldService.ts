import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import { IFormFieldRepository } from "../repositories/IFormFieldRepository";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import { FormFieldDoesNotExist } from "../errors/FormFieldDoesNotExist";
import { realtimeGateway } from "@/common/realtime/realtimeGateway";
import { IFormVersionRepository } from "@/modules/FormVersion/repositories/IFormVersionRepository";

@injectable()
export class DeleteFormFieldService {
  @inject(Types.FormFieldRepository)
  private formFieldRepository!: IFormFieldRepository;
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;

  public async execute(id: number): Promise<void> {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id do form invalido", StatusCodes.BAD_REQUEST);
      }

      const existing = await this.formFieldRepository.findById(id);
      if (!existing) {
        throw new FormFieldDoesNotExist();
      }

      await this.formFieldRepository.delete(id);
      const formVersion = await this.formVersionRepository.findByIdWithForm(
        existing.formVersionId
      );
      realtimeGateway.emitChange({
        action: "deleted",
        entity: "formField",
        entityId: existing.id,
        projetoId: formVersion?.form.projetoId,
        formId: formVersion?.form.id,
        formVersionId: existing.formVersionId,
        occurredAt: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error instanceof AppError || error instanceof FormFieldDoesNotExist) {
        throw error;
      }
      throw new AppError(
        "Erro ao deletar campos do formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
