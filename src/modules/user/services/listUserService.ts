import { inject, injectable } from "inversify";
import { IUserRepository } from "../repositories/IUserRepository";
import Types from "@/common/container/types";
import { InternalServerError } from "@/common/errors/InternalServerError";

@injectable()
export class ListUserService {
  constructor(
    @inject(Types.UserRepository) private userRepository: IUserRepository
  ) {}

  public async execute() {
    try {
      const users = await this.userRepository.getUsers();
      if (!users || users.length === 0) {
        throw new InternalServerError("No users found.");
      }
      // Remove o campo "password" de cada usuário
      const safeUsers = users.map(
        ({ password, projetos, hiddenScreens, allowedThemes, ...rest }) => {
          const hiddenTabsByProject = hiddenScreens.reduce<Record<number, string[]>>(
            (acc, screen) => {
              const list = acc[screen.projetoId] ?? [];
              list.push(screen.screenName);
              acc[screen.projetoId] = list;
              return acc;
            },
            {}
          );

          const allowedThemesByProject = allowedThemes.reduce<
            Record<number, string[]>
          >((acc, theme) => {
            const list = acc[theme.projetoId] ?? [];
            list.push(theme.themeName);
            acc[theme.projetoId] = list;
            return acc;
          }, {});

          return {
            ...rest,
            hiddenScreens,
            allowedThemes,
            projetos: projetos.map((projeto) => ({
              ...projeto,
              hiddenTabs: hiddenTabsByProject[projeto.projetoId] ?? [],
              temasPermitidos: allowedThemesByProject[projeto.projetoId] ?? [],
            })),
          };
        }
      );

      return safeUsers;
    } catch (error: any) {
      console.error("Error retrieving users:", error.message);
      throw new InternalServerError(
        "An error occurred while retrieving users."
      );
    }
  }
}
