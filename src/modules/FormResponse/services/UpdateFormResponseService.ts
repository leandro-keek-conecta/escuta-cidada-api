import { FormResponseStatus, Prisma } from "@prisma/client";
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
import { buildResponseFieldData } from "../utils/buildResponseFieldData";
import { IFormFieldRepository } from "@/modules/formField/repositories/IFormFieldRepository";

interface IRequest {
  id: number;
  data: UpdateFormResponseInput;
}

@injectable()
export class UpdateFormResponseService {
  @inject(Types.FormResponseRepository)
  private formResponseRepository!: IFormResponseRepository;
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;
  @inject(Types.FormFieldRepository)
  private formFieldRepository!: IFormFieldRepository;

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
      const updateData: Prisma.FormResponseUpdateInput = {};
      const now = new Date();

      let fieldsToCreate:
        | {
            fieldName: string;
            fieldId?: number;
            value?: string | null;
            valueNumber?: number | null;
            valueBool?: boolean | null;
            valueDate?: Date | null;
            valueJson?: Prisma.InputJsonValue;
          }[]
        | undefined;

      if (parsed.fields) {
        const formVersion = await this.formVersionRepository.findById(
          existing.formVersionId
        );

        if (!formVersion) {
          throw new AppError(
            "Versão do formulário não encontrada",
            StatusCodes.NOT_FOUND
          );
        }

        const formFields = await this.formFieldRepository.findByFormVersionId(
          existing.formVersionId
        );
        const dynamicSchema = createDynamicSchema(formFields, {
          ignoreRequired: parsed.status === FormResponseStatus.STARTED,
        });
        const validationResult = dynamicSchema.safeParse(parsed.fields);

        if (!validationResult.success) {
          throw new AppError(
            JSON.stringify(validationResult.error.format()),
            StatusCodes.BAD_REQUEST
          );
        }

        const cleanData = validationResult.data;

        const fieldIdByName = new Map(
          formFields.map((field) => [field.name, field.id])
        );
        const definitionByName = new Map(
          formFields.map((field) => [field.name, field])
        );

        fieldsToCreate = Object.entries(cleanData).map(([key, value]) =>
          buildResponseFieldData({
            fieldName: key,
            value,
            fieldId: fieldIdByName.get(key),
            fieldDefinition: definitionByName.get(key),
          })
        );
      }

      if (
        parsed.projetoId === undefined &&
        parsed.userId === undefined &&
        parsed.ip === undefined &&
        parsed.userAgent === undefined &&
        parsed.status === undefined &&
        parsed.startedAt === undefined &&
        parsed.completedAt === undefined &&
        parsed.submittedAt === undefined &&
        parsed.source === undefined &&
        parsed.channel === undefined &&
        parsed.utmSource === undefined &&
        parsed.utmMedium === undefined &&
        parsed.utmCampaign === undefined &&
        parsed.deviceType === undefined &&
        parsed.os === undefined &&
        parsed.browser === undefined &&
        parsed.locale === undefined &&
        parsed.timezone === undefined &&
        parsed.metadata === undefined &&
        !fieldsToCreate
      ) {
        throw new AppError(
          "Nenhum dado fornecido para atualizar a resposta",
          StatusCodes.BAD_REQUEST
        );
      }

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

      if (parsed.status !== undefined) {
        updateData.status = parsed.status;
      }

      if (parsed.startedAt !== undefined) {
        updateData.startedAt = parsed.startedAt;
      }

      if (parsed.completedAt !== undefined) {
        updateData.completedAt = parsed.completedAt;
      }

      if (parsed.submittedAt !== undefined) {
        updateData.submittedAt = parsed.submittedAt;
      }

      if (
        parsed.status === undefined &&
        (parsed.completedAt || parsed.submittedAt)
      ) {
        updateData.status = FormResponseStatus.COMPLETED;
      }

      if (parsed.status === FormResponseStatus.COMPLETED) {
        updateData.completedAt = updateData.completedAt ?? now;
        updateData.submittedAt = updateData.submittedAt ?? now;
      }

      if (parsed.source !== undefined) {
        updateData.source = parsed.source;
      }

      if (parsed.channel !== undefined) {
        updateData.channel = parsed.channel;
      }

      if (parsed.utmSource !== undefined) {
        updateData.utmSource = parsed.utmSource;
      }

      if (parsed.utmMedium !== undefined) {
        updateData.utmMedium = parsed.utmMedium;
      }

      if (parsed.utmCampaign !== undefined) {
        updateData.utmCampaign = parsed.utmCampaign;
      }

      if (parsed.deviceType !== undefined) {
        updateData.deviceType = parsed.deviceType;
      }

      if (parsed.os !== undefined) {
        updateData.os = parsed.os;
      }

      if (parsed.browser !== undefined) {
        updateData.browser = parsed.browser;
      }

      if (parsed.locale !== undefined) {
        updateData.locale = parsed.locale;
      }

      if (parsed.timezone !== undefined) {
        updateData.timezone = parsed.timezone;
      }

      if (parsed.metadata !== undefined) {
        updateData.metadata = parsed.metadata;
      }

      if (fieldsToCreate) {
        updateData.fields = {
          deleteMany: {},
          create: fieldsToCreate,
        };
      }

      return await this.formResponseRepository.update(id, updateData);
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
