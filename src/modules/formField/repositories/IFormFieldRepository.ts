import { FormField, Prisma } from "@prisma/client";

export interface IFormFieldRepository {
  create(data: Prisma.FormFieldCreateInput): Promise<FormField>;
  updateFormField(
    id: number,
    data: Prisma.FormFieldUpdateInput
  ): Promise<FormField>;
  findById(id: number): Promise<FormField | null>;
  findByFormVersionId(formVersionId: number): Promise<FormField[]>;
  getFormsField(): Promise<FormField[] | []>;
  delete(id: number): Promise<void>;
}
