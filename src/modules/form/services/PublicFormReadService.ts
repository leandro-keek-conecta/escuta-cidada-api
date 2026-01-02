import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { IPublicFormReadRepository } from "../repositories/IPublicFormReadRepository";

type PublicFormDTO = {
  projeto: { slug: string; name: string; corHex: string | null };
  form: { id: number; name: string; description: string | null };
  activeVersion: {
    id: number;
    version: number;
    schema: any;
    fields: Array<{
      id: number;
      name: string;
      label: string;
      type: string;
      required: boolean;
      options: any;
      ordem: number;
    }>;
  };
};

@injectable()
export class PublicFormReadService {
  @inject(Types.PublicFormReadRepository)
  private readonly repository!: IPublicFormReadRepository;

  public async getPublicFormById(params: {
    projetoSlug: string;
    formId: number;
  }): Promise<PublicFormDTO> {
    const { projetoSlug, formId } = params;

    const projeto = await this.repository.getProjetoBySlug(projetoSlug);
    if (!projeto) {
      throw new AppError("Projeto não encontrado", StatusCodes.NOT_FOUND);
    }

    if (!projeto.ativo) {
      throw new AppError("Projeto inativo", StatusCodes.FORBIDDEN);
    }

    const form = await this.repository.getActiveFormByProjetoAndId({
      projetoId: projeto.id,
      formId,
    });

    if (!form) {
      throw new AppError("Formulário não encontrado", StatusCodes.NOT_FOUND);
    }

    const activeVersion = form.versions[0];
    if (!activeVersion) {
      throw new AppError(
        "Formulário sem versão ativa",
        StatusCodes.NOT_FOUND
      );
    }

    return {
      projeto: {
        slug: projeto.slug,
        name: projeto.name,
        corHex: projeto.corHex,
      },
      form: {
        id: form.id,
        name: form.name,
        description: form.description ?? null,
      },
      activeVersion: {
        id: activeVersion.id,
        version: activeVersion.version,
        schema: activeVersion.schema,
        fields: activeVersion.fields.map((field) => ({
          id: field.id,
          name: field.name,
          label: field.label,
          type: field.type,
          required: field.required,
          options: field.options,
          ordem: field.ordem,
        })),
      },
    };
  }
}
