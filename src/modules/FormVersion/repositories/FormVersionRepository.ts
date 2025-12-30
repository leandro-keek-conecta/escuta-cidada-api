import { prisma } from "@/lib/prisma";
import { IFormVersionRepository } from "./IFormVersionRepository";
import { FormVersion, Prisma } from "@prisma/client";
import { injectable } from "inversify";

@injectable()
export class FormVersionRepository implements IFormVersionRepository {
  async create(data: Prisma.FormVersionCreateInput): Promise<FormVersion> {
    return await prisma.formVersion.create({
      data,
    });
  }

  async updateFormVersion(
    id: number,
    data: Prisma.FormVersionUpdateInput
  ): Promise<FormVersion> {
    return await prisma.formVersion.update({
      where: { id },
      data,
    });
  }

  async findById(id: number): Promise<FormVersion | null> {
    return await prisma.formVersion.findUnique({
      where: { id },
    });
  }

  async getFormVersions(filter?: { formId?: number }): Promise<FormVersion[]> {
    const whereClause = filter?.formId ? { formId: filter.formId } : {};
    return await prisma.formVersion.findMany({
      where: whereClause,
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.formVersion.delete({
      where: { id },
    });
  }
}

