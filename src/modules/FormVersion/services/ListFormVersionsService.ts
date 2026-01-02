import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import { IFormVersionRepository } from "../repositories/IFormVersionRepository";
import { FormVersion } from "@prisma/client";

@injectable()
export class ListFormVersionsService {
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;

  public async execute(formId?: number): Promise<FormVersion[]> {
    try {
      const response = await this.formVersionRepository.getFormVersions(
        formId ? { formId } : undefined
      );
      return response ?? [];
    } catch (error: any) {
      throw new Error("Erro ao listar FormVersion: " + error.message);
    }
  }
}
