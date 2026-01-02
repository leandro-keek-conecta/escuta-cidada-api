import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import * as Z from "zod";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { createFormVersionSchema, CreateFormVersionInput } from "../http/validators/createFormVersionValidator";
import { IFormVersionRepository } from "../repositories/IFormVersionRepository";

interface IRequest {
  data: CreateFormVersionInput;
}

@injectable()
export class CreateFormVersionService {
  @inject(Types.FormVersionRepository) private formVersionRepository!: IFormVersionRepository;

  public async execute({ data }: IRequest) {
    try {
      const parsed = createFormVersionSchema.parse(data);
      const { formId, version, schema, isActive, fields } = parsed;

      const formVersionData: Prisma.FormVersionCreateInput = {
        version,
        schema: schema ?? {},
        isActive: isActive ?? true,
        form: { connect: { id: formId } },
        fields:
          fields && fields.length > 0
            ? {
                create: fields.map((field) => ({
                  name: field.name.trim(),
                  label: field.label.trim(),
                  type: field.type.trim(),
                  required: field.required ?? false,
                  options: field.options ?? undefined,
                  ordem: field.ordem,
                })),
              }
            : undefined,
      };

      const created = await this.formVersionRepository.create(formVersionData);
      return created;
    } catch (error: any) {
      if (error instanceof Z.ZodError) {
        throw new AppError(
          "Dados invalidos para criar versao de formulario",
          StatusCodes.BAD_REQUEST
        );
      }

      throw new AppError(
        "Erro ao criar versao de formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
