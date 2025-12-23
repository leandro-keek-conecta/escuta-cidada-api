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

      if (!projects || projects.length === 0) {
        throw new InternalServerError("No projects found.");
      }

      const safeProjects = projects.map((project) => {
        const safeUsers =
          project.users
            ?.map(({ user, assignedAt }) => {
              if (!user) {
                return null;
              }
              const { password, ...rest } = user;
              return { ...rest, assignedAt };
            })
            .filter((item): item is Exclude<typeof item, null> => item !== null) || [];

        return {
          ...project,
          users: safeUsers,
        };
      });

      return safeProjects;
    } catch (error: any) {
      console.error("Error retrieving cities:", error.message);

      throw new InternalServerError(
        "An error occurred while retrieving cities."
      );
    }
  }
}
