import { FormResponseStatus } from "@prisma/client";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import * as Z from "zod";
import AppError from "@/common/errors/AppError";
import Types from "@/common/container/types";
import { IFormResponseRepository } from "../repositories/IFormResponseRepository";
import {
  createFormResponseSchema,
  CreateFormResponseInput,
} from "../http/validators/createFormResponseValidator";
import { createDynamicSchema } from "../utils/createDynamicSchema";
import { buildResponseFieldData } from "../utils/buildResponseFieldData";
import { IFormVersionRepository } from "@/modules/FormVersion/repositories/IFormVersionRepository";
import { IFormFieldRepository } from "@/modules/formField/repositories/IFormFieldRepository";

interface IRequest {
  data: CreateFormResponseInput;
}

@injectable()
export class CreateFormResponseService {
  @inject(Types.FormResponseRepository)
  private formResponseRepository!: IFormResponseRepository;
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;
  @inject(Types.FormFieldRepository)
  private formFieldRepository!: IFormFieldRepository;

  public async execute({ data }: IRequest) {
    try {
      const parsed = createFormResponseSchema.parse(data);
      const formVersion = await this.formVersionRepository.findById(
        parsed.formVersionId
      );

      if (!formVersion) {
        throw new AppError(
          "Versao do formulario nao encontrada",
          StatusCodes.NOT_FOUND
        );
      }

      const fieldsDefinition = Array.isArray(formVersion.schema)
        ? (formVersion.schema as any[])
        : [];
      const definitionByName = new Map(
        fieldsDefinition.map((field) => [field.name, field])
      );

      let cleanData: Record<string, unknown> = {};
      if (parsed.fields) {
        const dynamicSchema = createDynamicSchema(fieldsDefinition);
        const validationResult = dynamicSchema.safeParse(parsed.fields);

        if (!validationResult.success) {
          throw new AppError(
            JSON.stringify(validationResult.error.format()),
            StatusCodes.BAD_REQUEST
          );
        }

        cleanData = validationResult.data;
      }

      const formFields = await this.formFieldRepository.findByFormVersionId(
        parsed.formVersionId
      );
      const fieldIdByName = new Map(
        formFields.map((field) => [field.name, field.id])
      );

      const fieldsToCreate = Object.entries(cleanData).map(([key, value]) =>
        buildResponseFieldData({
          fieldName: key,
          value,
          fieldId: fieldIdByName.get(key),
          fieldDefinition: definitionByName.get(key),
        })
      );

      const hasFields = fieldsToCreate.length > 0;
      const inferredStatus =
        parsed.status ??
        (parsed.submittedAt || parsed.completedAt || hasFields
          ? FormResponseStatus.COMPLETED
          : FormResponseStatus.STARTED);
      const now = new Date();

      return await this.formResponseRepository.create({
        projetoId: parsed.projetoId,
        formVersionId: parsed.formVersionId,
        userId: parsed.userId,
        ip: parsed.ip,
        userAgent: parsed.userAgent,
        status: inferredStatus,
        startedAt: parsed.startedAt ?? now,
        completedAt:
          parsed.completedAt ??
          (inferredStatus === FormResponseStatus.COMPLETED ? now : undefined),
        submittedAt:
          parsed.submittedAt ??
          (inferredStatus === FormResponseStatus.COMPLETED ? now : undefined),
        source: parsed.source,
        channel: parsed.channel,
        utmSource: parsed.utmSource,
        utmMedium: parsed.utmMedium,
        utmCampaign: parsed.utmCampaign,
        deviceType: parsed.deviceType,
        os: parsed.os,
        browser: parsed.browser,
        locale: parsed.locale,
        timezone: parsed.timezone,
        metadata: parsed.metadata,
        fields: hasFields
          ? {
              create: fieldsToCreate,
            }
          : undefined,
      });
    } catch (error) {
      if (error instanceof Z.ZodError) {
        throw new AppError(
          "Dados invalidos para criar resposta de formulario",
          StatusCodes.BAD_REQUEST
        );
      }

      if (error instanceof AppError) {
        throw error;
      }

      console.error(error);
      throw new AppError(
        "Erro ao salvar resposta no banco de dados",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
