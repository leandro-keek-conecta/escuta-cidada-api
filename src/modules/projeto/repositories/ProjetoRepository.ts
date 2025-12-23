import { Prisma, Projeto } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { injectable } from "inversify";
import { IProjetoRepository, ProjetoWithUser } from "./IProjetoRepository";

@injectable()
export class ProjetoRepository implements IProjetoRepository {
  async create(data: Prisma.ProjetoCreateInput): Promise<ProjetoWithUser> {
    return await prisma.projeto.create({
      data,
      include: {
        users: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async updateProjeto(
    id: number,
    data: Prisma.ProjetoUpdateInput
  ): Promise<ProjetoWithUser> {
    return await prisma.projeto.update({
      where: { id },
      data,
      include: {
        users: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findById(id: number): Promise<Projeto | null> {
    return await prisma.projeto.findUnique({
      where: { id },
    });
  }

  async getProjetos(): Promise<ProjetoWithUser[]> {
    return await prisma.projeto.findMany({
      include: {
        users: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.projeto.delete({
      where: { id },
    });
  }
}
