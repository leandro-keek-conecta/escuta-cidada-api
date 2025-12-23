import { Prisma, ProjetoAccessLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { injectable } from "inversify";
import { IUserRepository } from "./IUserRepository";

export type UserWithProjetos = Prisma.UserGetPayload<{
  include: {
    projetos: {
      include: {
        projeto: true;
      };
    };
    hiddenScreens: true;
  };
}>;
@injectable()
export class UserRepository implements IUserRepository {
  async create(data: Prisma.UserCreateInput): Promise<UserWithProjetos> {
    return await prisma.user.create({
      data,
      include: {
        projetos: { include: { projeto: true } },
        hiddenScreens: true,
      },
    });
  }

  async updateUser(
    id: number,
    data: Prisma.UserUncheckedUpdateInput
  ): Promise<UserWithProjetos | null> {
    return await prisma.user.update({
      where: { id },
      data,
      include: {
        projetos: { include: { projeto: true } },
        hiddenScreens: true,
      },
    });
  
  }

  async findById(id: number): Promise<UserWithProjetos | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        projetos: { include: { projeto: true } },
        hiddenScreens: true,
      },
    });
  }

  async findByEmail(email: string): Promise<UserWithProjetos | null>  {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        projetos: {
          include: { projeto: true },
        },
        hiddenScreens: true,
      },
    });
  }

  async getUsers(): Promise<UserWithProjetos[]> {
    return await prisma.user.findMany({
      include: {
        projetos: { include: { projeto: true } },
        hiddenScreens: true,
      },
    });
  }

  
  async delete(id: number): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  async findProjectAccess(
    userId: number,
    projetoId: number
  ): Promise<ProjetoAccessLevel | null> {
    const relation = await prisma.projetoUser.findUnique({
      where: { userId_projetoId: { userId, projetoId } },
      select: { access: true },
    });

    return relation?.access ?? null;
  }

  async replaceHiddenScreens(
    userId: number,
    projetoId: number,
    hiddenTabs: string[]
  ): Promise<void> {
    await prisma.dashHiddenScreen.deleteMany({
      where: { userId, projetoId },
    });

    if (!hiddenTabs.length) {
      return;
    }

    await prisma.dashHiddenScreen.createMany({
      data: hiddenTabs.map((screenName) => ({
        userId,
        projetoId,
        screenName,
      })),
      skipDuplicates: true,
    });
  }
}
