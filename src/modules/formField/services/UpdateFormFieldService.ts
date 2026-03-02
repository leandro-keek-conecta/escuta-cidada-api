import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import * as Z from "zod";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { realtimeGateway } from "@/common/realtime/realtimeGateway";
import { IFormVersionRepository } from "@/modules/FormVersion/repositories/IFormVersionRepository";
import { IFormFieldRepository } from "../repositories/IFormFieldRepository";
import { FormFieldDoesNotExist } from "../errors/FormFieldDoesNotExist";
import { updateFormFieldSchema, UpdateFormFieldInput } from "../http/validators/updateFormFieldValidator";

interface IRequest {
  id: number;
  data: UpdateFormFieldInput;
}

@injectable()
export class UpdateFormFieldService {
  @inject(Types.FormFieldRepository) private formFieldRepository!: IFormFieldRepository;
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;

  public async execute({ id, data }: IRequest) {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id do campo inválido", StatusCodes.BAD_REQUEST);
      }

      const existing = await this.formFieldRepository.findById(id);
      if (!existing) {
        throw new FormFieldDoesNotExist();
      }

      const parsed = updateFormFieldSchema.parse(data);

      const updated = await this.formFieldRepository.updateFormField(id, {
        name: parsed.name?.trim(),
        label: parsed.label?.trim(),
        type: parsed.type?.trim(),
        required: parsed.required,
        options: parsed.options,
        ordem: parsed.ordem,
        formVersion: parsed.formVersionId
          ? { connect: { id: parsed.formVersionId } }
          : undefined,
      });

      const currentFormVersion = await this.formVersionRepository.findByIdWithForm(
        updated.formVersionId
      );
      const previousFormVersion =
        existing.formVersionId !== updated.formVersionId
          ? await this.formVersionRepository.findByIdWithForm(
              existing.formVersionId
            )
          : null;

      realtimeGateway.emitChange(
        {
          action: "updated",
          entity: "formField",
          entityId: updated.id,
          projetoId: currentFormVersion?.form.projetoId,
          formId: currentFormVersion?.form.id,
          formVersionId: updated.formVersionId,
          occurredAt: new Date().toISOString(),
        },
        {
          additionalScopes: previousFormVersion
            ? [
                {
                  projetoId: previousFormVersion.form.projetoId,
                  formId: previousFormVersion.form.id,
                  formVersionId: previousFormVersion.id,
                },
              ]
            : undefined,
        }
      );

      return updated;
    } catch (error: any) {
      if (error instanceof Z.ZodError) {
        throw new AppError(
          "Dados inválidos para atualizar campo do formulário",
          StatusCodes.BAD_REQUEST
        );
      }
      if (error instanceof AppError || error instanceof FormFieldDoesNotExist) {
        throw error;
      }
      throw new AppError(
        "Erro ao atualizar campo do formulário",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
