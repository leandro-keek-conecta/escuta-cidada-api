import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes";

import Types from "@/common/container/types";
import AppError from "@/common/errors/AppError";
import { IFormsRepository } from "../repositories/IFormRepository";
import { FormDoesNotExist } from "../errors/FormDoesNotExist";

@injectable()
export class DeleteFormService {
  @inject(Types.FormsRepository) private formRepository!: IFormsRepository;

  public async execute(id: number): Promise<void> {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id do form invalido", StatusCodes.BAD_REQUEST);
      }

      const existing = await this.formRepository.findById(id);
      if (!existing) {
        throw new FormDoesNotExist();
      }

      await this.formRepository.delete(id);
    } catch (error: any) {
      if (error instanceof AppError || error instanceof FormDoesNotExist) {
        throw error;
      }
      throw new AppError(
        "Erro ao deletar formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
