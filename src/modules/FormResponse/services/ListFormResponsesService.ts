import { inject, injectable } from "inversify";
import { StatusCodes } from "http-status-codes"; // <--- Importante
import AppError from "@/common/errors/AppError";   // <--- Importante
import Types from "@/common/container/types";
import { IFormResponseRepository } from "../repositories/IFormResponseRepository";

@injectable()
export class ListFormResponsesService {
  @inject(Types.FormResponseRepository) private formResponseRepository!: IFormResponseRepository;

  public async execute(formVersionId: number) {
    try {
      // Prisma findMany já retorna [] se não achar nada, não precisa de validação extra
      const forms = await this.formResponseRepository.listByForm(formVersionId);

      return forms; 
    } catch (error: any) {
      // Logamos o erro real no console para você debugar se o banco cair
      console.error("Erro no ListFormResponsesService:", error);

      // Retornamos um AppError padronizado para o Controller
      throw new AppError(
        "Erro ao listar respostas do formulário",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}