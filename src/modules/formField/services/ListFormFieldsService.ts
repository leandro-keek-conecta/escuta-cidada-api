import { inject, injectable } from "inversify";
import Types from "@/common/container/types";
import { IFormFieldRepository } from "../repositories/IFormFieldRepository";

@injectable()
export class ListFormFieldsService {
  @inject(Types.FormFieldRepository) private formFieldRepository!: IFormFieldRepository;

  public async execute() {
    try {
      const fields = await this.formFieldRepository.getFormsField();
      return fields ?? [];
    } catch (error: any) {
      throw new Error("Erro ao listar campos do formulário: " + error.message);
    }
  }
}
