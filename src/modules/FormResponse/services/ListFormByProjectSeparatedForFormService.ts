import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import { inject, injectable } from "inversify";
import {
  FormResponseWithForm,
  IFormResponseRepository,
} from "../repositories/IFormResponseRepository";

type ListFormByProjectSeparatedForFormInput = {
  projectId: number;
  formId?: number;
};

export type FlattenedGroupedFormResponse = {
  id: number;
  usuario_id: number | string | null;
  horario: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  [key: string]: unknown;
};

type ResponsesGroupedByForm = {
  formId: number;
  formName: string;
  formVersionIds: number[];
  totalResponses: number;
  latestResponseAt: string | null;
  responses: FlattenedGroupedFormResponse[];
};

export type GroupedResponsesByProjectResult = {
  projectId: number;
  selectedFormId: number | null;
  totalResponses: number;
  totalForms: number;
  forms: ResponsesGroupedByForm[];
};

@injectable()
export class ListFormByProjectSeparatedForFormService {
  @inject(Types.FormResponseRepository) private formResponseRepository !: IFormResponseRepository;

  private normalizeFieldValue(
    field: FormResponseWithForm["fields"][number]
  ): unknown {
    return (
      field.value ??
      field.valueJson ??
      field.valueNumber ??
      field.valueBool ??
      (field.valueDate ? field.valueDate.toISOString() : null)
    );
  }

  private flattenResponse(
    response: FormResponseWithForm
  ): FlattenedGroupedFormResponse {
    const flattened: FlattenedGroupedFormResponse = {
      id: response.id,
      usuario_id: response.userId ?? null,
      horario: null,
      startedAt: response.startedAt ? response.startedAt.toISOString() : null,
      submittedAt: response.submittedAt
        ? response.submittedAt.toISOString()
        : null,
      completedAt: response.completedAt
        ? response.completedAt.toISOString()
        : null,
      createdAt: response.createdAt ? response.createdAt.toISOString() : null,
    };

    for (const field of response.fields) {
      flattened[field.fieldName] = this.normalizeFieldValue(field);
    }

    if (flattened.horario === null && typeof flattened.horario_opiniao === "string") {
      flattened.horario = flattened.horario_opiniao;
    }

    if (flattened.horario === null) {
      flattened.horario =
        flattened.submittedAt ??
        flattened.createdAt ??
        flattened.startedAt ??
        null;
    }

    return flattened;
  }

  public async execute({
    projectId,
    formId,
  }: ListFormByProjectSeparatedForFormInput): Promise<GroupedResponsesByProjectResult> {
    try {
      const responses = await this.formResponseRepository.listByProjectId({
        projectId,
        formId,
      });
      const groupedByForm = new Map<number, ResponsesGroupedByForm>();

      for (const response of responses) {
        const currentFormId = response.formVersion.form.id;
        const existingGroup = groupedByForm.get(currentFormId);
        const responseDate =
          response.submittedAt ??
          response.completedAt ??
          response.startedAt ??
          response.createdAt;
        const flattenedResponse = this.flattenResponse(response);

        if (existingGroup) {
          existingGroup.responses.push(flattenedResponse);
          existingGroup.totalResponses += 1;
          if (!existingGroup.formVersionIds.includes(response.formVersionId)) {
            existingGroup.formVersionIds.push(response.formVersionId);
          }
          if (
            responseDate &&
            (!existingGroup.latestResponseAt ||
              new Date(responseDate).getTime() >
                new Date(existingGroup.latestResponseAt).getTime())
          ) {
            existingGroup.latestResponseAt = responseDate.toISOString();
          }
          continue;
        }

        groupedByForm.set(currentFormId, {
          formId: currentFormId,
          formName: response.formVersion.form.name,
          formVersionIds: [response.formVersionId],
          totalResponses: 1,
          latestResponseAt: responseDate ? responseDate.toISOString() : null,
          responses: [flattenedResponse],
        });
      }

      console.log()

      const forms = Array.from(groupedByForm.values()).sort(
        (left, right) => right.totalResponses - left.totalResponses
      );

      return {
        projectId,
        selectedFormId: formId ?? null,
        totalResponses: responses.length,
        totalForms: forms.length,
        forms,
      };
    } catch (error) {
      console.error("Erro no ListFormByProjectSeparatedForFormService: - ListFormByProjectSeparatedForFormService.ts:157", error);
      throw new AppError(
        "Erro ao listar respostas do projeto por formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
