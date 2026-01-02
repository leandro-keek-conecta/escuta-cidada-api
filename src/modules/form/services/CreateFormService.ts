import { inject, injectable } from "inversify";
import { Prisma } from "@prisma/client";
import * as Z from "zod";
import { StatusCodes } from "http-status-codes";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { IFormsRepository } from "../repositories/IFormRepository";
import {
  CreateFormInput,
  createFormSchema,
} from "../http/validators/createFormValidator";

interface IRequest {
  data: CreateFormInput;
}

@injectable()
export class CreateFormService {
  @inject(Types.FormsRepository) private formRepository!: IFormsRepository;

  public async execute({ data }: IRequest) {
    try {
      const parsed = createFormSchema.parse(data);
      const { name, description, projetoId, initialVersion } = parsed;

      const formData: Prisma.FormCreateInput = {
        name: name.trim(),
        description: description?.trim(),
        projeto: { connect: { id: projetoId } },
        versions: {
          create: [
            {
              version: 1,
              schema: initialVersion?.schema ?? {},
              isActive: initialVersion?.isActive ?? true,
              fields:
                initialVersion?.fields && initialVersion.fields.length > 0
                  ? {
                      create: initialVersion.fields.map((field) => ({
                        name: field.name.trim(),
                        label: field.label.trim(),
                        type: field.type.trim(),
                        required: field.required ?? false,
                        options: field.options ?? undefined,
                        ordem: field.ordem,
                      })),
                    }
                  : undefined,
            },
          ],
        },
      };

      const created = await this.formRepository.create(formData);
      return created;
    } catch (error: any) {
      if (error instanceof Z.ZodError) {
        throw new AppError("Dados invalidos para criar formulario", StatusCodes.BAD_REQUEST);
      }

      throw new AppError(
        "Erro ao criar formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
