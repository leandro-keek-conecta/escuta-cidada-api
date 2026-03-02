import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";
import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { CreateFormResponseService } from "@/modules/FormResponse/services/CreateFormResponseService";
import { SubmitFormResponseInput } from "@/modules/FormResponse/http/validators/submitFormResponseValidator";
import { PublicFormReadService } from "./PublicFormReadService";

type SubmitBySlugParams = {
  projetoSlug: string;
  formSlug: string;
  data: SubmitFormResponseInput;
  requestIp?: string;
  requestUserAgent?: string;
};

@injectable()
export class SubmitPublicFormResponseService {
  constructor(
    @inject(Types.PublicFormReadService)
    private readonly publicFormReadService: PublicFormReadService,
    @inject(Types.CreateFormResponseService)
    private readonly createFormResponseService: CreateFormResponseService
  ) {}

  async executeBySlug(params: SubmitBySlugParams) {
    const { projetoSlug, formSlug, data, requestIp, requestUserAgent } = params;

    const publicForm = await this.publicFormReadService.getPublicFormBySlug({
      projetoSlug,
      formSlug,
    });

    if (
      data.formVersionId !== undefined &&
      data.formVersionId !== publicForm.activeVersion.id
    ) {
      throw new AppError(
        "formVersionId nao corresponde a versao ativa do formulario publico",
        StatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    return this.createFormResponseService.execute({
      data: {
        formVersionId: publicForm.activeVersion.id,
        projetoId: publicForm.projeto.id,
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        submittedAt: data.submittedAt,
        fields: data.fields,
        ip: data.ip ?? requestIp,
        userAgent: data.userAgent ?? requestUserAgent,
        source: data.source,
        channel: data.channel,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        deviceType: data.deviceType,
        os: data.os,
        browser: data.browser,
        locale: data.locale,
        timezone: data.timezone,
        metadata: data.metadata,
      },
    });
  }
}
