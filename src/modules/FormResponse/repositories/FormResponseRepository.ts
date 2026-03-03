import { injectable } from "inversify";
import { FormResponse, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FormResponseWithForm,
  IFormResponseRepository,
  ListFormResponsesByProjectInput,
} from "./IFormResponseRepository";

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

  async listByProjectId({
    projectId,
    formId,
  }: ListFormResponsesByProjectInput): Promise<FormResponseWithForm[]> {
    return prisma.formResponse.findMany({
      where: {
        projetoId: projectId,
        ...(formId
          ? {
              formVersion: {
                is: {
                  formId,
                },
              },
            }
          : {}),
      },
      include: {
        fields: true,
        formVersion: {
          include: {
            form: true,
          },
        },
      },
      orderBy: [
        { formVersion: { form: { name: "asc" } } },
        { createdAt: "desc" },
      ],
    });
  }

  async update(
    id: number,
    data: Prisma.FormResponseUpdateInput
  ): Promise<FormResponse> {
    return prisma.formResponse.update({
      where: { id },
      data,
      include: {
        fields: true,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.formResponse.delete({ where: { id } });
  }
}
