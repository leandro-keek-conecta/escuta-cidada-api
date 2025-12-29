import { inject, injectable } from "inversify";
import Types from "@/common/container/types";
import { IFormsRepository } from "../repositories/IFormRepository";

@injectable()
export class ListFormsService {
  @inject(Types.FormsRepository) private formRepository!: IFormsRepository;

  public async execute(projetoId?: number) {
    try {
      const forms = await this.formRepository.getForms(
        projetoId ? { projetoId } : undefined
      );

      return forms ?? [];
    } catch (error: any) {
      throw new Error("Erro ao listar formularios: " + error.message);
    }
  }
}
