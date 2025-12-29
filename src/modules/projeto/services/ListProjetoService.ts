import { inject, injectable } from "inversify";
import { IProjetoRepository } from "@/modules/projeto/repositories/IProjetoRepository";
import Types from "@/common/container/types";
import { InternalServerError } from "@/common/errors/InternalServerError";

@injectable()
export class ListProjetosService {
  @inject(Types.ProjetoRepository) private ProjetoRepository!: IProjetoRepository;

  public async execute() {
    try {
      const projects = await this.ProjetoRepository.getProjetos();

      const safeProjects = (projects ?? []).map((project) => {
        const safeUsers =
          project.users
            ?.map(({ user, assignedAt, access }) => {
              if (!user) {
                return null;
              }
              return { ...user, assignedAt, access };
            })
            .filter((item): item is Exclude<typeof item, null> => item !== null) || [];

        return {
          ...project,
          users: safeUsers,
        };
      });

      return safeProjects;
    } catch (error: any) {
      console.error("Error retrieving projects:", error.message);

      throw new InternalServerError(
        "An error occurred while retrieving projects."
      );
    }
  }
}
