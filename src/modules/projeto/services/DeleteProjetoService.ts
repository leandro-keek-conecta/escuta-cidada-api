import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import { IProjetoRepository } from "../repositories/IProjetoRepository";

@injectable()
export class DeleteProjetoService {
  @inject(Types.ProjetoRepository) private ProjetoRepository!: IProjetoRepository;

  public async execute(id: number): Promise<void> {
    try {
      const user = await this.ProjetoRepository.findById(id);
      if (!user) {
        throw new Error("User does not exist");
      }
      await this.ProjetoRepository.delete(id);
    } catch (error: any) {
      console.error("Error deleting user:", error.message);
      throw new Error("An unexpected error occurred while deleting the user.");
    }
  }
}
