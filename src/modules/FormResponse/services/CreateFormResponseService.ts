import { FormResponseStatus } from "@prisma/client";
import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import * as Z from "zod";
import AppError from "@/common/errors/AppError";
import Types from "@/common/container/types";
import { realtimeGateway } from "@/common/realtime/realtimeGateway";
import { IFormResponseRepository } from "../repositories/IFormResponseRepository";
import {
  createFormResponseSchema,
  CreateFormResponseInput,
} from "../http/validators/createFormResponseValidator";
import { createDynamicSchema } from "../utils/createDynamicSchema";
import { buildResponseFieldEntries } from "../utils/buildResponseFieldEntries";
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
      const formVersion = await this.formVersionRepository.findByIdWithForm(
        parsed.formVersionId
      );

      if (!formVersion) {
        throw new AppError(
          "Versão do formulário não encontrada",
          StatusCodes.NOT_FOUND
        );
      }

      if (formVersion.form.projetoId !== parsed.projetoId) {
        throw new AppError(
          "Versao do formulario nao pertence ao projeto informado",
          StatusCodes.UNPROCESSABLE_ENTITY
        );
      }

      let cleanData: Record<string, unknown> = {};
      const formFields = await this.formFieldRepository.findByFormVersionId(
        parsed.formVersionId
      );
      const fieldIdByName = new Map(
        formFields.map((field) => [field.name, field.id])
      );
      const definitionByName = new Map(
        formFields.map((field) => [field.name, field])
      );

      if (parsed.fields) {
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

        cleanData = validationResult.data;
      }

      const fieldsToCreate = buildResponseFieldEntries({
        cleanData,
        fieldIdByName,
        definitionByName,
      });

      const hasFields = fieldsToCreate.length > 0;
      const inferredStatus =
        parsed.status ??
        (parsed.submittedAt || parsed.completedAt || hasFields
          ? FormResponseStatus.COMPLETED
          : FormResponseStatus.STARTED);
      const now = new Date();
      const referenceDate =
        parsed.createdAt ??
        parsed.submittedAt ??
        parsed.completedAt ??
        parsed.startedAt ??
        now;

      const created = await this.formResponseRepository.create({
        projetoId: parsed.projetoId,
        formVersionId: parsed.formVersionId,
        userId: parsed.userId,
        createdAt: parsed.createdAt ?? referenceDate,
        ip: parsed.ip,
        userAgent: parsed.userAgent,
        status: inferredStatus,
        startedAt: parsed.startedAt ?? referenceDate,
        completedAt:
          parsed.completedAt ??
          (inferredStatus === FormResponseStatus.COMPLETED
            ? referenceDate
            : undefined),
        submittedAt:
          parsed.submittedAt ??
          (inferredStatus === FormResponseStatus.COMPLETED
            ? referenceDate
            : undefined),
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

      realtimeGateway.emitChange({
        action: "created",
        entity: "formResponse",
        entityId: created.id,
        projetoId: created.projetoId,
        formId: formVersion.form.id,
        formVersionId: created.formVersionId,
        occurredAt: new Date().toISOString(),
      });

      return created;
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
