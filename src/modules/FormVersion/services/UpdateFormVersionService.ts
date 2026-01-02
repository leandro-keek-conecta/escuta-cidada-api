import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import * as Z from "zod";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { FormVersionDoesNotExist } from "../errors/FormVersionDoesNotExist";
import { updateFormVersionSchema, UpdateFormVersionInput } from "../http/validators/updateFormVersionValidator";
import { IFormVersionRepository } from "../repositories/IFormVersionRepository";

interface IRequest {
  id: number;
  data: UpdateFormVersionInput;
}

@injectable()
export class UpdateFormVersionService {
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;

  public async execute({ id, data }: IRequest) {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id da versao invalido", StatusCodes.BAD_REQUEST);
      }

      const existing = await this.formVersionRepository.findById(id);
      if (!existing) {
        throw new FormVersionDoesNotExist();
      }

      const parsed = updateFormVersionSchema.parse(data);
      const { version, schema, isActive, fields } = parsed;

      const updateData: Prisma.FormVersionUpdateInput = {};

      if (version !== undefined) {
        updateData.version = version;
      }
      if (schema !== undefined) {
        updateData.schema = schema;
      }
      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }
      if (fields !== undefined) {
        updateData.fields = {
          deleteMany: {},
          create: fields.map((field) => ({
            name: field.name.trim(),
            label: field.label.trim(),
            type: field.type.trim(),
            required: field.required ?? false,
            options: field.options ?? undefined,
            ordem: field.ordem,
          })),
        };
      }

      const updated = await this.formVersionRepository.updateFormVersion(
        id,
        updateData
      );

      return updated;
    } catch (error: any) {
      if (error instanceof Z.ZodError) {
        throw new AppError(
          "Dados invalidos para atualizar versao de formulario",
          StatusCodes.BAD_REQUEST
        );
      }
      if (error instanceof FormVersionDoesNotExist) {
        throw error;
      }
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Erro ao atualizar versao de formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
