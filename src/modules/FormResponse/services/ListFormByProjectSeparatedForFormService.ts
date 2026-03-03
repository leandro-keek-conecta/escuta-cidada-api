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

type ResponsesGroupedByForm = {
  formId: number;
  formName: string;
  formVersionIds: number[];
  totalResponses: number;
  latestResponseAt: string | null;
  responses: FormResponseWithForm[];
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

        if (existingGroup) {
          existingGroup.responses.push(response);
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
          responses: [response],
        });
      }

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
      console.error("Erro no ListFormByProjectSeparatedForFormService:", error);
      throw new AppError(
        "Erro ao listar respostas do projeto por formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
