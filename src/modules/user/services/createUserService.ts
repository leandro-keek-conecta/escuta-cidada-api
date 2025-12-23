import { inject, injectable } from "inversify";
import { IUserRepository } from "../repositories/IUserRepository";
import Types from "@/common/container/types";
import * as Z from "zod";
import { userSchema } from "../http/validators/createUserValidators";
import argon2 from "argon2";
import AppError from "@/common/errors/AppError";
import { StatusCodes } from "http-status-codes";
import { UserWithProjetos } from "../repositories/UserRepository";
import { ProjetoAccessLevel } from "@prisma/client";

interface IRequest {
  data: Z.infer<typeof userSchema>;
}

@injectable()
export class CreateUserService {
  @inject(Types.UserRepository) private userRepository!: IUserRepository;

  public async execute({ data }: IRequest): Promise<UserWithProjetos> {
    try {
      const existingUser = await this.userRepository.findByEmail(
        data.email.toLowerCase()
      );

      if (existingUser) {
        throw new AppError("Email já cadastrado", StatusCodes.CONFLICT);
      }
      
      const userData = {
        email: data.email.toLowerCase(),
        name: data.name,
        password: await argon2.hash(data.password),
<<<<<<< HEAD
=======
        profession: data.profession,
>>>>>>> d4d6e47ff18f2506be93843b2e984aa899877a64
        role: data.role,
        projetos: data.projetos
          ? {
              create: data.projetos.map((p) => ({
                projeto: { connect: { id: p.id } },
                access: p.access ?? ProjetoAccessLevel.FULL_ACCESS,
              })),
            }
          : undefined,
      };

      const newUser = await this.userRepository.create(userData);

      if (data.projetos) {
        await Promise.all(
          data.projetos
            .filter((p) => Array.isArray(p.hiddenTabs))
            .map((p) =>
              this.userRepository.replaceHiddenScreens(
                newUser.id,
                p.id,
                p.hiddenTabs ?? []
              )
            )
        );
      }

      const hydrated = await this.userRepository.findById(newUser.id);
      return hydrated ?? newUser;
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(
        "Erro ao criar usuário",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}
