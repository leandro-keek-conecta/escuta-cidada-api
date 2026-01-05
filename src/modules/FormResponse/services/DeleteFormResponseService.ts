import { inject, injectable } from "inversify";
import Types from "@/common/container/types";
import { IFormResponseRepository } from "../repositories/IFormResponseRepository";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import { FormResponseDoesNotExist } from "../errors/FormResponseDoesNotExist";

@injectable()
export class DeleteFormResponseService {
  @inject(Types.FormResponseRepository) private formResponseRepository!: IFormResponseRepository;

  public async execute(id: number): Promise<void> {
    try {
      const existFormResonse = await this.formResponseRepository.findById(id);
      
      if (!existFormResonse) {
        throw new FormResponseDoesNotExist();
      }
      await this.formResponseRepository.delete(id);
    } catch (error: any) {
      throw new AppError(
        "Erro ao deletar resposta de formulário",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
