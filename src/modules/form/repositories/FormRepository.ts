import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { injectable } from "inversify";
import { FormWithRelations, IFormsRepository } from "./IFormRepository";

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
} as const;

@injectable()
export class FormsRepository implements IFormsRepository {
  async create(data: Prisma.FormCreateInput): Promise<FormWithRelations> {
    return await prisma.form.create({
      data,
      include: defaultInclude,
    });
  }

  async updateForm(id: number, data: Prisma.FormUpdateInput): Promise<FormWithRelations> {
    return await prisma.form.update({
      where: { id },
      data,
      include: defaultInclude,
    });
  }

  async findById(id: number): Promise<FormWithRelations | null> {
    return await prisma.form.findUnique({
      where: { id },
      include: defaultInclude,
    });
  }

  async getForms(filter?: { projetoId?: number }): Promise<FormWithRelations[]> {
    return await prisma.form.findMany({
      where: {
        projetoId: filter?.projetoId,
      },
      include: defaultInclude,
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.form.delete({
      where: { id },
    });
  }
}
