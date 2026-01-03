import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import { IFormFieldRepository } from "../repositories/IFormFieldRepository";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import { FormFieldDoesNotExist } from "../errors/FormFieldDoesNotExist";

@injectable()
export class DeleteFormFieldService {
  @inject(Types.FormFieldRepository)
  private formFieldRepository!: IFormFieldRepository;

  public async execute(id: number): Promise<void> {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id do form invalido", StatusCodes.BAD_REQUEST);
      }

      const existing = await this.formFieldRepository.findById(id);
      if (!existing) {
        throw new FormFieldDoesNotExist();
      }

      await this.formFieldRepository.delete(id);
    } catch (error: any) {
      if (error instanceof AppError || error instanceof FormFieldDoesNotExist) {
        throw error;
      }
      throw new AppError(
        "Erro ao deletar campos do formulario",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
