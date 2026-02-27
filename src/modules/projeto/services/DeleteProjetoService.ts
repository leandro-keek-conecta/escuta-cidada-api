import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import { IProjetoRepository } from "../repositories/IProjetoRepository";
import { ProjetoDoesNotExist } from "../errors/ProjetoDoesNotExist";

@injectable()
export class DeleteProjetoService {
  @inject(Types.ProjetoRepository) private ProjetoRepository!: IProjetoRepository;

  public async execute(id: number): Promise<void> {
    try {
      const projeto = await this.ProjetoRepository.findById(id);
      if (!projeto) {
        throw new ProjetoDoesNotExist("Projeto does not exist");
      }
      await this.ProjetoRepository.delete(id);
    } catch (error: any) {
      if (error instanceof ProjetoDoesNotExist) {
        throw error;
      }
      console.error("Error deleting projeto:", error.message);
      throw new Error("An unexpected error occurred while deleting the projeto.");
    }
  }
}
