import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import * as Z from "zod";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { IFormVersionRepository } from "@/modules/FormVersion/repositories/IFormVersionRepository";
import { createDynamicSchema } from "../utils/createDynamicSchema";
import { IFormResponseRepository } from "../repositories/IFormResponseRepository";
import {
  updateFormResponseSchema,
  UpdateFormResponseInput,
} from "../http/validators/updateFormResponseValidator";
import { FormResponseDoesNotExist } from "../errors/FormResponseDoesNotExist";

interface IRequest {
  id: number;
  data: UpdateFormResponseInput;
}

@injectable()
export class UpdateFormResponseService {
  @inject(Types.FormResponseRepository) private formResponseRepository!: IFormResponseRepository;
  @inject(Types.FormVersionRepository) private formVersionRepository!: IFormVersionRepository;

  public async execute({ id, data }: IRequest) {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id de resposta invalido", StatusCodes.BAD_REQUEST);
      }

      const existing = await this.formResponseRepository.findById(id);
      if (!existing) {
        throw new FormResponseDoesNotExist();
      }

      const parsed = updateFormResponseSchema.parse(data);

      let fieldsToCreate:
        | { fieldName: string; value: string }[]
        | undefined;

      if (parsed.fields) {
        const formVersion = await this.formVersionRepository.findById(
          existing.formVersionId
        );

        if (!formVersion) {
          throw new AppError(
            "Versao do formulario nao encontrada",
            StatusCodes.NOT_FOUND
          );
        }

        const fieldsDefinition = formVersion.schema as any[];
        const dynamicSchema = createDynamicSchema(fieldsDefinition);
        const validationResult = dynamicSchema.safeParse(parsed.fields);

        if (!validationResult.success) {
          throw new AppError(
            JSON.stringify(validationResult.error.format()),
            StatusCodes.BAD_REQUEST
          );
        }

        const cleanData = validationResult.data;

        fieldsToCreate = Object.entries(cleanData).map(([key, value]) => {
          let strValue = String(value);
          if (value instanceof Date) {
            strValue = value.toISOString();
          }

          return {
            fieldName: key,
            value: strValue,
          };
        });
      }

      if (
        parsed.projetoId === undefined &&
        parsed.userId === undefined &&
        parsed.ip === undefined &&
        parsed.userAgent === undefined &&
        !fieldsToCreate
      ) {
        throw new AppError(
          "Nenhum dado fornecido para atualizar a resposta",
          StatusCodes.BAD_REQUEST
        );
      }

      const updateData: Prisma.FormResponseUpdateInput = {};

      if (parsed.projetoId !== undefined) {
        updateData.projeto = { connect: { id: parsed.projetoId } };
      }

      if (parsed.userId !== undefined) {
        updateData.user =
          parsed.userId !== null
            ? { connect: { id: parsed.userId } }
            : { disconnect: true };
      }

      if (parsed.ip !== undefined) {
        updateData.ip = parsed.ip;
      }

      if (parsed.userAgent !== undefined) {
        updateData.userAgent = parsed.userAgent;
      }

      if (fieldsToCreate) {
        updateData.fields = {
          deleteMany: {},
          create: fieldsToCreate,
        };
      }

      const updated = await this.formResponseRepository.update(id, updateData);

      return updated;
    } catch (error: any) {
      if (error instanceof Z.ZodError) {
        throw new AppError(
          "Dados invalidos para atualizar resposta de formulario",
          StatusCodes.BAD_REQUEST
        );
      }

      if (error instanceof FormResponseDoesNotExist) {
        throw error;
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Erro ao atualizar resposta do formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
