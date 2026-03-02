import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import * as Z from "zod";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { realtimeGateway } from "@/common/realtime/realtimeGateway";
import { IFormVersionRepository } from "@/modules/FormVersion/repositories/IFormVersionRepository";
import { IFormFieldRepository } from "../repositories/IFormFieldRepository";
import {
  createFormFieldSchema,
  CreateFormFieldInput,
} from "../http/validators/createFormFieldValidator";

interface IRequest {
  data: CreateFormFieldInput;
}

@injectable()
export class CreateFormFieldService {
  @inject(Types.FormFieldRepository)
  private formFieldRepository!: IFormFieldRepository;
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;

  public async execute({ data }: IRequest) {
    try {
      const parsed = createFormFieldSchema.parse(data);

      const created = await this.formFieldRepository.create({
        formVersion: { connect: { id: parsed.formVersionId } },
        name: parsed.name.trim(),
        label: parsed.label.trim(),
        type: parsed.type.trim(),
        required: parsed.required ?? false,
        options: parsed.options ?? undefined,
        ordem: parsed.ordem,
      });

      const formVersion = await this.formVersionRepository.findByIdWithForm(
        created.formVersionId
      );

      realtimeGateway.emitChange({
        action: "created",
        entity: "formField",
        entityId: created.id,
        projetoId: formVersion?.form.projetoId,
        formId: formVersion?.form.id,
        formVersionId: created.formVersionId,
        occurredAt: new Date().toISOString(),
      });

      return created;
    } catch (error: any) {
      if (error instanceof Z.ZodError) {
        throw new AppError(
          "Dados inválidos para criar campo do formulário",
          StatusCodes.BAD_REQUEST
        );
      }

      throw new AppError(
        "Erro ao criar campo do formulário",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
