import { inject, injectable } from "inversify";
import jwt from "jsonwebtoken";
import * as argon2 from "argon2";
import * as Z from "zod";

import SecurityConfig from "@/config/SecurityConfig";
import AppError from "@/common/errors/AppError";
import Types from "@/common/container/types";

import LoginValidator from "@/modules/auth/infra/http/validators/UserLoginValidator";
import IUserLoginResponse from "@/modules/auth/responses/IUserLoginResponse";
import { IUserRepository } from "@/modules/user/repositories/IUserRepository";
import { Role } from "@prisma/client";

interface IRequest {
  data: Z.infer<typeof LoginValidator>;
}

@injectable()
class LoginService {
  @inject(Types.UserRepository) private userRepository!: IUserRepository;

  public async execute({ data }: IRequest): Promise<IUserLoginResponse> {
    const user = await this.userRepository.findByEmail(
      data.email.toLowerCase()
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.password && !(await argon2.verify(user.password, data.password))) {
      throw new AppError("Login ou senha incorretos", 401);
    }

    const accessToken = jwt.sign({ userId: user.id }, SecurityConfig.jwt.key, {
      expiresIn: SecurityConfig.jwt.exp,
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      SecurityConfig.jwt.keyRefresh,
      {
        expiresIn: SecurityConfig.jwt.refreshExp,
      }
    );

    const hiddenTabsByProject = user.hiddenScreens.reduce<
      Record<number, string[]>
    >((acc, screen) => {
      const list = acc[screen.projetoId] ?? [];
      list.push(screen.screenName);
      acc[screen.projetoId] = list;
      return acc;
    }, {});

    return {
      accessToken,
      accessTokenExpireIn: SecurityConfig.jwt.exp,
      refreshToken,
      refreshTokenExpireIn: SecurityConfig.jwt.refreshExp,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as Role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        projetos: user.projetos.map((projeto) => ({
          id: projeto.projeto.id,
          nome: projeto.projeto.name,
          url: projeto.projeto.logoUrl ?? "",
          corHex: projeto.projeto.corHex ?? "",
          reportId: projeto.projeto.reportId ?? "",
          groupId: projeto.projeto.groupId ?? "",
          createdAt: projeto.projeto.createdAt,
          updatedAt: projeto.projeto.updatedAt,
          assignedAt: projeto.assignedAt,
          access: projeto.access,
          hiddenTabs: hiddenTabsByProject[projeto.projeto.id] ?? [],
        })),
      },
    };
  }
}

export default LoginService;
