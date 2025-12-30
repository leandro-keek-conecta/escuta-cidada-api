import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import { IFormVersionRepository } from "../repositories/IFormVersionRepository";
import { FormVersion } from "@prisma/client";
import { FormDoesNotExist } from "@/modules/form/errors/FormDoesNotExist";

@injectable()
export class ListFormVersionsService {
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;

  public async execute(): Promise<FormVersion[]> {
    try {
      const response = await this.formVersionRepository.getFormVersions();
      if (!response) {
        throw new FormDoesNotExist();
      }
      return response;
    } catch (error: any) {
      throw new Error("Erro ao listar FormVersion: " + error.message);
    }
  }
}
