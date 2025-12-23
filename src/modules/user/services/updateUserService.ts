import Types from "@/common/container/types";
import { inject, injectable } from "inversify";
import * as Z from "zod";
import { userUpdateSchema } from "../http/validators/updateUserValidator";
import { IUserRepository } from "../repositories/IUserRepository";
import { UserDoesNotExist } from "../errors/UserDoesNotExist";
import { ValidationError } from "@/common/errors/ValidationError";
import { InternalServerError } from "@/common/errors/InternalServerError";
import { UserWithProjetos } from "../repositories/UserRepository";
import { ProjetoAccessLevel } from "@prisma/client";

interface IRequest {
  id: number;
  data: Z.infer<typeof userUpdateSchema>;
}

@injectable()
export class UpdateUserService {
  constructor(
    @inject(Types.UserRepository) private userRepository: IUserRepository
  ) {}

  public async execute({ id, data }: IRequest): Promise<UserWithProjetos> {
    try {
      const parsed = userUpdateSchema.safeParse(data);
      if (!parsed.success) {
        throw new ValidationError("Invalid data format", parsed.error.errors);
      }
      const payload = parsed.data;
      const existing = await this.userRepository.findById(id);
      if (!existing) throw new UserDoesNotExist("User does not exist");

      // Monta update “checked” (evita Unchecked mexendo em FKs/críticos)
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (payload.email) updateData.email = payload.email.toLowerCase();
      if (payload.name) updateData.name = payload.name;
      if (payload.role) updateData.role = payload.role;

      // Estratégia: substituir vínculos existentes pelos enviados
      if (payload.projetos) {
        updateData.projetos = {
          deleteMany: {}, // remove todos os vínculos antigos
          create: payload.projetos.map((p) => ({
            projeto: { connect: { id: p.id } },
            access: p.access ?? ProjetoAccessLevel.FULL_ACCESS,
          })),
        };
      }

      const updated = await this.userRepository.updateUser(id, updateData);

      if (payload.projetos) {
        await Promise.all(
          payload.projetos
            .filter((p) => Array.isArray(p.hiddenTabs))
            .map((p) =>
              this.userRepository.replaceHiddenScreens(
                id,
                p.id,
                p.hiddenTabs ?? []
              )
            )
        );
      }

      const hydrated = await this.userRepository.findById(id);
      return hydrated!;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof UserDoesNotExist)
        throw error;
      throw new InternalServerError(
        "An unexpected error occurred while updating the user."
      );
    }
  }
}
