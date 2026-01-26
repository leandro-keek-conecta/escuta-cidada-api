import { prisma } from "@/lib/prisma";
import { FormField, Prisma } from "@prisma/client";
import { injectable } from "inversify";
import { IFormFieldRepository } from "./IFormFieldRepository";

@injectable()
export class FormFieldRepository implements IFormFieldRepository {
  async create(data: Prisma.FormFieldCreateInput): Promise<FormField> {
    return await prisma.formField.create({ data });
  }

  async updateFormField(
    id: number,
    data: Prisma.FormFieldUpdateInput
  ): Promise<FormField> {
    return await prisma.formField.update({
      where: { id },
      data,
    });
  }

  async findById(id: number): Promise<FormField | null> {
    return await prisma.formField.findUnique({ where: { id } });
  }

  async findByFormVersionId(formVersionId: number): Promise<FormField[]> {
    return await prisma.formField.findMany({
      where: { formVersionId },
    });
  }

  async getFormsField(): Promise<FormField[]> {
    return await prisma.formField.findMany();
  }

  async delete(id: number): Promise<void> {
    await prisma.formField.delete({ where: { id } });
  }
}
