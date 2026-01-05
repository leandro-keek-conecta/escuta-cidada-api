import { injectable } from "inversify";
import { FormResponse, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { IFormResponseRepository } from "./IFormResponseRepository";

@injectable()
export class FormResponseRepository implements IFormResponseRepository {

  async create(data: Prisma.FormResponseUncheckedCreateInput): Promise<FormResponse> {
    return prisma.formResponse.create({ 
      data,
      include: {
        fields: true // Importante para retornar os campos criados
      }
    });
  }

  async findById(id: number): Promise<FormResponse | null> {
    return prisma.formResponse.findUnique({ where: { id } });
  }

  async listByForm(formId: number): Promise<FormResponse[]> {
    return prisma.formResponse.findMany({
      where: { formVersionId: formId },
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.formResponse.delete({ where: { id } });
  }
}
