import { inject, injectable } from "inversify";
import Types from "@/common/container/types";
import { InternalServerError } from "@/common/errors/InternalServerError";
import { ProjetoDoesNotExist } from "@/modules/projeto/errors/ProjetoDoesNotExist";
import { IProjetoRepository } from "@/modules/projeto/repositories/IProjetoRepository";

@injectable()
export class GetProjetoService {
  @inject(Types.ProjetoRepository) private ProjetoRepository!: IProjetoRepository;

  public async execute(id: number) {
    try {
      const project = await this.ProjetoRepository.findById(id);
      if (!project) {
        throw new ProjetoDoesNotExist("Projeto does not exist");
      }

      const safeUsers =
        project.users
          ?.map(({ user, assignedAt, access }) => {
            if (!user) {
              return null;
            }
            return { ...user, assignedAt, access };
          })
          .filter((item): item is Exclude<typeof item, null> => item !== null) ||
        [];

      return {
        ...project,
        users: safeUsers,
      };
    } catch (error: any) {
      if (error instanceof ProjetoDoesNotExist) {
        throw error;
      }
      console.error("Error retrieving projeto:", error.message);
      throw new InternalServerError(
        "An error occurred while retrieving projeto."
      );
    }
  }
}
