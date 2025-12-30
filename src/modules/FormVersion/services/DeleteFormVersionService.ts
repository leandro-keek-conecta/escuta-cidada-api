import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import { IFormVersionRepository } from "../repositories/IFormVersionRepository";
import { error } from "console";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import { FormDoesNotExist } from "@/modules/form/errors/FormDoesNotExist";

interface IRequest {
  id: number;
}

@injectable()
export class DeleteFormVersionService {
  @inject(Types.FormVersionRepository)
  private formVersionRepository!: IFormVersionRepository;

  public async execute({ id }: IRequest) {
    try {
      if (!id || Number.isNaN(id)) {
        throw new AppError("Id do form invalido", StatusCodes.BAD_REQUEST);
      }
      const existFormVersion = await this.formVersionRepository.findById(id);
      if (!existFormVersion) {
        throw new FormDoesNotExist();
      }
      await this.formVersionRepository.delete(id);
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
