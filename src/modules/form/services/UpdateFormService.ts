import { inject, injectable } from "inversify";
import { Prisma } from "@prisma/client";
import * as Z from "zod";
import { StatusCodes } from "http-status-codes";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { IFormsRepository } from "../repositories/IFormRepository";
import { updateFormSchema, UpdateFormInput } from "../http/validators/updateFormValidator";
import { FormDoesNotExist } from "../errors/FormDoesNotExist";

interface IRequest {
  id: number;
  data: UpdateFormInput;
}

@injectable()
export class UpdateFormService {
  @inject(Types.FormsRepository) private formRepository!: IFormsRepository;

  public async execute({ id, data }: IRequest) {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id do form invalido", StatusCodes.BAD_REQUEST);
      }

      const existing = await this.formRepository.findById(id);
      if (!existing) {
        throw new FormDoesNotExist();
      }

      const parsed = updateFormSchema.parse(data);
      const { name, description, projetoId, versions } = parsed;

      const updateData: Prisma.FormUpdateInput = {
        updatedAt: new Date(),
      };

      if (name !== undefined) {
        updateData.name = name.trim();
      }
      if (description !== undefined) {
        updateData.description = description?.trim();
      }
      if (projetoId !== undefined) {
        updateData.projeto = { connect: { id: projetoId } };
      }

      if (versions !== undefined) {
        updateData.versions = {
          deleteMany: {},
          create: versions.map((version) => ({
            version: version.version,
            schema: version.schema ?? {},
            isActive: version.isActive ?? true,
            fields:
              version.fields && version.fields.length > 0
                ? {
                    create: version.fields.map((field) => ({
                      name: field.name.trim(),
                      label: field.label.trim(),
                      type: field.type.trim(),
                      required: field.required ?? false,
                      options: field.options ?? undefined,
                      ordem: field.ordem,
                    })),
                  }
                : undefined,
          })),
        };
      }

      const updated = await this.formRepository.updateForm(id, updateData);
      return updated;
    } catch (error: any) {
      if (error instanceof Z.ZodError) {
        throw new AppError("Dados invalidos para atualizar formulario", StatusCodes.BAD_REQUEST);
      }
      if (error instanceof FormDoesNotExist) {
        throw error;
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Erro ao atualizar formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
