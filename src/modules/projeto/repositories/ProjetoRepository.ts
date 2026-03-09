import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { injectable } from "inversify";
import {
  IProjetoRepository,
  ProjetoListByUserWithRelations,
  ProjetoListWithRelations,
  ProjetoWithRelations,
} from "./IProjetoRepository";

const userSafeSelect = {
  id: true,
  email: true,
  name: true,
  profession: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

const defaultInclude = {
  users: { include: { user: { select: userSafeSelect } } },
  chats: true,
  forms: {
    include: {
      versions: {
        include: {
          fields: true,
          responses: {
            include: {
              fields: true,
              user: { select: userSafeSelect },
            },
          },
        },
      },
    },
  },
  responses: {
    include: {
      fields: true,
      user: { select: userSafeSelect },
    },
  },
  hiddenScreens: true,
} as const;

const listInclude = {
  users: { include: { user: { select: userSafeSelect } } },
  chats: true,
  forms: {
    include: {
      versions: {
        include: {
          fields: true,
        },
      },
    },
  },
  hiddenScreens: true,
} as const;

function buildListByUserInclude(userId: number) {
  return {
    ...listInclude,
    allowedThemes: {
      where: { userId },
      select: {
        themeName: true,
        projetoId: true,
        userId: true,
      },
      orderBy: {
        themeName: "asc" as const,
      },
    },
  } as const;
}

@injectable()
export class ProjetoRepository implements IProjetoRepository {
  async create(data: Prisma.ProjetoCreateInput): Promise<ProjetoWithRelations> {
    return await prisma.projeto.create({
      data,
      include: defaultInclude,
    });
  }

  async updateProjeto(
    id: number,
    data: Prisma.ProjetoUpdateInput
  ): Promise<ProjetoWithRelations> {
    return await prisma.projeto.update({
      where: { id },
      data,
      include: defaultInclude,
    });
  }

  async findById(id: number): Promise<ProjetoWithRelations | null> {
    return await prisma.projeto.findUnique({
      where: { id },
      include: defaultInclude,
    });
  }

  async getProjetos(): Promise<ProjetoListWithRelations[]> {
    return await prisma.projeto.findMany({
      include: listInclude,
    });
  }

  async getProjetosByUserId(
    userId: number
  ): Promise<ProjetoListByUserWithRelations[]> {
    return await prisma.projeto.findMany({
      where: {
        users: {
          some: {
            userId,
          },
        },
      },
      include: buildListByUserInclude(userId),
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.projeto.delete({
      where: { id },
    });
  }
}
